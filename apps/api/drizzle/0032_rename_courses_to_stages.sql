-- 受講者向けの学習単位を「コース」から「ステージ」へ改名 (Phase 0)。
--
-- 表・列・索引の名前だけを付け替える。行は 1 件も動かさない (ID / slug /
-- thumbnail_path の値はそのまま — thumbnail_path は R2 の `courses/<slug>/...`
-- キーを指しており、教材リポジトリ側は「講座 = course」の語彙のままのため)。
--
-- SQLite の RENAME TO / RENAME COLUMN は他表の FOREIGN KEY 句も追随させるので、
-- 参照側 (sections / enrollments / certificates / enrollment_preset_items) の
-- 再作成は要らない。索引は名前だけ古いまま残るので、張り直して名前も揃える。
ALTER TABLE `courses` RENAME TO `stages`;--> statement-breakpoint
ALTER TABLE `sections` RENAME COLUMN `course_id` TO `stage_id`;--> statement-breakpoint
ALTER TABLE `enrollments` RENAME COLUMN `course_id` TO `stage_id`;--> statement-breakpoint
ALTER TABLE `enrollment_preset_items` RENAME COLUMN `course_id` TO `stage_id`;--> statement-breakpoint
ALTER TABLE `certificates` RENAME COLUMN `course_id` TO `stage_id`;--> statement-breakpoint
ALTER TABLE `certificates` RENAME COLUMN `course_title` TO `stage_title`;--> statement-breakpoint
ALTER TABLE `announcements` RENAME COLUMN `course_id` TO `stage_id`;--> statement-breakpoint
ALTER TABLE `submissions` RENAME COLUMN `course_title` TO `stage_title`;--> statement-breakpoint
DROP INDEX `courses_tenant_slug_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `stages_tenant_slug_uq` ON `stages` (`tenant_id`,`slug`);--> statement-breakpoint
DROP INDEX `enrollments_user_course_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_user_stage_uq` ON `enrollments` (`user_id`,`stage_id`);--> statement-breakpoint
DROP INDEX `certificates_user_course_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_user_stage_uq` ON `certificates` (`user_id`,`stage_id`);--> statement-breakpoint
DROP INDEX `enrollment_preset_items_preset_course_uq`;--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_preset_items_preset_stage_uq` ON `enrollment_preset_items` (`preset_id`,`stage_id`);
