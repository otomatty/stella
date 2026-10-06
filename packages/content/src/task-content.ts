import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  validateEnvironmentRequirement,
  type EnvironmentRequirement,
} from "../../shared/src/tasks/environment.js";
import { isSafeRelativePattern } from "../../shared/src/tasks/manifest.js";
import {
  bundleSizeProblem,
  FIXED_START_SUFFIX,
  type TaskBundle,
} from "../../shared/src/tasks/catalog.js";
import { parseTaskHints } from "../../shared/src/tasks/help.js";
import { variantKindProblem } from "../../shared/src/tasks/variants.js";
import { matchesPattern } from "../../shared/src/tasks/submission.js";
import {
  publicReferences,
  readSourceRegistry,
  readUnitReferences,
  referenceContentIds,
  referencedMarkdown,
} from "./source-references.js";
import type { PublicSourceReference } from "../../shared/src/tasks/source-reference.js";
import { sortNatural } from "./natural-order.mjs";
import {
  parseTaskDefinition,
  parseUnitConfig,
  toRuntimeManifest,
  type TaskDefinition,
  type UnitConfig,
} from "./task-schema.js";

export interface TaskSeed {
  courseId: string;
  unitId: string;
  /**
   * 課題文を載せるレッスンのキー。seed がこのレッスンと課題を結び、Web の「VS Code で開く」に使う。
   * 類題は null (レッスンを作らない。出題した受講者にだけ配る)。
   */
  lessonId: string | null;
  /**
   * 類題 (`tasks/<課題>/private/variants/<類題>/`) なら親の課題 ID (#39)。類題は講座の課題一覧・
   * レッスン・学習ペース・修了の判定に出さず、出題した受講者にだけ配る。
   */
  variantOf?: string;
  definition: TaskDefinition;
  bundle: TaskBundle;
  privateFiles: Record<string, string>;
  /**
   * 固定した開始点 (任意。`fixed-start/`)。starter の代わりに置く一式で、tests・README・
   * `.stella/task.json` は通常の配布と同じ。前の課題の動く実装を含みうるので bundle に混ぜず、
   * 受講者が求めたときだけ API が返す。
   */
  fixedStart?: Record<string, string>;
  directory: string;
}
export interface UnitSeed {
  courseId: string;
  unitId: string;
  config: UnitConfig;
  references: PublicSourceReference[];
}

function json(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}
function record(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error("台帳はオブジェクトが必要です");
  return raw as Record<string, unknown>;
}
export function registryIds(root: string, name: string): Set<string> {
  const rows = json(join(root, name));
  if (!Array.isArray(rows)) throw new Error(`${name}: 配列が必要です`);
  const ids = rows.map((r) => {
    const row = record(r);
    if (
      typeof row.id !== "string" ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(row.id) ||
      typeof row.title !== "string" ||
      !row.title.trim()
    )
      throw new Error(`${name}: id・title が必要です`);
    return row.id;
  });
  if (new Set(ids).size !== ids.length) throw new Error(`${name}: ID が重複しています`);
  return new Set(ids);
}
export function readEnvironment(root: string, id: unknown): EnvironmentRequirement {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(id))
    throw new Error("environment: 環境台帳の ID が必要です");
  const env = record(json(join(root, "environments", `${id}.json`)));
  if (env.id !== id || typeof env.version !== "string" || !env.version.trim())
    throw new Error(`environment ${id}: id・version が必要です`);
  const errors = validateEnvironmentRequirement(env.requirements, `environment ${id}`);
  if (errors.length) throw new Error(errors.join("\n"));
  return { ...(env.requirements as EnvironmentRequirement), id: `${id}@${env.version}` };
}
export function assertKnownSkills(skills: string[], ids: Set<string>): void {
  for (const id of skills) if (!ids.has(id)) throw new Error(`未知のスキル: ${id}`);
}
/** シンボリックリンクをたどらず、明示したディレクトリだけ収集する。 */
export function collectFiles(root: string, prefix = ""): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (dir: string, rel: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const key = rel ? `${rel}/${name}` : name;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink())
        throw new Error(`教材のシンボリックリンクは配布できません: ${path}`);
      if (stat.isDirectory()) {
        if (["private", "node_modules", ".git", ".stella"].includes(name))
          throw new Error(`配布フォルダーに ${name} を置けません: ${path}`);
        walk(path, key);
      } else if (stat.isFile()) {
        if (!isSafeRelativePattern(key) || /[*?{}[\]]/.test(key))
          throw new Error(`配布ファイル名が不正です: ${key}`);
        files[key] = readFileSync(path).toString("base64");
      }
    }
  };
  walk(root, prefix);
  return files;
}
/** 単元の課題を読むときに共通で使う台帳と参照元。 */
interface UnitContext {
  root: string;
  courseId: string;
  unitId: string;
  skills: Set<string>;
  patterns: Set<string>;
  referenceMap: NonNullable<ReturnType<typeof readUnitReferences>>;
  registry: ReturnType<typeof readSourceRegistry>;
  references: PublicSourceReference[];
}

