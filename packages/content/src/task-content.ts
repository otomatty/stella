import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  /** 課題文を載せるレッスンのキー。seed がこのレッスンと課題を結び、Web の「VS Code で開く」に使う。 */
  lessonId: string;
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
  const tasks = sortNatural(readdirSync(tasksRoot)).map((taskId): TaskSeed => {
    const taskDir = join(tasksRoot, taskId);
    if (!lstatSync(taskDir).isDirectory())
      throw new Error(`tasks/: ディレクトリが必要です: ${taskId}`);
    // 学習フォルダーでは `<課題>-fixed-start/` を固定した開始点に使う。課題と取り違えない。
    if (taskId.endsWith(FIXED_START_SUFFIX))
      throw new Error(
        `課題のフォルダー名を ${FIXED_START_SUFFIX} で終わらせることはできません: ${taskId}`,
      );
    const raw = record(json(join(taskDir, "task.json")));
    const environment = readEnvironment(root, raw.environment);
    const definition = parseTaskDefinition(raw, environment);
    if (definition.id !== `${courseId}/${unitId}/${taskId}`)
      throw new Error(`task.id とディレクトリが一致しません: ${definition.id}`);
    if (!patterns.has(definition.pattern)) throw new Error(`未知のパターン: ${definition.pattern}`);
    assertKnownSkills([...definition.skills.uses, ...definition.skills.assesses], skills);
    for (const id of definition.sources)
      if (!references.some((r) => r.id === id)) throw new Error(`未知の参照元: ${id}`);
    for (const rel of [
      "README.md",
      "hints.md",
      "starter",
      "tests",
      "private/solution",
      "private/explanation.md",
      "private/review.md",
      "private/variants",
    ]) {
      if (!existsSync(join(taskDir, rel)) || lstatSync(join(taskDir, rel)).isSymbolicLink())
        throw new Error(`課題に ${rel} が必要です: ${definition.id}`);
    }
    const readmeId = `tasks/${taskId}/README.md`;
    const readme = readFileSync(join(taskDir, "README.md"), "utf8");
    // 課題の配布物 (starter・tests・README・manifest) にも LMS の課題文にも教材内の画像は
    // 載らないので、README から参照すると受講者には壊れた画像になる。公開前に止める。
    const contentIds = referenceContentIds(readme, readmeId);
    if (contentIds.length > 1)
      throw new Error(
        `課題の README に教材内の画像は使えません (配布されません): ${contentIds.slice(1).join(", ")} (${definition.id})`,
      );
    const taskReferences = publicReferences(referenceMap, registry, contentIds);
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
    const privateFiles = {
      ...collectFiles(join(taskDir, "private/solution"), "solution"),
      ...collectFiles(join(taskDir, "private/variants"), "variants"),
      "explanation.md": readFileSync(join(taskDir, "private/explanation.md")).toString("base64"),
      "review.md": readFileSync(join(taskDir, "private/review.md")).toString("base64"),
      "hints.md": hints.toString("base64"),
    };
    // 非公開の素材は D1 の 1 行 (task_private) に入り、API が 1 回の要求で読む。配布一式と同じ上限。
    const privateTooLarge = bundleSizeProblem(privateFiles);
    if (privateTooLarge)
      throw new Error(`非公開の素材 (private/・hints.md) の${privateTooLarge}: ${definition.id}`);
    const fixedStart = readFixedStart(taskDir, definition, starter, files, privateFiles, assemble);
    // 固定した開始点の無い課題は、これまでと同じ版 (contentHash) のままにする。
    const contentHash = createHash("sha256")
      .update(JSON.stringify({ definition, files, ...(fixedStart ? { fixedStart } : {}) }))
      .digest("hex");
    return {
      courseId,
      unitId,
      lessonId: `task-${unitId}-${taskId}`,
      definition,
      bundle: { manifest, contentHash, files },
      privateFiles,
      ...(fixedStart ? { fixedStart } : {}),
      directory: taskDir,
    };
  });
  return { unit: { courseId, unitId, config, references }, tasks };
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
