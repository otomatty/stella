/**
 * 課題の中の「問題」。確認・提出・記録の単位で、1 問 1 ファイル。
 * パスは ID からこの関数だけで決める。課題ごとにパスは書かない。
 */

import { sha256Hex } from "./hash.js";
import type { TaskManifest } from "./manifest.js";
import { RUNNERS, type RunnerPlanKind } from "./runners.js";

/** `^[a-z0-9][a-z0-9-]*$`。`..`・空白・`-p:` はここに当たらない。 */
export const PROBLEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export interface TaskProblem {
  id: string;
  title: string;
  after?: string;
}

export function isProblemId(value: string): boolean {
  return PROBLEM_ID_PATTERN.test(value);
}

const PROBLEM_PLANS = new Set<RunnerPlanKind>(["vitest", "typescript", "dotnet"]);

/** vitest・typescript は `.ts`、dotnet は `.cs`。書けない手順や不正な ID は null。 */
export function problemFiles(
  plan: RunnerPlanKind,
  id: string,
): { source: string; test: string } | null {
  if (!PROBLEM_PLANS.has(plan) || !isProblemId(id)) return null;
  const ext = plan === "dotnet" ? "cs" : "ts";
  return { source: `src/${id}.${ext}`, test: `tests/${id}.test.${ext}` };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `problems` が無い課題は何も足さない。あるときは 1 件以上で、書ける手順だけを通す。
 * `plan` が null なのは、runner 自体がまだ不正なとき。
 */
export function readProblems(
  raw: unknown,
  plan: RunnerPlanKind | null,
): { problems?: TaskProblem[]; errors: string[] } {
  if (raw === undefined) return { errors: [] };
  const errors: string[] = [];
  if (plan === null || !PROBLEM_PLANS.has(plan)) {
    errors.push("problems は手順が vitest・typescript・dotnet の課題だけに書けます");
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("problems は 1 件以上の配列で書いてください");
    return { errors };
  }
  const problems: TaskProblem[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < raw.length; index++) {
    const item = raw[index];
    const at = `problems[${index}]`;
    if (!isObject(item)) {
      errors.push(`${at} はオブジェクトで書いてください`);
      continue;
    }
    const id = typeof item.id === "string" ? item.id : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!isProblemId(id)) {
      errors.push(`${at}.id は英小文字・数字・ハイフンで書いてください (例 "q01-add-tax")`);
    } else if (seen.has(id)) {
      errors.push(`${at}.id が重複しています: ${id}`);
    } else {
      seen.add(id);
    }
    if (title.length === 0) {
      errors.push(`${at}.title は空でない文字列で書いてください`);
    }
    const after = typeof item.after === "string" ? item.after.trim() : "";
    if (item.after !== undefined && !after) {
      errors.push(`${at}.after は空でないトピック ID で書いてください`);
    }
    if (isProblemId(id) && title.length > 0 && !problems.some((problem) => problem.id === id)) {
      problems.push({ id, title, ...(after ? { after } : {}) });
    }
  }
  if (problems.some((problem) => problem.after) && problems.some((problem) => !problem.after)) {
    errors.push("problems の after は全問に書くか、すべて省いてください");
  }
  if (errors.length > 0) return { errors };
  return { problems, errors };
}

// ponytail: 正規表現なのでコメントの中の import も拾う。控えるファイルが増えるだけで、見落としにはならない。
const FROM = String.raw`from(?:\s|/\*[^*]*\*+(?:[^/*][^*]*\*+)*/|//[^\r\n]*(?:\r\n?|\n))*`;
const RELATIVE_IMPORT = new RegExp(
  String.raw`\b(?:import\s+(?:[^'";]*?\s+${FROM})?|export\s+[^'";]*?\s+${FROM}|(?:import|require)\s*\(\s*)(["'])(\.{1,2}/[^"'\r\n]+)\1`,
  "g",
);

export function relativeImportSpecifiers(code: string): string[] {
  return Array.from(code.matchAll(RELATIVE_IMPORT), (match) => match[2] ?? "");
}

