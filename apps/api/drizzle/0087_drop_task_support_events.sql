-- アプリ内の AI チャットの廃止 (2026-11-19) に伴い、チャットの支援記録を削除する。
DROP INDEX IF EXISTS `task_support_events_user_task_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `task_support_events_task_id_idx`;
--> statement-breakpoint
DROP TABLE IF EXISTS `task_support_events`;
