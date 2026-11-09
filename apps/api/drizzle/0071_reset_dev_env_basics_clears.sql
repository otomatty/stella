-- 旧版の dev-env-basics でクリアした受講者のクリアを取り消す。
--
-- 最初のステージは、以前は課題 1 問 (dev-env-basics/m0-first-page/q01-first-page) の合格で
-- クリアできた。教材を作り直し、クリアの条件は全レッスンの完了と全課題 22 件
-- (確認A dev-env-basics/u08-check-a/a01-check-a を含む) の合格になった。
-- 本格運用の前なので、旧版の条件でクリアした受講者には新しい教材で学び直してもらう。
--
-- クリアの正本は enrollments.status = 'completed' と、失効していない certificates である。
-- 修了証は (user, stage) の一意索引があるので、revoke ではなく削除する
-- (stage-auto-complete の reclaimAutoCertificatesIfUnmet と同じ形)。
-- こちらは自動発行に限らず、手動発行と revoked も消す。
-- 確認A に合格 (task_progress.status が passed / ai-passed) している受講者は、
-- 新しい条件でクリアしているので対象外。
-- 完了の受講登録だけを status = 'active'、completed_at = NULL に戻す。
-- lesson_progress、task_progress、知識問題の記録、stage_path_events、監査ログは触らない。
-- 対象は tenant ses の slug dev-env-basics だけ。

DELETE FROM `certificates`
WHERE `stage_id` IN (
  SELECT `id` FROM `stages` WHERE `slug` = 'dev-env-basics' AND `tenant_id` = 'ses'
)
AND NOT EXISTS (
  SELECT 1 FROM `task_progress`
  WHERE `task_progress`.`user_id` = `certificates`.`user_id`
    AND `task_progress`.`task_id` = 'dev-env-basics/u08-check-a/a01-check-a'
    AND `task_progress`.`status` IN ('passed', 'ai-passed')
);
--> statement-breakpoint
UPDATE `enrollments`
SET `status` = 'active', `completed_at` = NULL
WHERE `status` = 'completed'
  AND `stage_id` IN (
    SELECT `id` FROM `stages` WHERE `slug` = 'dev-env-basics' AND `tenant_id` = 'ses'
  )
  AND NOT EXISTS (
    SELECT 1 FROM `task_progress`
    WHERE `task_progress`.`user_id` = `enrollments`.`user_id`
      AND `task_progress`.`task_id` = 'dev-env-basics/u08-check-a/a01-check-a'
      AND `task_progress`.`status` IN ('passed', 'ai-passed')
  );
