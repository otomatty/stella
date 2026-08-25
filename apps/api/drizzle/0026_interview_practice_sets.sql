ALTER TABLE `interview_progress` ADD `srs_ease` real DEFAULT 2.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_progress` ADD `srs_interval_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_progress` ADD `srs_reps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_progress` ADD `srs_due_date` text;--> statement-breakpoint
ALTER TABLE `interview_progress` ADD `last_result` text;--> statement-breakpoint
CREATE TABLE `interview_practice_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`date` text NOT NULL,
	`question_nos` text DEFAULT '[]' NOT NULL,
	`completed_nos` text DEFAULT '[]' NOT NULL,
	`confident_nos` text DEFAULT '[]' NOT NULL,
	`started_percent` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interview_practice_sets_tenant_profile_status_idx` ON `interview_practice_sets` (`tenant_id`,`profile_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `interview_practice_sets_active_uq` ON `interview_practice_sets` (`tenant_id`,`profile_id`) WHERE status = 'active';
