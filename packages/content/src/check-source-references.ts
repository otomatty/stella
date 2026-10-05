import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  getEntryFile,
  getLanguage,
  getStaticAnalysisSettings,
} from "../../shared/src/assignment-helpers.js";
import { findAssignment } from "../../shared/src/problems/index.js";
import { readEnvironment } from "./task-content.js";
import { parseSlides } from "./parse-slides.js";
import {
  isCalendarDate,
  object,
  parseUnitId,
  publicContentFiles,
  readSourceRefs,
  readSourceRegistry,
  readUnitReferences,
  type SourceRecord,
  type UnitReferences,
} from "./source-references.js";

export interface SourceDiagnostic {
  unitId: string;
  severity: "error" | "warning";
  message: string;
}
export interface LegacySourceBaseline {
  schemaVersion: 1;
  baseCommit: string;
  units: Record<string, string>;
  /** 誤字・表記・レイアウトだけの差分は人が確認し、理由を記録する。 */
  exemptions: {
    unitId: string;
    contentHash: string;
    reason: string;
    reviewer: string;
    reviewedAt: string;
  }[];
}

function normalizedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(row)
        .sort()
        .map((key) => [key, normalizedJson(row[key])]),
    );
  }
  return value;
}

/** course.json の `exercises` の 1 レッスンぶん (`{ id, title }[]`) から課題 ID を取り出す。 */
function exerciseIds(refs: unknown): string[] {
  if (!Array.isArray(refs)) return [];
  return refs.flatMap((ref) => {
    const id = typeof ref === "object" && ref !== null ? (ref as { id?: unknown }).id : undefined;
    return typeof id === "string" ? [id] : [];
  });
}
/** 旧演習の ID から、seed が投入する課題定義を引く。無い ID は null。 */
export type AssignmentResolver = (assignmentId: string) => unknown;
/** 課題定義を引く @stella/shared の関数。基準の再計算では導入時点の版を差し込む。 */
export interface SharedAssignmentModules {
  findAssignment: typeof findAssignment;
  getEntryFile: typeof getEntryFile;
  getLanguage: typeof getLanguage;
  getStaticAnalysisSettings: typeof getStaticAnalysisSettings;
}
/**
 * seed (`export-seed-sql.ts` の `emitAssignment`) と同じく課題定義を引き、言語・入口ファイル・
 * Lint プリセットを合成した静的解析を解決済みの値で上書きする。説明・スターター・テスト・
 * 解答・採点設定のどれを変えても指紋が変わり、既定値を明示しただけでは変わらない。
 */
export function sharedAssignmentResolver(shared: SharedAssignmentModules): AssignmentResolver {
  return (assignmentId) => {
    const assignment = shared.findAssignment(assignmentId);
    if (!assignment) return null;
    const settings = shared.getStaticAnalysisSettings(assignment);
    return {
      ...assignment,
      language: shared.getLanguage(assignment),
      entryFile: shared.getEntryFile(assignment),
      staticAnalysis: { eslint: { rules: settings.eslintRules }, ast: settings.ast },
    };
  };
}
export const resolveSharedAssignment: AssignmentResolver = sharedAssignmentResolver({
  findAssignment,
  getEntryFile,
  getLanguage,
  getStaticAnalysisSettings,
});

/**
 * 課題定義 (`tasks/<課題>/task.json`)。`sources` は front-matter の sourceRefs と同じ参照元の
 * 対応なので外し、キー順・空白は course.json と同じく正規化する。読めない JSON は課題の検査が
 * 報告するので、ここではそのままの内容で指紋に含める。`environment` は環境定義を引くために返す。
 */
function taskDefinitionContent(path: string): { content: string | Buffer; environment?: unknown } {
  const raw = readFileSync(path);
  let row: unknown;
  try {
    row = JSON.parse(raw.toString("utf8"));
  } catch {
    return { content: raw };
  }
  if (!row || typeof row !== "object" || Array.isArray(row)) return { content: raw };
  const content = { ...(row as Record<string, unknown>) };
  delete content.sources;
  return { content: JSON.stringify(normalizedJson(content)), environment: content.environment };
}

/**
 * 環境定義 (`environments/<ID>.json`) の全体。課題の配布 manifest には ID ではなく
 * `readEnvironment` が解決した版と要件が入るので、同じ ID のまま版・要件・対象 OS を変えても
 * 指紋を変える。読めない・不正な定義は課題と参照元の検査が報告するので、ここではそのままの内容を
 * 含める。ID は `readEnvironment` と同じ規則で確かめ、台帳の外のファイルは読まない。
 */
