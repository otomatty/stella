CREATE TABLE `task_problem_steps` (
  `task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  `problem_id` text NOT NULL,
  `step_lesson_id` text NOT NULL REFERENCES `lessons`(`id`) ON DELETE CASCADE,
  `after_lesson_id` text NOT NULL REFERENCES `lessons`(`id`) ON DELETE CASCADE,
  `position` integer NOT NULL,
  PRIMARY KEY (`task_id`, `problem_id`)
);
--> statement-breakpoint
CREATE INDEX `task_problem_steps_step_lesson_idx` ON `task_problem_steps` (`step_lesson_id`);
--> statement-breakpoint
CREATE INDEX `task_problem_steps_after_lesson_idx` ON `task_problem_steps` (`after_lesson_id`);