/** 課題 (類題を含む) に必ず置くファイルとフォルダー。 */
const TASK_REQUIRED_PATHS = [
  "README.md",
  "hints.md",
  "starter",
  "tests",
  "private/solution",
  "private/explanation.md",
  "private/review.md",
] as const;

export function readUnit(
  root: string,
  courseId: string,
  unitId: string,
  directory: string,
  skills = registryIds(root, "skills.json"),
): { unit: UnitSeed; tasks: TaskSeed[] } {
  const patterns = registryIds(root, "patterns.json");
  const config = parseUnitConfig(json(join(directory, "unit.json")));
  assertKnownSkills([...config.skills.uses, ...config.skills.assesses], skills);
  const referenceMap = readUnitReferences(directory);
  if (!referenceMap) throw new Error("references.json が必要です");
  const registry = readSourceRegistry(root);
  const references = publicReferences(referenceMap, registry);
  const tasksRoot = join(directory, "tasks");
  // ログインなしで読める単元は、本文だけを公開する。課題は受講者の作業と提出・レビューを
  // 伴い、配布もログイン後の拡張が行うので置かせない (課題文のレッスンも公開しない)。
  if (config.public && existsSync(tasksRoot))
    throw new Error(
      `ログインなしで読める単元 (unit.json の public) には課題 (tasks/) を置けません: ${courseId}/${unitId}`,
    );
  // 課題の無い単元 (読むだけの導入の単元など) は tasks/ を置かない。印を外しても読み込める。
  if (!existsSync(tasksRoot)) return { unit: { courseId, unitId, config, references }, tasks: [] };
  const ctx: UnitContext = {
    root,
    courseId,
    unitId,
    skills,
    patterns,
    referenceMap,
    registry,
    references,
  };
  const tasks: TaskSeed[] = [];
  const variants: TaskSeed[] = [];
  for (const taskId of sortNatural(readdirSync(tasksRoot))) {
    const taskDir = join(tasksRoot, taskId);
    if (!lstatSync(taskDir).isDirectory())
      throw new Error(`tasks/: ディレクトリが必要です: ${taskId}`);
    const task = readTask(ctx, taskDir, taskId);
    tasks.push(task);
    variants.push(...readVariants(ctx, task));
  }
  // 類題の ID は単元の課題と同じ `<講座>/<単元>/<名前>` で、学習フォルダーの置き場所にもなる。
  // 課題・ほかの類題と同じ名前は使えない。
  const ids = new Set<string>();
  for (const task of [...tasks, ...variants]) {
    if (ids.has(task.definition.id))
      throw new Error(`課題・類題の ID が重複しています: ${task.definition.id}`);
    ids.add(task.definition.id);
  }
  return { unit: { courseId, unitId, config, references }, tasks: [...tasks, ...variants] };
}

/**
 * 課題の `private/variants/` を読む。予備の類題は 1 問 1 フォルダーで、中身は課題と同じ形
 * (task.json・README.md・hints.md・starter/・tests/・private/)。空の在庫は `.gitkeep` だけを置く。
 */