function environmentContent(root: string, id: string): string | Buffer {
  const file = join(root, "environments", `${id}.json`);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id) || !existsSync(file)) return "\0missing";
  const raw = readFileSync(file);
  try {
    return JSON.stringify(normalizedJson(JSON.parse(raw.toString("utf8"))));
  } catch {
    return raw;
  }
}

/**
 * 指紋に含めない名前。どれも .gitignore 済みでコミットにも配布にも届かない、手元の生成物
 * (`materials` が作る slides.pptx・図解の *.diagram.png、依存とキャッシュ) と OS の管理ファイル。
 * 含めると生成した作者の手元だけ指紋が変わり、未改訂の旧単元が改訂済みに見える。
 */
const UNHASHED_NAME =
  /^(?:\.git|node_modules|__pycache__|\.DS_Store|slides\.pptx|.+\.diagram\.png)$/;

/**
 * 単元の内容指紋。受講者が見るもの・採点と配布が使うものを全部含め、除くのは次だけにする。
 * - 参照元の対応の記録: 単元直下の references.json、公開教材の front-matter の sourceRefs、
 *   課題の task.json の sources (付け替えだけでは改訂にならない)
 * - course.json の経路・予定時間 (前提・parent・扇への配置・plannedHours)
 * - .gitignore 済みの生成物と OS の管理ファイル (`UNHASHED_NAME`)
 *
 * 単元ディレクトリの通常のファイルは拡張子を問わず相対パスの順に含め、参照元の記録を外す
 * 公開教材の Markdown と task.json 以外はバイト列のまま読む (課題のスターター・テスト・解答の
 * .tsx・.sql・拡張子の無いファイルも)。シンボリックリンク (配布でも止める) と通常のファイル以外は
 * 黙って飛ばさずエラーにする。ほかに course.json の教材に関わる項目、講座と課題が指す環境定義、
 * 旧演習は course.json の ID・題名から引いた課題定義 (`resolveAssignment`) を含める。
 */
