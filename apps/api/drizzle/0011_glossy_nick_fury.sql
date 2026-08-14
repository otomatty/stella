CREATE TABLE `interview_prep_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`assigned_by` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_prep_assignments_tenant_profile_uq` ON `interview_prep_assignments` (`tenant_id`,`profile_id`);--> statement-breakpoint
CREATE TABLE `interview_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`no` integer NOT NULL,
	`category` text NOT NULL,
	`subcategory` text NOT NULL,
	`freq` text NOT NULL,
	`question` text NOT NULL,
	`time` text,
	`keywords` text,
	`intent` text,
	`answer_template` text,
	`deep1` text,
	`deep2` text,
	`deep3` text,
	`ng` text,
	`criteria` text,
	`is_reverse` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_questions_tenant_no_uq` ON `interview_questions` (`tenant_id`,`no`);