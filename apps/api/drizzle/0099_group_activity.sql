ALTER TABLE `groups` ADD COLUMN `share_activity` integer NOT NULL DEFAULT 0
  CONSTRAINT `groups_share_activity_check` CHECK (`share_activity` IN (0, 1));
--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `hide_group_activity` integer NOT NULL DEFAULT 0
  CONSTRAINT `profiles_hide_group_activity_check` CHECK (`hide_group_activity` IN (0, 1));
--> statement-breakpoint
CREATE TABLE `group_activity_reactions` (
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `kind` text NOT NULL CONSTRAINT `group_activity_reactions_kind_check`
    CHECK (`kind` IN ('stage_start', 'stage_clear', 'task_pass', 'ahead')),
  `target_profile_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  `ref` text NOT NULL,
  `from_profile_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  `emoji` text NOT NULL,
  `created_at` integer NOT NULL,
  PRIMARY KEY (`group_id`, `kind`, `target_profile_id`, `ref`, `from_profile_id`, `emoji`)
);
--> statement-breakpoint
CREATE INDEX `group_activity_reactions_target_created`
  ON `group_activity_reactions` (`target_profile_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `group_activity_reactions_created`
  ON `group_activity_reactions` (`created_at`);
