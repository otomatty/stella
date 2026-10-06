import {
  isSafeRelativePattern,
  parseTaskManifest,
  type TaskManifest,
} from "../../shared/src/tasks/manifest.js";
import type { EnvironmentRequirement } from "../../shared/src/tasks/environment.js";
import { ESCALATE_WHEN } from "../../shared/src/review/ai-review.js";
import {
  SOLUTION_UNLOCKS,
  TASK_HELP_POLICIES,
  type SolutionUnlock,
} from "../../shared/src/tasks/help.js";

export interface SkillRefs {
  uses: string[];
  assesses: string[];
}
export interface UnitConfig {
  plannedHours: number;
  skills: SkillRefs;
  reuses: string[];
  /**
   * ログインなしで読める単元 (Issue #41)。VS Code を入れる前に読む最初の単元 (06 の U00〜U01) に
   * 付ける。付けた単元のスライドとまとめは、未ログインの Web (`/start`) と公開 API が返す。
   * 課題 (`tasks/`) を置けず、前提のない catalog の講座にだけ置ける (manifest が検査する)。
   * 書かない単元は持たない。
   */
  public?: boolean;
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
  /**
   * ヒントの段数と、取り組み中に解答例を開ける条件 (07 §8)。種別ごとに書ける値は
   * `TASK_HELP_POLICIES` が決める。`attempts` は `attempts-or-passed` の回数 (省略すると既定)。
   */
  support: {
    hintLevels: number;
    solutionUnlock: SolutionUnlock;
    attempts?: number;
  };
  sources: string[];
  estimatedMinutes: number;
  protected: string[];
  checks: TaskManifest["checks"];
  static?: TaskManifest["static"];
  /**
   * 固定した開始点 (`fixed-start/`) が動く実装を含む前の課題 (課題 ID)。開始点を受け取った
   * 受講者は、これらの課題の以後の提出も支援付きになる。開始点のある課題だけが書き、無い課題は
   * 持たない (定義を変えずに課題の内容ハッシュを保つため)。
   */
  fixedStart?: { covers: string[] };
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
    ...(value.public === undefined ? {} : { public: boolean(value.public, "public") }),
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
  if (!(SOLUTION_UNLOCKS as readonly unknown[]).includes(support.solutionUnlock))
    throw new Error(`support.solutionUnlock: ${SOLUTION_UNLOCKS.join(" / ")} のどれかが必要です`);
  const solutionUnlock = support.solutionUnlock as SolutionUnlock;
  // 回数は省略すると既定 (SOLUTION_UNLOCK_ATTEMPTS)。回数で開かない課題には書かせない。
  if (support.attempts !== undefined && solutionUnlock !== "attempts-or-passed")
    throw new Error("support.attempts: solutionUnlock が attempts-or-passed の課題だけに書けます");
  const attempts =
    support.attempts === undefined ? undefined : positive(support.attempts, "support.attempts");
  if (attempts !== undefined && !Number.isInteger(attempts))
    throw new Error("support.attempts: 整数が必要です");
  const explanation = boolean(submit.explanation, "submit.explanation");
  const debuggingRecord = boolean(submit.debuggingRecord, "submit.debuggingRecord");
  const kind = parsed.manifest.kind;
  const assessment = kind.startsWith("assessment-");
  // 解放の順番は種別ごとに決まっている (07 §8)。教材は種別の方針の中でだけ選べる。
  const policy = TASK_HELP_POLICIES[kind];
  if (assessment && (support.hintLevels !== 0 || solutionUnlock !== "passed"))
    throw new Error("確認A・B: ヒントなし、解答は合格後にしてください");
  if (!policy.hints && support.hintLevels !== 0)
    throw new Error("統合: 取り組み中は仕様・参照元だけを使うので、ヒントは 0 段にしてください");
  if (!policy.solutionUnlocks.includes(solutionUnlock))
    throw new Error(
      `support.solutionUnlock: ${kind} の課題は ${policy.solutionUnlocks.join(" / ")} のどれかにしてください`,
    );
  if (
    ["independent", "integration", "assessment-a", "assessment-b"].includes(parsed.manifest.kind) &&
    !explanation
  )
    throw new Error("自力・統合・確認: 説明欄が必要です");
  if (parsed.manifest.kind === "debug" && !debuggingRecord)
    throw new Error("修正課題: 修正記録が必要です");
  // 講座の中の順序 (前の課題か) は講座の課題をすべて読んでから確かめる (assertFixedStartCovers)。
  const fixedStart =
    value.fixedStart === undefined
      ? undefined
      : (() => {
          const covers = stringList(
            object(value.fixedStart, "fixedStart").covers,
            "fixedStart.covers",
          );
          if (covers.length === 0)
            throw new Error(
              "fixedStart.covers: 開始点が実装を含む前の課題を 1 つ以上書いてください",
            );
          for (const id of covers) {
            if (id.split("/").length !== 3)
              throw new Error(`fixedStart.covers: <講座>/<単元>/<課題> が必要です: ${id}`);
            if (id === parsed.manifest.id)
              throw new Error("fixedStart.covers: この課題自身は書けません");
          }
          return { covers };
        })();
  return {
    ...parsed.manifest,
    environment: text(value.environment, "environment"),
    pattern: text(value.pattern, "pattern"),
    skills: parseSkills(value.skills, "skills"),
    submit: { files: parsed.manifest.submit.files, explanation, debuggingRecord },
    review: { ...(rules ? { rules } : {}), rubric, escalateWhen },
    support: {
      hintLevels: Number(support.hintLevels),
      solutionUnlock,
      ...(attempts === undefined ? {} : { attempts }),
    },
    sources: stringList(value.sources, "sources"),
    estimatedMinutes: positive(value.estimatedMinutes, "estimatedMinutes"),
    ...(fixedStart ? { fixedStart } : {}),
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
