import type { TaskSeed } from "@stella/content";

type Move = { from: string; stageId: string };
type Task = Pick<TaskSeed, "stageId" | "variantOf"> & {
  definition: Pick<TaskSeed["definition"], "id" | "problems">;
  bundle: Pick<TaskSeed["bundle"], "contentHash">;
};

export const DEVLAB_TASK_PROBLEM_MOVES: readonly Move[] = Array.from({ length: 9 }, (_, index) => {
  const stageId = `devlab-ts-ch${String(index + 1).padStart(2, "0")}`;
  return { from: `${stageId}/u99-problems/chapter`, stageId };
});

export function taskProblemCarryoverTargets<T extends Task>(move: Move, tasks: readonly T[]): T[] {
  if (tasks.some((task) => task.definition.id === move.from)) return [];
  return tasks.filter(
    (task) => task.stageId === move.stageId && !task.variantOf && task.definition.problems?.length,
  );
}

export function taskProblemCarryoverStatements(
  moves: readonly Move[],
  tasks: readonly Task[],
  now = "cast(unixepoch('subsec') * 1000 as integer)",
  literal = (value: string) => `'${value.replace(/'/g, "''")}'`,
): string[] {
  return moves.flatMap((move) =>
    taskProblemCarryoverTargets(move, tasks).flatMap(({ definition, bundle }) => {
      const from = literal(move.from);
      const to = literal(definition.id);
      const hash = literal(bundle.contentHash);
      const problemIds = definition.problems?.map((problem) => literal(problem.id)).join(", ");
      const sourceFilter =
        `src.task_id = ${from} and src.content_hash = (select content_hash from tasks where id = ${from})` +
        ` and src.problem_id in (${problemIds})`;
      return [
        [
          "insert into task_problem_results (user_id, task_id, problem_id, content_hash, path, code, sha256, source, manual_reason, manual_by, manual_at, attempts, first_passed_at, updated_at)",
          `select src.user_id, ${to}, src.problem_id, ${hash}, src.path, src.code, src.sha256, src.source, src.manual_reason, src.manual_by, src.manual_at, src.attempts, src.first_passed_at, src.updated_at`,
          `from task_problem_results src where ${sourceFilter}`,
          "on conflict (user_id, task_id, problem_id) do nothing;",
        ].join(" "),
        // 移し先に現行版の結果がある場合だけ進捗を作る。結果を書いた直後に seed が止まっても再実行で補える。
        [
          "insert into task_progress (user_id, task_id, status, content_hash, updated_at)",
          `select distinct src.user_id, ${to}, 'local-passed', ${hash}, ${now}`,
          "from task_problem_results src join task_problem_results dest",
          `on dest.user_id = src.user_id and dest.problem_id = src.problem_id and dest.task_id = ${to} and dest.content_hash = ${hash}`,
          `where ${sourceFilter}`,
          "on conflict (user_id, task_id) do nothing;",
        ].join(" "),
      ];
    }),
  );
}
