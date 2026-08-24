CREATE TABLE `interview_fix_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`question_no` integer NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interview_fix_notes_tenant_profile_q_idx` ON `interview_fix_notes` (`tenant_id`,`profile_id`,`question_no`);
