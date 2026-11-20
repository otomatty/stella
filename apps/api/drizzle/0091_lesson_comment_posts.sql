CREATE TABLE `lesson_comment_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `lesson_comment_posts_user_created_idx` ON `lesson_comment_posts` (`user_id`, `created_at`);