export function unitContentHash(
  directory: string,
  resolveAssignment: AssignmentResolver = resolveSharedAssignment,
): string {
  const hash = createHash("sha256");
  const lessonKeys = new Set<string>();
  const environments = new Set<string>();
  // sourceRefs を外すのは、公開ゲートが sourceRefs を照合する公開教材だけ。スターターなど
  // そのまま配る Markdown の front-matter は内容として含める。
  const sourcedMarkdown = new Set(publicContentFiles(directory).filter((f) => f.endsWith(".md")));
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (rel === "references.json" || UNHASHED_NAME.test(entry)) continue;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`単元にシンボリックリンクは使えません: ${rel}`);
      if (stat.isDirectory()) {
        walk(path, rel);
        continue;
      }
      if (!stat.isFile()) throw new Error(`単元に通常のファイル以外は置けません: ${rel}`);
      // パスと内容の長さを前に置き、ファイルの境界を一意にする (内容に \0 やパスを含めても
      // 別のファイル構成と同じ指紋にならない)。
      const update = (data: string | Buffer) =>
        hash.update(`${rel}\0${Buffer.byteLength(data)}\0`).update(data);
      const parts = rel.split("/");
      if (sourcedMarkdown.has(rel)) {
        let content = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
        if (entry === "slides.md" && parts.length === 3 && !["tasks", "private"].includes(parts[0]))
          lessonKeys.add(parseSlides(content).id.split("-").slice(0, 2).join("-"));
        content = content.replace(/^---\n([\s\S]*?)\n---\n/, (_whole, head: string) => {
          const fields = head
            .split("\n")
            .filter((line) => !/^sourceRefs:/.test(line))
            .join("\n")
            .trim();
          return fields ? `---\n${fields}\n---\n` : "";
        });
        update(content);
      } else if (entry === "task.json" && parts.length === 3 && parts[0] === "tasks") {
        const task = taskDefinitionContent(path);
        if (typeof task.environment === "string") environments.add(task.environment);
        update(task.content);
      } else update(readFileSync(path));
    }
  }
  walk(directory, "");
  const courseDirectory = dirname(dirname(directory));
  const config = object(
    JSON.parse(readFileSync(join(courseDirectory, "course.json"), "utf8")),
    "course.json",
  );
  const moduleId = basename(directory);
  const modules = config.modules === undefined ? {} : object(config.modules, "course.modules");
  const exercises =
    config.exercises === undefined ? {} : object(config.exercises, "course.exercises");
  const unitExercises = Object.entries(exercises).filter(([key]) => lessonKeys.has(key));
  const courseContent: Record<string, unknown> = {
    ...config,
    format: config.format ?? 1,
    modules: { [moduleId]: modules[moduleId] ?? moduleId },
    exercises: Object.fromEntries(unitExercises),
  };
  // 学習内容と無関係な経路変更・予定時間 (学習ペースの見積もり) は除外し、演習・単元名は
  // 影響する単元だけに含める。
  for (const key of [
    "prerequisites",
    "parent",
    "appearances",
    "appearancePrerequisites",
    "plannedHours",
  ])
    delete courseContent[key];
  hash.update(`course.json\0${JSON.stringify(normalizedJson(courseContent))}`);
  // 環境の無い単元 (旧形式) は従来どおりの指紋のまま。
  if (typeof config.environment === "string") environments.add(config.environment);
  const root = dirname(dirname(courseDirectory));
  for (const id of [...environments].sort()) {
    const content = environmentContent(root, id);
    hash.update(`environment\0${id}\0${Buffer.byteLength(content)}\0`).update(content);
  }
  // 課題本体は @stella/shared にあり、同じ ID のまま説明・テスト・採点設定を変えられる。
  // 演習の無い単元は従来どおりの指紋のまま。
  const assignmentIds = [...new Set(unitExercises.flatMap(([, refs]) => exerciseIds(refs)))].sort();
  if (assignmentIds.length > 0)
    hash.update(
      `assignments\0${JSON.stringify(
        normalizedJson(
          Object.fromEntries(assignmentIds.map((id) => [id, resolveAssignment(id) ?? null])),
        ),
      )}`,
    );
  return hash.digest("hex");
}
export function listSourceUnits(
  root: string,
): { unitId: string; directory: string; format: number; environment?: string }[] {
  const units: { unitId: string; directory: string; format: number; environment?: string }[] = [];
  for (const slug of readdirSync(join(root, "courses")).sort()) {
    const course = join(root, "courses", slug);
    if (!existsSync(join(course, "course.json")) || !existsSync(join(course, "modules"))) continue;
    const config = object(
      JSON.parse(readFileSync(join(course, "course.json"), "utf8")),
      "course.json",
    );
    for (const unit of readdirSync(join(course, "modules")).sort()) {
      const directory = join(course, "modules", unit);
      if (!lstatSync(directory).isDirectory()) continue;
      units.push({
        unitId: `${slug}/${unit}`,
        directory,
        format: Number(config.format ?? 1),
        ...(typeof config.environment === "string" ? { environment: config.environment } : {}),
      });
    }
  }
  return units;
}
/**
 * 旧単元の基準。`root` と `resolveAssignment` は記録する `baseCommit` 時点の教材と課題定義を
 * 指す (`scripts/rebuild-legacy-baseline.ts`)。いまの教材から作ると改訂済みの単元が未改訂に見える。
 */
export function createLegacyBaseline(
  root: string,
  baseCommit: string,
  resolveAssignment: AssignmentResolver = resolveSharedAssignment,
): LegacySourceBaseline {
  return {
    schemaVersion: 1,
    baseCommit,
    units: Object.fromEntries(
      listSourceUnits(root)
        .filter((u) => u.format !== 2)
        .map((u) => [u.unitId, unitContentHash(u.directory, resolveAssignment)]),
    ),
    exemptions: [],
  };
}
/** パス先頭のロケール (`/en-US/docs`・`/ja/docs`・`/ja-jp/dotnet`・`/ja_jp/lambda`)。 */
const LOCALE_SEGMENT = /^[a-z]{2}(?:[-_][a-z]{2,4})?$/;
/** 版の切り替え (`/docs/current/`・`/3/`・`/en/stable/`・`/latest-v20.x/`・`/4x/`)。 */
const VERSION_SEGMENT = /^(?:current|latest|stable|(?:latest-)?v?\d+(?:x|(?:\.(?:\d+|x))*))$/;
/** 末尾に来ると資料群の目次・入口になる区分名。 */
const INDEX_SEGMENTS = new Set([
  "docs",
  "doc",
  "documentation",
  "guide",
  "guides",
  "learn",
  "reference",
  "references",
  "api",
  "apis",
  "handbook",
  "curriculum",
  "multipage",
  "manual",
  "tutorial",
  "tutorials",
  "library",
]);
/**
 * 既知の資料サイトで、技術・資料群の入口になるパス (ロケール・版・拡張子・index を除いた形)。
 * 目次と各ページへの案内が中心のページなので、`#` で節を指しても根拠にしない。
 * ホストはサブドメイン (`www.`・`ja.` など) も含めて照合する。
 */
