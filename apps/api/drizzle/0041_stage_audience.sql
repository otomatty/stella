-- スキルツリーのカタログ掲載範囲 (catalog = 全員 / granted = 割当者のみ)。
-- 正本は course.json の `audience`。既存行は catalog のまま。
ALTER TABLE `stages` ADD COLUMN `audience` text NOT NULL DEFAULT 'catalog';

-- 受講者ごとの専用ステージ割当 (マップ掲載。enrollment は自己開始)。
CREATE TABLE `stage_grants` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `stage_id` text NOT NULL,
  `profile_id` text NOT NULL,
  `granted_by` text,
  `granted_at` integer NOT NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `stage_grants_stage_profile_uq` ON `stage_grants` (`stage_id`,`profile_id`);
CREATE INDEX `stage_grants_profile_idx` ON `stage_grants` (`profile_id`);
