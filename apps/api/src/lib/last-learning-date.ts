import { sql, type SQLWrapper } from "drizzle-orm";

/** 日別の視聴記録も使うため、既存の停止検知と同じ日本時間の日単位。 */
export function lastLearningDate(learner: SQLWrapper) {
  return sql<string>`max(
    coalesce((select max(date) from study_activity where user_id = ${learner} and (watched_sec > 0 or completed_lessons > 0)), ''),
    coalesce((select date(max(last_run_at) / 1000, 'unixepoch', '+9 hours') from task_local_runs where user_id = ${learner}), ''),
    coalesce((select date(max(submitted_at) / 1000, 'unixepoch', '+9 hours') from submissions where student_id = ${learner} and (review_source is null or review_source <> 'manual')), ''),
    coalesce((select date(max(answered_at) / 1000, 'unixepoch', '+9 hours') from review_logs where user_id = ${learner}), ''),
    coalesce((select date(max(enrolled_at) / 1000, 'unixepoch', '+9 hours') from enrollments where user_id = ${learner}), '')
  )`;
}