const LANDING_PATHS: readonly (readonly [host: string, path: RegExp])[] = [
  // Web 全体・技術ごとのトップとその Guide / Reference、学習領域・モジュールの目次。
  [
    "developer.mozilla.org",
    /^(?:docs\/(?:web(?:\/[^/]+(?:\/(?:guides?|reference|tutorials|how_to))?)?|(?:learn|learn_web_development)(?:\/[^/]+){0,2}|glossary)|curriculum(?:\/[^/]+)?)$/,
  ],
  ["typescriptlang.org", /^docs\/handbook\/intro$/],
  ["nextjs.org", /^docs\/(?:app|pages)(?:\/(?:getting-started|guides|api-reference))?$/],
  ["react.dev", /^reference\/react(?:-dom)?(?:\/(?:hooks|components|apis))?$/],
  ["learn.microsoft.com", /^dotnet(?:\/[^/]+)?$/],
  ["docs.github.com", /^[^/]+$/],
  ["docs.aws.amazon.com", /^[^/]+(?:\/[^/]+)?$/],
  ["w3.org", /^(?:style\/css|wai(?:\/aria\/apg(?:\/patterns)?)?)$/],
  ["design.digital.go.jp", /^dads$/],
  ["design-system.service.gov.uk", /^(?:styles|components|patterns|get-started)$/],
];
function landingPathSegments(url: URL): string[] {
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // 不正なエスケープはそのまま比べる。
      }
      return decoded.toLowerCase().replace(/\.(?:html?|php|aspx?|md)$/, "");
    });
  if (segments.length > 0 && LOCALE_SEGMENT.test(segments[0])) segments.shift();
  const path = segments.filter((segment) => !VERSION_SEGMENT.test(segment));
  if (path.at(-1) === "index") path.pop();
  return path;
}
/**
 * 技術・資料群のトップページや目次。台帳の `section` は自由記述なので、個別ページかどうかは
 * URL で判断する。既知のサイトは入口のパスを、それ以外はサイトのトップと `docs`・`guide`
 * などの区分名で終わるパスを入口とみなす。単一ページの仕様書のように URL の `#` で節を
 * 指す場合は、既知の入口でなければ個別の根拠として扱う (節の実在は週次のリンク確認が見る)。
 */
