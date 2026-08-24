CREATE TABLE `skill_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`r2_key` text,
	`sheet` text DEFAULT '{"sections":{"basic":{},"skills":[],"projects":[],"certifications":[],"self_pr":""}}' NOT NULL,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_sheets_tenant_profile_uq` ON `skill_sheets` (`tenant_id`,`profile_id`);
