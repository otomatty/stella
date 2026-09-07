-- ステージグラフ (スキルツリー) と学習経路の記録 (Phase 1)。
--
-- どちらも additive。既存の列・行・索引は触らないので、0032 まで適用済みの DB にも
-- まっさらな DB にも同じように当たる。
--
-- `stages.prerequisites` は **slug の JSON 配列文字列** (`["html-css-basics"]`)。
-- UUID ではなく slug を入れるのは、正本が教材リポジトリ (`courses/<slug>/course.json`)
-- で、そちらは stage UUID を知らないため。評価器 (@stella/shared/skill-map) も slug で解く。
ALTER TABLE `stages` ADD COLUMN `prerequisites` text;--> statement-breakpoint
ALTER TABLE `stages` ADD COLUMN `can_do` text;--> statement-breakpoint
ALTER TABLE `stages` ADD COLUMN `theme` text;--> statement-breakpoint
--
-- 学習経路の記録。「どの星をいつ点けたか」をあとから集計できるように、受講開始
-- (`started`) とクリア (`cleared`) だけを追記で積む。進捗の正本ではない (正本は
-- enrollments / certificates) ので、書き込み失敗は学習フローを止めない。
CREATE TABLE `stage_path_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`event` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stage_path_events_tenant_stage_event_idx` ON `stage_path_events` (`tenant_id`,`stage_id`,`event`);--> statement-breakpoint
CREATE INDEX `stage_path_events_user_at_idx` ON `stage_path_events` (`user_id`,`at`);
