import { parsePublicTaskBundle, type TaskBundle } from "@stella/shared/tasks/catalog";
import {
  isProblemId,
  problemFingerprints,
  problemFiles,
  readProblems,
  relativeImportSpecifiers,
  resolveRelativeImport,
} from "@stella/shared/tasks/problems";
import { RUNNERS } from "@stella/shared/tasks/runners";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { taskRevisions } from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";

type ProblemHashes = Readonly<Record<string, string>>;
interface ProblemPaths {
  files: ReadonlySet<string>;
  owners: ReadonlyMap<string, string>;
}
interface ProblemRevision extends ProblemPaths {
  hashes: ProblemHashes;
}
export type ProblemRevisionHashes = ReadonlyMap<string, ProblemRevision | undefined>;
export type ProblemHashCache = Map<string, Map<string, ProblemRevision | undefined>>;

export interface SavedProblemResult {
  problemId: string;
  contentHash: string;
  source: "manual" | "tests";
  path?: string | null;
  code?: string | null;
  historicalDependencies?: readonly string[] | null;
}

function problemPaths(files: Iterable<string>, problemIds: Iterable<string>): ProblemPaths {
  const owners = new Map<string, string>();
  for (const id of problemIds) {
    const paths = problemFiles("typescript", id);
    if (!paths) continue;
    owners.set(paths.source, id);
    owners.set(paths.test, id);
  }
  return { files: new Set(files), owners };
}

/** 相対 import が解決できない場合は、依存なしの空配列と区別する。 */
function directProblemDependencies(
  path: string,
  specifiers: readonly string[],
  revision: ProblemPaths,
  comparisons: readonly ProblemPaths[] = [],
): string[] | null {
  if (!revision.files.has(path) || comparisons.some((other) => !other.files.has(path))) return null;
  const dependencies = new Set<string>();
  for (const specifier of specifiers) {
    const resolved = resolveRelativeImport(path, specifier, revision.files);
    if (
      !resolved ||
      comparisons.some(
        (other) =>
          resolveRelativeImport(path, specifier, other.files) !== resolved ||
          other.owners.get(resolved) !== revision.owners.get(resolved),
      )
    )
      return null;
    const owner = revision.owners.get(resolved);
    if (owner && owner !== revision.owners.get(path)) dependencies.add(owner);
  }
  return [...dependencies].sort();
}

export function submittedProblemDependencies(bundle: TaskBundle, path: string, code: string) {
  return directProblemDependencies(
    path,
    path.endsWith(".ts") ? relativeImportSpecifiers(code) : [],
    problemPaths(
      Object.keys(bundle.files),
      (bundle.manifest.problems ?? []).map((problem) => problem.id),
    ),
  );
}

export function readProblemDependencies(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string" && isProblemId(id)))
      return parsed;
  } catch {
    // 古い出来事と同様、保存済みのコードで照合できる場合だけ使う。
  }
  return null;
}

function sameProblemHash(id: string, current?: ProblemRevision, previous?: ProblemRevision) {
  const hash = current?.hashes[id];
  return typeof hash === "string" && hash === previous?.hashes[id];
}

/** 照合は提出元の版から見た依存関係にも適用する。依存先自体が現行版で提出されていても同じ。 */
export function countableProblemResults<T extends SavedProblemResult>(
  rows: readonly T[],
  currentHash: string,
  taskPassed: boolean,
  revisions?: ProblemRevisionHashes,
): T[] {
  if (taskPassed) return [...rows];
  const current = revisions?.get(currentHash);
  const byId = new Map<string, T>();
  const imports = new Map<SavedProblemResult, string[]>();
  for (const row of rows) if (!byId.has(row.problemId)) byId.set(row.problemId, row);

  return rows.filter((row) => {
    if (row.contentHash === currentHash) return true;
    const original = revisions?.get(row.contentHash);
    if (!sameProblemHash(row.problemId, current, original)) return false;
    if (row.source === "manual") return true;
    if (!current || !original) return false;
    const pending: SavedProblemResult[] = [row];
    const visited = new Set([row.problemId]);
    for (const result of pending) {
      if (result.source === "manual") return false;
      let dependencies = result.historicalDependencies;
      if (dependencies == null) {
        if (result.path == null || result.code == null) return false;
        const submittedRevision = revisions?.get(result.contentHash);
        if (!submittedRevision) return false;
        let specifiers = imports.get(result);
        if (!specifiers) {
          specifiers = result.path.endsWith(".ts") ? relativeImportSpecifiers(result.code) : [];
          imports.set(result, specifiers);
        }
        dependencies = directProblemDependencies(result.path, specifiers, current, [
          original,
          submittedRevision,
        ]);
        if (dependencies === null) return false;
      }
      for (const dependency of dependencies) {
        if (visited.has(dependency)) continue;
        const submitted = byId.get(dependency);
        if (
          !submitted ||
          !sameProblemHash(dependency, current, original) ||
          !sameProblemHash(dependency, current, revisions?.get(submitted.contentHash))
        )
          return false;
        visited.add(dependency);
        pending.push(submitted);
      }
    }
    return true;
  });
}

