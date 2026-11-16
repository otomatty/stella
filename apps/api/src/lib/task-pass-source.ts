import { sql, type SQLWrapper } from "drizzle-orm";

/** 過去の混在データも扱う。本人の合格 (出所未記録の旧提出を含む) があれば manual だけではない。 */
export function hasOnlyManualTaskPass(userId: SQLWrapper, taskId: SQLWrapper) {
  return sql`(exists (select 1 from submissions s
    where s.student_id = ${userId} and s.task_id = ${taskId}
      and s.verdict = 'pass' and s.review_source = 'manual')
    and not exists (select 1 from submissions s
    where s.student_id = ${userId} and s.task_id = ${taskId}
      and s.verdict = 'pass' and (s.review_source is null or s.review_source <> 'manual')))`;
}
