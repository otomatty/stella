-- 受講者のキュー「次にやるリスト」の廃止 (2026-11)。
-- オーナーの指示により、0035 で作った表と、そこに残っている行を削除する。
DROP INDEX IF EXISTS `stage_queue_user_order_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `stage_queue_user_stage_uq`;
--> statement-breakpoint
DROP TABLE IF EXISTS `stage_queue`;