interface RevisionScope {
  taskId: string;
  currentHash: string;
  rows: readonly { contentHash: string }[];
  taskPassed?: boolean;
}

function parseHashes(raw: string): ProblemHashes | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([, hash]) => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash),
        ),
      );
    }
  } catch {
    // 壊れた指紋では前の版を数えない。
  }
}

async function computeRevisionHashes(row: {
  task_id: string;
  content_hash: string;
  definition: string | null;
  bundle: string | null;
}) {
  if (!row.definition || !row.bundle) return;
  try {
    const bundle = parsePublicTaskBundle(JSON.parse(row.bundle));
    if (bundle.contentHash !== row.content_hash || bundle.manifest.id !== row.task_id) return;
    const definition = JSON.parse(row.definition);
    if (definition.runner !== bundle.manifest.runner) return;
    const { problems } = readProblems(definition.problems, RUNNERS[bundle.manifest.runner].plan);
    if (!problems) return;
    for (const value of Object.values(bundle.files)) atob(value);
    return await problemFingerprints({ ...bundle.manifest, problems }, bundle.files);
  } catch {
    // 版が読めない場合は提出を引き継がない。seed の再実行で復旧できるよう null のままにする。
  }
}

/** 必要な課題と版だけをまとめて読み、指紋のない版の配布一式だけを取得する。 */
export async function loadProblemRevisionHashes(
  db: Db,
  scopes: Iterable<RevisionScope>,
  cache: ProblemHashCache = new Map(),
) {
  const requested = new Map<string, Set<string>>();
  for (const { taskId, currentHash, rows, taskPassed } of scopes) {
    if (taskPassed) continue;
    for (const { contentHash } of rows) {
      if (contentHash === currentHash) continue;
      const hashes = requested.get(taskId) ?? new Set([currentHash]);
      hashes.add(currentHash);
      hashes.add(contentHash);
      requested.set(taskId, hashes);
    }
  }
  const keys = [...requested].flatMap(([id, hashes]) =>
    [...hashes].filter((hash) => !cache.get(id)?.has(hash)).map((hash) => [id, hash]),
  );
  if (!keys.length) return cache;
  const revisions = await db.all<{
    task_id: string;
    content_hash: string;
    problem_hashes: string | null;
    definition: string | null;
    bundle: string | null;
    paths: string;
  }>(sql`
    select r.task_id, r.content_hash, r.problem_hashes,
      case when r.problem_hashes is null then r.definition end definition,
      case when r.problem_hashes is null then r.bundle end bundle,
      (select json_group_array(f.key)
       from json_each(case when json_valid(r.bundle) then r.bundle end, '$.files') f) paths
    from json_each(${JSON.stringify(keys)}) k
    join task_revisions r on r.task_id = json_extract(k.value, '$[0]')
      and r.content_hash = json_extract(k.value, '$[1]')
  `);
  for (const [taskId, contentHash] of keys) {
    const byHash = cache.get(taskId) ?? new Map();
    byHash.set(contentHash, undefined);
    cache.set(taskId, byHash);
  }
  const writes = [];
  for (const row of revisions) {
    const hashes =
      row.problem_hashes === null
        ? await computeRevisionHashes(row)
        : parseHashes(row.problem_hashes);
    if (!hashes) continue;
    cache.get(row.task_id)?.set(row.content_hash, {
      hashes,
      ...problemPaths(JSON.parse(row.paths) as string[], Object.keys(hashes)),
    });
    if (row.problem_hashes === null) {
      writes.push(
        db
          .update(taskRevisions)
          .set({ problemHashes: JSON.stringify(hashes) })
          .where(
            and(
              eq(taskRevisions.taskId, row.task_id),
              eq(taskRevisions.contentHash, row.content_hash),
              isNull(taskRevisions.problemHashes),
            ),
          ),
      );
    }
  }
  for (const [first, ...rest] of chunk(writes, 100)) {
    if (first) await db.batch([first, ...rest]);
  }
  return cache;
}

/** 1 課題への操作でも、照合に要る版はまとめて読む。 */
export async function loadTaskProblemHashes(db: Db, scope: RevisionScope) {
  return (await loadProblemRevisionHashes(db, [scope])).get(scope.taskId);
}
