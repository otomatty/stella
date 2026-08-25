ALTER TABLE `submissions` ADD `grading_summary` text;--> statement-breakpoint
CREATE INDEX `submissions_tenant_student_assignment_idx` ON `submissions` (`tenant_id`,`student_id`,`assignment_id`);
