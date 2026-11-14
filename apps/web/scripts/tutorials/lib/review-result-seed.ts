/** 動画と素材用の静止画で共用する提出直後のデータ。 */
export const REVIEW_RESULT_SEED_SQL = [
  // 課題・課題文レッスン・受講者は seed の行を使い、提出直後の状態を用意する。
  // AI のジョブは作らず、収録中も「AI が確認中」のままにする。
  `INSERT INTO submissions (
      id, tenant_id, student_id, lesson_id, task_id, task_content_hash,
      task_kind, submission_mode, stage_title, section_title, assignment_title,
      code, status, ai_review_status, submitted_at
    )
    SELECT 'tutorial-review-result-' || t.id, st.tenant_id, p.id, l.id, t.id,
      t.content_hash, t.kind, 'submit', st.title, s.title, t.title,
      '', 'pending', 'queued', unixepoch('now') * 1000
    FROM tasks t
    JOIN lessons l ON l.id = t.lesson_id
    JOIN sections s ON s.id = l.section_id
    JOIN stages st ON st.id = s.stage_id
    JOIN profiles p ON p.tenant_id = st.tenant_id AND p.id = 'seed-learner'
    WHERE st.tenant_id = 'ses' AND st.slug = 'dev-env-basics' AND st.format = 2
      AND t.id = 'dev-env-basics/u02-first-task/q01-first-page';`,
];
