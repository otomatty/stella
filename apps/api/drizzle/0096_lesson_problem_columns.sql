-- 問題のレッスンと課題・問題の対応を lessons の列へ移す。
-- task_problem_steps は本番の古い API がまだ読むので、この migration では落とさない。
ALTER TABLE `lessons` ADD `problem_task_id` text;
--> statement-breakpoint
ALTER TABLE `lessons` ADD `problem_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_problem_uq` ON `lessons` (`problem_task_id`, `problem_id`) WHERE `problem_task_id` IS NOT NULL AND `problem_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `lessons`
SET `problem_task_id` = `task_problem_steps`.`task_id`,
    `problem_id` = `task_problem_steps`.`problem_id`
FROM `task_problem_steps`
WHERE `lessons`.`id` = `task_problem_steps`.`step_lesson_id`;