export function isTechnologyLandingPage(source: Pick<SourceRecord, "url">): boolean {
  const url = new URL(source.url);
  const segments = landingPathSegments(url);
  const path = segments.join("/");
  if (
    LANDING_PATHS.some(
      ([host, pattern]) =>
        (url.hostname === host || url.hostname.endsWith(`.${host}`)) && pattern.test(path),
    )
  )
    return true;
  if (url.hash) return false;
  const last = segments.at(-1);
  return last === undefined || INDEX_SEGMENTS.has(last);
}
function checkUnit(
  root: string,
  unitId: string,
  directory: string,
  refs: UnitReferences | undefined,
  registry: Map<string, SourceRecord>,
  contentHash: string,
  environment?: string,
): string[] {
  const problems: string[] = [];
  if (!refs) return ["references.json がありません"];
  if (parseUnitId(refs.unitId).path !== unitId)
    problems.push(`unitId が単元と一致しません: ${refs.unitId}`);
  // 版は参照元を確認した内容を指す。同じ版のまま内容を変えると、受講者が見た版と区別できない。
  if (refs.contentHash !== contentHash)
    problems.push(
      `contentHash が ${refs.unitId} で確認した内容と一致しません。内容を改訂したら unitId の版を上げ、参照元と本文・課題の対応を確認し直してから、contentHash を今の指紋 (bun run --filter=@stella/content hash:unit -- ${unitId}) に更新してください`,
    );
  const envParts = /^([a-z0-9][a-z0-9._-]*)@([^@]+)$/.exec(refs.environmentRef);
  if (!envParts) problems.push("environmentRef: ID@version の環境定義が必要です");
  else {
    try {
      const env = readEnvironment(root, envParts[1]);
      if (env.id !== refs.environmentRef)
        problems.push(`環境の版が一致しません: ${refs.environmentRef}`);
      if (environment && environment !== envParts[1])
        problems.push("講座・課題と参照元の環境が一致しません");
    } catch (error) {
      problems.push(`環境の定義がありません: ${String(error)}`);
    }
  }
  const files = publicContentFiles(directory);
  for (const use of refs.uses) {
    if (!files.includes(use.contentId)) problems.push(`参照の対応先がありません: ${use.contentId}`);
    if (use.reviewStatus !== "approved")
      problems.push(`${use.contentId}: レビュー状態が approved ではありません`);
    for (const id of use.sourceRefs) {
      const source = registry.get(id);
      if (!source) {
        problems.push(`${use.contentId}: 未登録の sourceRef: ${id}`);
        continue;
      }
      if (source.review.status !== "approved")
        problems.push(`${id}: レビュー状態が approved ではありません`);
      if (isTechnologyLandingPage(source))
        problems.push(
          `${id}: 技術のトップページだけを根拠にできません。読む節のある個別ページの URL を登録してください`,
        );
    }
  }
  for (const file of files) {
    const uses = refs.uses.filter((u) => u.contentId === file);
    if (uses.length === 0) {
      problems.push(`${file}: 参照元または独自制作の記録がありません`);
      continue;
    }
    let declared: string[] | undefined;
    try {
      if (file.startsWith("tasks/") && file.endsWith("/README.md")) {
        const task = object(
          JSON.parse(
            readFileSync(join(directory, file.replace(/README\.md$/, "task.json")), "utf8"),
          ),
          "task.json",
        );
        if (typeof task.environment !== "string" || (envParts && task.environment !== envParts[1]))
          problems.push(`${file}: 課題と参照元の環境が一致しません`);
        if (Array.isArray(task.sources) && task.sources.every((id) => typeof id === "string"))
          declared = task.sources as string[];
      } else if (file.endsWith(".md"))
        declared = readSourceRefs(readFileSync(join(directory, file), "utf8"));
    } catch (error) {
      problems.push(`${file}: ${String(error)}`);
    }
    if (file.endsWith(".md")) {
      if (!declared) problems.push(`${file}: sourceRefs (課題は sources) がありません`);
      else {
        const mapped = [...new Set(uses.flatMap((u) => u.sourceRefs))].sort();
        if (JSON.stringify([...declared].sort()) !== JSON.stringify(mapped))
          problems.push(`${file}: sourceRefs と references.json の対応が一致しません`);
        for (const id of declared)
          if (!registry.has(id)) problems.push(`${file}: 未登録の sourceRef: ${id}`);
      }
    }
  }
  return [...new Set(problems)];
}
export function checkSourceReferences(
  root: string,
  baseline?: LegacySourceBaseline,
  resolveAssignment: AssignmentResolver = resolveSharedAssignment,
): SourceDiagnostic[] {
  const registry = readSourceRegistry(root);
  const recorded =
    baseline ??
    (JSON.parse(
      readFileSync(join(root, "sources/legacy-units.json"), "utf8"),
    ) as LegacySourceBaseline);
  if (recorded.schemaVersion !== 1 || !recorded.units || !Array.isArray(recorded.exemptions))
    throw new Error("旧単元の基準記録が不正です");
  const diagnostics: SourceDiagnostic[] = [];
  for (const unit of listSourceUnits(root)) {
    const hash = unitContentHash(unit.directory, resolveAssignment);
    // 例外は導入時点の基準にある旧単元の改訂だけに効く。基準に無い単元 (新規の旧形式) は
    // 例外を書いても必須のまま。
    const legacy = unit.format !== 2 && Object.hasOwn(recorded.units, unit.unitId);
    const exempt =
      legacy &&
      recorded.exemptions.some(
        (e) =>
          e.unitId === unit.unitId &&
          e.contentHash === hash &&
          e.reason.trim() &&
          e.reviewer.trim() &&
          isCalendarDate(e.reviewedAt),
      );
    const required = !legacy || (recorded.units[unit.unitId] !== hash && !exempt);
    try {
      const refs = readUnitReferences(unit.directory);
      for (const message of checkUnit(
        root,
        unit.unitId,
        unit.directory,
        refs,
        registry,
        hash,
        unit.environment,
      ))
        diagnostics.push({
          unitId: unit.unitId,
          severity: required ? "error" : "warning",
          message,
        });
    } catch (error) {
      diagnostics.push({
        unitId: unit.unitId,
        severity: required ? "error" : "warning",
        message: String(error),
      });
    }
  }
  return diagnostics;
}