function readVariants(ctx: UnitContext, parent: TaskSeed): TaskSeed[] {
  const variantsRoot = join(parent.directory, "private/variants");
  const variants: TaskSeed[] = [];
  for (const name of sortNatural(readdirSync(variantsRoot))) {
    const path = join(variantsRoot, name);
    const stat = lstatSync(path);
    if (name === ".gitkeep" && stat.isFile()) continue;
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error(
        `private/variants/ には類題を 1 問 1 フォルダーで置いてください (空なら .gitkeep だけ): ${name} (${parent.definition.id})`,
      );
    variants.push(readTask(ctx, path, name, parent));
  }
  return variants;
}

/**
 * 課題 1 つ (`parent` を渡すとその課題の類題) を読み、配布一式と非公開の素材を組み立てる。
 * 類題は親と同じパターンで、レッスンを作らず、固定した開始点と入れ子の予備を持たない。
 */
function readTask(ctx: UnitContext, taskDir: string, taskId: string, parent?: TaskSeed): TaskSeed {
  const { root, courseId, unitId, referenceMap, registry } = ctx;
  const label = parent ? "類題" : "課題";
  // 学習フォルダーでは `<課題>-fixed-start/` を固定した開始点に使う。課題と取り違えない。
  if (taskId.endsWith(FIXED_START_SUFFIX))
    throw new Error(
      `${label}のフォルダー名を ${FIXED_START_SUFFIX} で終わらせることはできません: ${taskId}`,
    );
  const raw = record(json(join(taskDir, "task.json")));
  const environment = readEnvironment(root, raw.environment);
  const definition = parseTaskDefinition(raw, environment);
  if (definition.id !== `${courseId}/${unitId}/${taskId}`)
    throw new Error(`task.id とディレクトリが一致しません: ${definition.id}`);
  if (!ctx.patterns.has(definition.pattern))
    throw new Error(`未知のパターン: ${definition.pattern}`);
  assertKnownSkills([...definition.skills.uses, ...definition.skills.assesses], ctx.skills);
  for (const id of definition.sources)
    if (!ctx.references.some((r) => r.id === id)) throw new Error(`未知の参照元: ${id}`);
  if (parent) {
    // 類題は同じ実装パターンの別の問題 (07 §7.2)。パターンを変えたら類題ではない。
    if (definition.pattern !== parent.definition.pattern)
      throw new Error(
        `類題のパターン (${definition.pattern}) が親の課題 (${parent.definition.pattern}) と違います: ${definition.id}`,
      );
    const kindProblem = variantKindProblem(definition.kind);
    if (kindProblem) throw new Error(`${kindProblem}: ${definition.id}`);
    if (definition.fixedStart)
      throw new Error(`類題には fixedStart を書けません: ${definition.id}`);
    for (const rel of ["private/variants", "fixed-start"])
      if (existsSync(join(taskDir, rel)))
        throw new Error(`類題には ${rel} を置けません: ${definition.id}`);
  }
  for (const rel of parent ? TASK_REQUIRED_PATHS : [...TASK_REQUIRED_PATHS, "private/variants"]) {
    if (!existsSync(join(taskDir, rel)) || lstatSync(join(taskDir, rel)).isSymbolicLink())
      throw new Error(`${label}に ${rel} が必要です: ${definition.id}`);
  }
  // 類題の課題文は単元の参照元の記録 (references.json) に載らない非公開の場所にあるので、
  // 参照元は親の課題文のものを使う。教材内の画像を参照できないのは課題と同じ。
  const readmeId = parent
    ? `tasks/${basename(parent.directory)}/private/variants/${taskId}/README.md`
    : `tasks/${taskId}/README.md`;
  const readme = readFileSync(join(taskDir, "README.md"), "utf8");
  // 課題の配布物 (starter・tests・README・manifest) にも LMS の課題文にも教材内の画像は
  // 載らないので、README から参照すると受講者には壊れた画像になる。公開前に止める。
  const contentIds = referenceContentIds(readme, readmeId);
  if (contentIds.length > 1)
    throw new Error(
      `${label}の README に教材内の画像は使えません (配布されません): ${contentIds.slice(1).join(", ")} (${definition.id})`,
    );
  const taskReferences = parent
    ? (parent.bundle.manifest.references ?? [])
    : publicReferences(referenceMap, registry, contentIds);
  const manifest = { ...toRuntimeManifest(definition, environment), references: taskReferences };
  const testFiles = collectFiles(join(taskDir, "tests"), "tests");
  const readmeFile = Buffer.from(
    referencedMarkdown(readme, taskReferences, referenceMap, readmeId),
  ).toString("base64");
  // ヒント・解答例・解説は配布物に入れない。解放条件 (07 §8) を満たした受講者にだけ
  // API (`/api/tasks/help`) が返す。ここでは README と実行に必要なファイルだけを配る。
  const manifestFile = Buffer.from(JSON.stringify(manifest, null, 2)).toString("base64");
  /** starter (または固定した開始点) に tests・README・task.json を足した配布一式。 */
  const assemble = (starter: Record<string, string>) => {
    const files: Record<string, string> = {};
    // Windows でも衝突する名前と、ファイル・ディレクトリの競合を検出する。
    const bundlePaths = new Set(["readme.md", ".stella"]);
    for (const [key, value] of Object.entries({ ...starter, ...testFiles })) {
      const normalized = key.toLowerCase();
      if (
        (key in starter && key in testFiles) ||
        [...bundlePaths].some(
          (other) =>
            normalized === other ||
            normalized.startsWith(`${other}/`) ||
            other.startsWith(`${normalized}/`),
        )
      )
        throw new Error(`配布ファイルが衝突しています: ${key} (${definition.id})`);
      bundlePaths.add(normalized);
      files[key] = value;
    }
    files["README.md"] = readmeFile;
    files[".stella/task.json"] = manifestFile;
    return files;
  };
  const starter = collectFiles(join(taskDir, "starter"));
  const files = assemble(starter);
  const tooLarge = bundleSizeProblem(files);
  if (tooLarge) throw new Error(`${tooLarge}: ${definition.id}`);
  const hints = readFileSync(join(taskDir, "hints.md"));
  assertHintSteps(hints.toString("utf8"), definition);
  // 予備の類題 (`private/variants/`) は親の素材に入れない。類題はそれぞれ自分の課題として
  // seed され、出題した受講者にだけ配る (#39)。
  const privateFiles = {
    ...collectFiles(join(taskDir, "private/solution"), "solution"),
    "explanation.md": readFileSync(join(taskDir, "private/explanation.md")).toString("base64"),
    "review.md": readFileSync(join(taskDir, "private/review.md")).toString("base64"),
    "hints.md": hints.toString("base64"),
  };
  // 非公開の素材は D1 の 1 行 (task_private) に入り、API が 1 回の要求で読む。配布一式と同じ上限。
  const privateTooLarge = bundleSizeProblem(privateFiles);
  if (privateTooLarge)
    throw new Error(`非公開の素材 (private/・hints.md) の${privateTooLarge}: ${definition.id}`);
  const fixedStart = parent
    ? undefined
    : readFixedStart(taskDir, definition, starter, files, privateFiles, assemble);
  // 固定した開始点の無い課題は、これまでと同じ版 (contentHash) のままにする。
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ definition, files, ...(fixedStart ? { fixedStart } : {}) }))
    .digest("hex");
  return {
    courseId,
    unitId,
    lessonId: parent ? null : `task-${unitId}-${taskId}`,
    ...(parent ? { variantOf: parent.definition.id } : {}),
    definition,
    bundle: { manifest, contentHash, files },
    privateFiles,
    ...(fixedStart ? { fixedStart } : {}),
    directory: taskDir,
  };
}

