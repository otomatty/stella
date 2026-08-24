CREATE TABLE `interview_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`question_no` integer NOT NULL,
	`status` text DEFAULT 'read' NOT NULL,
	`practiced_count` integer DEFAULT 0 NOT NULL,
	`last_practiced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_progress_tenant_profile_q_uq` ON `interview_progress` (`tenant_id`,`profile_id`,`question_no`);
