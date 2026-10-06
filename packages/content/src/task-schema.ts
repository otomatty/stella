import {
  isSafeRelativePattern,
  parseTaskManifest,
  type TaskManifest,
} from "../../shared/src/tasks/manifest.js";
import type { EnvironmentRequirement } from "../../shared/src/tasks/environment.js";
import { ESCALATE_WHEN } from "../../shared/src/review/ai-review.js";

export interface SkillRefs {
  uses: string[];
  assesses: string[];
}
export interface UnitConfig {
  plannedHours: number;
  skills: SkillRefs;
  reuses: string[];
}
export interface TaskDefinition {
  id: string;
  title: string;
  kind: TaskManifest["kind"];
  pattern: string;
  skills: SkillRefs;
  runner: TaskManifest["runner"];
  environment: string;
  submit: { files: string[]; explanation: boolean; debuggingRecord: boolean };
  review: {
    /**
     * 適用するコーディング規則 (`coding-rules.md` の ID) と必須・任意。書かない課題は持たない
     * (定義を変えずに課題の内容ハッシュを保つため)。
     */
    rules?: { id: string; required: boolean }[];
    rubric: { id: string; criterion: string; required: boolean }[];
    escalateWhen: string[];
  };
  support: {
    hintLevels: number;
    solutionUnlock: "passed" | "attempts-or-passed";
    attempts?: number;
  };
  sources: string[];
  estimatedMinutes: number;
  protected: string[];
  checks: TaskManifest["checks"];
  static?: TaskManifest["static"];
}

