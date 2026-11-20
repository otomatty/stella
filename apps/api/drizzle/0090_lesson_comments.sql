CREATE TABLE `lesson_comments` (
  `id` text PRIMARY KEY NOT NULL,
  `lesson_id` text NOT NULL REFERENCES `lessons`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  `parent_id` text REFERENCES `lesson_comments`(`id`) ON DELETE CASCADE,
  `body` text NOT NULL,
  `position_sec` real,
  `video_path` text,
  `scene_id` text,
  `scene_offset_sec` real,
  `scene_hash` text,
  `resolved_at` integer,
  `resolved_by` text REFERENCES `profiles`(`id`) ON DELETE SET NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `lesson_comments_lesson_parent_created_idx` ON `lesson_comments` (`lesson_id`, `parent_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `lesson_comments_parent_created_idx` ON `lesson_comments` (`parent_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `lesson_comments_user_created_idx` ON `lesson_comments` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE TABLE `lesson_comment_mentions` (
  `comment_id` text NOT NULL REFERENCES `lesson_comments`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`comment_id`, `user_id`)
);
