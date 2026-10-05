import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateEnvironmentRequirement,
  type EnvironmentRequirement,
} from "../../shared/src/tasks/environment.js";
import { isSafeRelativePattern } from "../../shared/src/tasks/manifest.js";
import type { TaskBundle } from "../../shared/src/tasks/catalog.js";
import {
  publicReferences,
  readSourceRegistry,
  readUnitReferences,
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
  definition: TaskDefinition;
  bundle: TaskBundle;
  privateFiles: Record<string, string>;
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
    const taskReferences = publicReferences(referenceMap, registry, `tasks/${taskId}/README.md`);
    const manifest = { ...toRuntimeManifest(definition, environment), references: taskReferences };
    const files: Record<string, string> = {};
    // Windows でも衝突する名前と、ファイル・ディレクトリの競合を検出する。
    const bundlePaths = new Set(["readme.md", ".stella"]);
    const addFiles = (collected: Record<string, string>) => {
      for (const [key, value] of Object.entries(collected)) {
        const normalized = key.toLowerCase();
        if (
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
    };
    addFiles(collectFiles(join(taskDir, "starter")));
    addFiles(collectFiles(join(taskDir, "tests"), "tests"));
    files["README.md"] = Buffer.from(
      referencedMarkdown(
        readFileSync(join(taskDir, "README.md"), "utf8"),
        taskReferences,
        referenceMap,
        `tasks/${taskId}/README.md`,
      ),
    ).toString("base64");
    // ヒントの解放 UI は後続で実装する。ここでは README と実行に必要なファイルだけを配る。
    files[".stella/task.json"] = Buffer.from(JSON.stringify(manifest, null, 2)).toString("base64");
    const privateFiles = {
      ...collectFiles(join(taskDir, "private/solution"), "solution"),
      ...collectFiles(join(taskDir, "private/variants"), "variants"),
      "explanation.md": readFileSync(join(taskDir, "private/explanation.md")).toString("base64"),
      "review.md": readFileSync(join(taskDir, "private/review.md")).toString("base64"),
      "hints.md": readFileSync(join(taskDir, "hints.md")).toString("base64"),
    };
    const contentHash = createHash("sha256")
      .update(JSON.stringify({ definition, files }))
      .digest("hex");
    return {
      courseId,
      unitId,
      definition,
      bundle: { manifest, contentHash, files },
      privateFiles,
      directory: taskDir,
    };
  });
  return { unit: { courseId, unitId, config, references }, tasks };
}
