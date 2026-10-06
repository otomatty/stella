-- 旧仕様の自己申告完了を、端末の再同期を待たずレビュー合格に揃える。
-- 閲覧記録・学習ログは残し、更新日時だけを進めて端末のLWWにも訂正を届ける。
UPDATE lesson_progress AS progress
SET completed = 0, updated_at = max(updated_at + 1, unixepoch() * 1000)
WHERE completed = 1 AND EXISTS (
  SELECT 1 FROM lessons lesson
  JOIN sections section ON section.id = lesson.section_id
  JOIN stages stage ON stage.id = section.stage_id
  WHERE lesson.id = progress.lesson_id AND lesson.type = 'code'
    AND stage.tenant_id = progress.tenant_id
    AND NOT EXISTS (
      SELECT 1 FROM submissions submission
      WHERE submission.tenant_id = progress.tenant_id
        AND submission.student_id = progress.user_id
        AND submission.lesson_id = lesson.id
        AND submission.assignment_id = lesson.assignment_id
        AND submission.verdict = 'pass'
    )
);
--> statement-breakpoint
-- この変更で崩れる旧形式の条件はコードの完了・課題合格だけ。
-- 両方が任意のステージ、format 2の課題による修了、staff発行・失効済みは残す。
WITH invalid_certificates AS (
SELECT certificate.id FROM certificates certificate
JOIN stages stage ON stage.id = certificate.stage_id AND stage.tenant_id = certificate.tenant_id
WHERE certificate.issued_by IS NULL AND certificate.revoked = 0 AND stage.format <> 2
  AND (stage.require_all_lessons = 1 OR stage.require_assignment_pass = 1)
  AND EXISTS (
    SELECT 1 FROM lessons lesson
    JOIN sections section ON section.id = lesson.section_id
    WHERE section.stage_id = stage.id AND lesson.type = 'code'
      AND NOT EXISTS (
        SELECT 1 FROM submissions submission
        WHERE submission.tenant_id = certificate.tenant_id
          AND submission.student_id = certificate.user_id
          AND submission.lesson_id = lesson.id
          AND submission.assignment_id = lesson.assignment_id
          AND submission.verdict = 'pass'
      )
  )
)
INSERT OR IGNORE INTO audit_logs
  (id, tenant_id, actor_name, actor_role, action, target_type, target_id, metadata, created_at)
SELECT 'reviewed-code-backfill:' || certificate.id, certificate.tenant_id, 'レビュー合格の移行', 'system',
  'certificate_reclaim', 'certificate', certificate.id,
  json_object('cert_code', certificate.cert_code, 'stage_id', certificate.stage_id,
    'user_id', certificate.user_id, 'reason', 'reviewed_code_progress_backfill'),
  unixepoch() * 1000
FROM certificates certificate JOIN invalid_certificates invalid ON invalid.id = certificate.id;
--> statement-breakpoint
WITH invalid_certificates AS (
SELECT certificate.id FROM certificates certificate
JOIN stages stage ON stage.id = certificate.stage_id AND stage.tenant_id = certificate.tenant_id
WHERE certificate.issued_by IS NULL AND certificate.revoked = 0 AND stage.format <> 2
  AND (stage.require_all_lessons = 1 OR stage.require_assignment_pass = 1)
  AND EXISTS (
    SELECT 1 FROM lessons lesson
    JOIN sections section ON section.id = lesson.section_id
    WHERE section.stage_id = stage.id AND lesson.type = 'code'
      AND NOT EXISTS (
        SELECT 1 FROM submissions submission
        WHERE submission.tenant_id = certificate.tenant_id
          AND submission.student_id = certificate.user_id
          AND submission.lesson_id = lesson.id
          AND submission.assignment_id = lesson.assignment_id
          AND submission.verdict = 'pass'
      )
  )
)
UPDATE enrollments AS enrollment SET status = 'active', completed_at = NULL
WHERE status = 'completed' AND EXISTS (
  SELECT 1 FROM certificates certificate JOIN invalid_certificates invalid ON invalid.id = certificate.id
  WHERE certificate.tenant_id = enrollment.tenant_id AND certificate.user_id = enrollment.user_id
    AND certificate.stage_id = enrollment.stage_id
);
--> statement-breakpoint
WITH invalid_certificates AS (
SELECT certificate.id FROM certificates certificate
JOIN stages stage ON stage.id = certificate.stage_id AND stage.tenant_id = certificate.tenant_id
WHERE certificate.issued_by IS NULL AND certificate.revoked = 0 AND stage.format <> 2
  AND (stage.require_all_lessons = 1 OR stage.require_assignment_pass = 1)
  AND EXISTS (
    SELECT 1 FROM lessons lesson
    JOIN sections section ON section.id = lesson.section_id
    WHERE section.stage_id = stage.id AND lesson.type = 'code'
      AND NOT EXISTS (
        SELECT 1 FROM submissions submission
        WHERE submission.tenant_id = certificate.tenant_id
          AND submission.student_id = certificate.user_id
          AND submission.lesson_id = lesson.id
          AND submission.assignment_id = lesson.assignment_id
          AND submission.verdict = 'pass'
      )
  )
)
DELETE FROM certificates WHERE id IN (SELECT id FROM invalid_certificates);
