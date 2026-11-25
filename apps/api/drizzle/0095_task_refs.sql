CREATE TABLE `task_refs` (
  `task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  `problem_id` text NOT NULL,
  `position` integer NOT NULL,
  `lesson_id` text NOT NULL REFERENCES `lessons`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`task_id`, `problem_id`, `position`)
);
--> statement-breakpoint
CREATE INDEX `task_refs_lesson_idx` ON `task_refs` (`lesson_id`);