function object(raw: unknown, at: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error(`${at}: オブジェクトが必要です`);
  return raw as Record<string, unknown>;
}
function text(raw: unknown, at: string): string {
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`${at}: 空でない文字列が必要です`);
  return raw.trim();
}
export function stringList(raw: unknown, at: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${at}: 配列が必要です`);
  const values = raw.map((v) => text(v, at));
  if (new Set(values).size !== values.length) throw new Error(`${at}: 重複があります`);
  return values;
}
function positive(raw: unknown, at: string): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0)
    throw new Error(`${at}: 正の数が必要です`);
  return raw;
}
function boolean(raw: unknown, at: string): boolean {
  if (typeof raw !== "boolean") throw new Error(`${at}: true / false が必要です`);
  return raw;
}
export function parseSkills(raw: unknown, at: string): SkillRefs {
  const value = object(raw, at);
  return {
    uses: stringList(value.uses, `${at}.uses`),
    assesses: stringList(value.assesses, `${at}.assesses`),
  };
}
export function parseUnitConfig(raw: unknown): UnitConfig {
  const value = object(raw, "unit.json");
  const reuses = stringList(value.reuses, "reuses");
  if (reuses.some((v) => !isSafeRelativePattern(v) || /[*?{}[\]]/.test(v)))
    throw new Error("reuses: 成果物の相対パスが必要です");
  return {
    plannedHours: positive(value.plannedHours, "plannedHours"),
    skills: parseSkills(value.skills, "skills"),
    reuses,
  };
}

/** 実行用 manifest の検証を共有し、執筆用の情報を追加検証する。 */
export function parseTaskDefinition(
  raw: unknown,
  environment: EnvironmentRequirement,
): TaskDefinition {
  const value = object(raw, "task.json");
  const parsed = parseTaskManifest({ ...value, schemaVersion: 1, environment });
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  if (parsed.manifest.id.split("/").length !== 3)
    throw new Error("id: <講座>/<単元>/<課題> が必要です");
  const submit = object(value.submit, "submit");
  const review = object(value.review, "review");
  if (!Array.isArray(review.rubric)) throw new Error("review.rubric: 配列が必要です");
  const rubric = review.rubric.map((v) => {
    const row = object(v, "rubric");
    const criterion = text(row.criterion, "rubric.criterion");
    // ルーブリックはコードを見て当否を決められる文で書く。尺度での採点にしない (07 §6.3)。
    if (/\d\s*[〜~～-]\s*\d|点満点|採点|[?？]$/.test(criterion))
      throw new Error(
        `rubric.criterion: 尺度や問いではなく、当否を決められる文で書いてください: ${criterion}`,
      );
    return {
      id: text(row.id, "rubric.id"),
      criterion,
      required: boolean(row.required, "rubric.required"),
    };
  });
  if (new Set(rubric.map((r) => r.id)).size !== rubric.length)
    throw new Error("rubric.id: 重複があります");
  const rules =
    review.rules === undefined
      ? undefined
      : (() => {
          if (!Array.isArray(review.rules)) throw new Error("review.rules: 配列が必要です");
          return review.rules.map((v) => {
            const row = object(v, "review.rules");
            return {
              id: text(row.id, "review.rules.id"),
              required: boolean(row.required, "review.rules.required"),
            };
          });
        })();
  const ruleIds = (rules ?? []).map((r) => r.id);
  if (new Set(ruleIds).size !== ruleIds.length) throw new Error("review.rules: 重複があります");
  if (rubric.some((r) => ruleIds.includes(r.id)))
    throw new Error("rubric.id: 規則の ID と同じ ID は使えません");
  if (![...rubric, ...(rules ?? [])].some((r) => r.required))
    throw new Error("review: 必須の評価項目 (rubric か rules) が 1 つ以上必要です");
  const escalateWhen = stringList(review.escalateWhen, "review.escalateWhen");
  for (const condition of escalateWhen)
    if (!(ESCALATE_WHEN as readonly string[]).includes(condition))
      throw new Error(`review.escalateWhen: ${ESCALATE_WHEN.join(" / ")} のどれかにしてください`);
  const support = object(value.support, "support");
  if (!Number.isInteger(support.hintLevels) || Number(support.hintLevels) < 0)
    throw new Error("support.hintLevels: 0 以上の整数が必要です");
  if (support.solutionUnlock !== "passed" && support.solutionUnlock !== "attempts-or-passed")
    throw new Error("support.solutionUnlock: passed / attempts-or-passed が必要です");
  const attempts =
    support.solutionUnlock === "attempts-or-passed"
      ? positive(support.attempts, "support.attempts")
      : undefined;
  if (attempts !== undefined && !Number.isInteger(attempts))
    throw new Error("support.attempts: 整数が必要です");
  const explanation = boolean(submit.explanation, "submit.explanation");
  const debuggingRecord = boolean(submit.debuggingRecord, "submit.debuggingRecord");
  const assessment = parsed.manifest.kind.startsWith("assessment-");
  if (assessment && (support.hintLevels !== 0 || support.solutionUnlock !== "passed"))
    throw new Error("確認A・B: ヒントなし、解答は合格後にしてください");
  if (
    ["independent", "integration", "assessment-a", "assessment-b"].includes(parsed.manifest.kind) &&
    !explanation
  )
    throw new Error("自力・統合・確認: 説明欄が必要です");
  if (parsed.manifest.kind === "debug" && !debuggingRecord)
    throw new Error("修正課題: 修正記録が必要です");
  return {
    ...parsed.manifest,
    environment: text(value.environment, "environment"),
    pattern: text(value.pattern, "pattern"),
    skills: parseSkills(value.skills, "skills"),
    submit: { files: parsed.manifest.submit.files, explanation, debuggingRecord },
    review: { ...(rules ? { rules } : {}), rubric, escalateWhen },
    support: {
      hintLevels: Number(support.hintLevels),
      solutionUnlock: support.solutionUnlock,
      ...(attempts === undefined ? {} : { attempts }),
    },
    sources: stringList(value.sources, "sources"),
    estimatedMinutes: positive(value.estimatedMinutes, "estimatedMinutes"),
  };
}

export function toRuntimeManifest(
  task: TaskDefinition,
  environment: EnvironmentRequirement,
): TaskManifest {
  return {
    schemaVersion: 1,
    id: task.id,
    title: task.title,
    kind: task.kind,
    runner: task.runner,
    submit: { files: task.submit.files },
    protected: task.protected,
    checks: task.checks,
    environment,
    ...(task.static ? { static: task.static } : {}),
  };
}
