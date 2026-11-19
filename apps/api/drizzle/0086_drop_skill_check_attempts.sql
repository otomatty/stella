-- 腕試しの廃止 (2026-11)。
-- オーナーの指示により、0036 で作った受験履歴の表と残っている行を削除する。
-- stage_unlocks は前提の免除 (staff) と既存の飛び級の行に使うので残す。
DROP INDEX IF EXISTS `skill_check_attempts_user_stage_idx`;
--> statement-breakpoint
DROP TABLE IF EXISTS `skill_check_attempts`;