/**
 * `hints.md` を段に分けられ、段の数が `support.hintLevels` と一致することを確かめる。
 * 段は `## ヒント<番号> <題>` で始める (方針 → 手がかりのコード の順。解答例は最後の段として
 * `private/solution/` から出すので hints.md には書かない)。ヒント 0 段の課題は本文の無い hints.md。
 */
export function assertHintSteps(markdown: string, definition: TaskDefinition): void {
  const parsed = parseTaskHints(markdown);
  if (!parsed.ok) throw new Error(`${parsed.errors.join("\n")} (${definition.id})`);
  if (parsed.hints.length !== definition.support.hintLevels)
    throw new Error(
      `hints.md の段の数 (${parsed.hints.length}) が support.hintLevels (${definition.support.hintLevels}) と一致しません: ${definition.id}`,
    );
}

/**
 * `fixed-start/` (任意) を読み、配布一式を組み立てる。提出の照合が通常の配布と同じ
 * テスト・設定で行われるよう protected のファイルは変えさせず、この課題の解答例も配らない。
 */
function readFixedStart(
  taskDir: string,
  definition: TaskDefinition,
  starter: Record<string, string>,
  files: Record<string, string>,
  privateFiles: Record<string, string>,
  assemble: (starter: Record<string, string>) => Record<string, string>,
): Record<string, string> | undefined {
  const dir = join(taskDir, "fixed-start");
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(dir);
  } catch {
    if (definition.fixedStart)
      throw new Error(`fixedStart は fixed-start/ のある課題だけに書けます: ${definition.id}`);
    return undefined;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory())
    throw new Error(`fixed-start はディレクトリにしてください: ${definition.id}`);
  // 確認A・Bは公式ドキュメントの参照だけで解く (07 §8)。支援になる開始点は置かない。
  if (definition.kind.startsWith("assessment-"))
    throw new Error(`確認A・Bには固定した開始点を置けません: ${definition.id}`);
  // 開始点は前の課題の動く実装を含む。どの課題の実装かを推測せず教材に書かせ、受け取った
  // 受講者のそれらの課題の提出も支援付きにする (写して前の課題を出せるため)。
  if (!definition.fixedStart)
    throw new Error(
      `fixed-start/ のある課題には fixedStart.covers (開始点が実装を含む前の課題) が必要です: ${definition.id}`,
    );
  const fixedStart = assemble(collectFiles(dir));
  const tooLarge = bundleSizeProblem(fixedStart);
  if (tooLarge) throw new Error(`固定した開始点の${tooLarge}: ${definition.id}`);
  const protectedOf = (all: Record<string, string>) =>
    Object.keys(all)
      .filter((path) => matchesPattern(path, definition.protected))
      .sort();
  const expected = protectedOf(files);
  const actual = protectedOf(fixedStart);
  if (
    expected.length !== actual.length ||
    expected.some((path, i) => path !== actual[i] || files[path] !== fixedStart[path])
  )
    throw new Error(
      `固定した開始点ではテスト・設定 (protected) を変えられません: ${definition.id}`,
    );
  for (const [key, value] of Object.entries(privateFiles)) {
    if (!key.startsWith("solution/")) continue;
    const rel = key.slice("solution/".length);
    if (fixedStart[rel] === value && starter[rel] !== value)
      throw new Error(
        `固定した開始点に、この課題の解答例と同じファイルは置けません: ${rel} (${definition.id})`,
      );
  }
  return fixedStart;
}

/**
 * 固定した開始点が実装を含む課題 (`fixedStart.covers`) は、同じ講座でこの課題より前の課題に限る。
 * `tasks` は 1 つの講座の課題を講座の順 (単元 → 課題) に並べたもの。
 */
export function assertFixedStartCovers(tasks: TaskSeed[]): void {
  const earlier = new Set<string>();
  for (const task of tasks) {
    for (const id of task.definition.fixedStart?.covers ?? [])
      if (!earlier.has(id))
        throw new Error(
          tasks.some((t) => t.definition.id === id)
            ? `fixedStart.covers: この課題より前の課題だけを書けます: ${id} (${task.definition.id})`
            : `fixedStart.covers: 同じ講座の課題が見つかりません: ${id} (${task.definition.id})`,
        );
    earlier.add(task.definition.id);
  }
}