/** 拡張・教材・API で同じ順序で候補を試し、課題フォルダーの外には出ない。 */
export function resolveRelativeImport(
  from: string,
  specifier: string,
  files: ReadonlySet<string>,
): string | undefined {
  const parts = from.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!parts.length) return undefined;
      parts.pop();
    } else parts.push(segment);
  }
  const path = parts.join("/");
  return [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    path.replace(/\.js$/, ".ts"),
    `${path}/index.ts`,
    `${path}/index.tsx`,
  ].find((candidate) => files.has(candidate));
}

const explanationFiles = new Set([
  "readme.md",
  "hints.md",
  "explanation.md",
  "review.md",
  ".stella/task.json",
]);

type ProblemHashDefinition = Pick<TaskManifest, "runner" | "problems" | "checks" | "environment">;

/** 配布時の base64 を使い、実行に関わるファイルをパス順に並べて版をまたいで比べる。 */
export async function problemFingerprints(
  definition: ProblemHashDefinition,
  files: Readonly<Record<string, string>>,
): Promise<Record<string, string>> {
  if (!definition.problems?.length) return {};
  const plan = RUNNERS[definition.runner].plan;
  const problems = definition.problems.map(({ id, title }) => {
    const paths = problemFiles(plan, id);
    if (!paths) throw new Error(`問題のファイル名が不正です: ${id}`);
    return { id, title, paths: [paths.source, paths.test] };
  });
  const ownerByPath = new Map(
    problems.flatMap(({ id, paths }) => paths.map((path) => [path, id] as const)),
  );
  const distributedPaths = new Set(Object.keys(files));
  const sharedFiles = Object.keys(files)
    .sort()
    .filter((path) => !ownerByPath.has(path) && !explanationFiles.has(path.toLowerCase()))
    .map((path) => [path, files[path]]);
  const dotnet = plan === "dotnet" ? definition.environment?.dotnet : undefined;
  const encoder = new TextEncoder();
  const sharedHash = await sha256Hex(
    encoder.encode(
      JSON.stringify([
        definition.runner,
        definition.checks.lint,
        definition.checks.format,
        [dotnet?.min, dotnet?.maxMajor, dotnet?.majors],
        sharedFiles,
      ]),
    ),
  );
  const ownHashes = new Map(
    await Promise.all(
      problems.map(async ({ id, title, paths }) => {
        const problem = paths.map((path) => {
          if (!Object.hasOwn(files, path))
            throw new Error(`問題の配布ファイルがありません: ${path}`);
          return [path, files[path]];
        });
        const hash = await sha256Hex(encoder.encode(JSON.stringify([sharedHash, title, problem])));
        return [id, hash] as const;
      }),
    ),
  );
  if (plan === "dotnet") return Object.fromEntries(ownHashes);

  const decoder = new TextDecoder();
  const importsByPath = new Map<string, string[]>();
  const importsOf = (path: string) => {
    const cached = importsByPath.get(path);
    if (cached) return cached;
    if (!/\.[cm]?[jt]sx?$/.test(path)) return [];
    const code = decoder.decode(Uint8Array.from(atob(files[path] ?? ""), (ch) => ch.charCodeAt(0)));
    const paths = relativeImportSpecifiers(code).flatMap((specifier) => {
      const dependency = resolveRelativeImport(path, specifier, distributedPaths);
      return dependency ? [dependency] : [];
    });
    importsByPath.set(path, paths);
    return paths;
  };
  const problemPaths = new Map(problems.map(({ id, paths }) => [id, paths]));

  return Object.fromEntries(
    await Promise.all(
      [...ownHashes].map(async ([id, ownHash]) => {
        const paths = problemPaths.get(id);
        const dependencies = new Set<string>([id]);
        const visited = new Set(paths);
        for (const path of visited) {
          for (const dependency of importsOf(path)) {
            visited.add(dependency);
            const owner = ownerByPath.get(dependency);
            if (!owner || dependencies.has(owner)) continue;
            dependencies.add(owner);
            // 依存先の雛形とテストの両方をたどる。循環は visited と dependencies で止まる。
            for (const related of problemPaths.get(owner) ?? []) visited.add(related);
          }
        }
        if (dependencies.size === 1) return [id, ownHash];
        const hashes = [...dependencies].sort().map((key) => [key, ownHashes.get(key)]);
        return [id, await sha256Hex(encoder.encode(JSON.stringify(hashes)))];
      }),
    ),
  );
}
