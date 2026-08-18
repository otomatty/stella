CREATE TABLE `enrollment_preset_items` (
	`id` text PRIMARY KEY NOT NULL,
	`preset_id` text NOT NULL,
	`course_id` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`due_offset_days` integer,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`preset_id`) REFERENCES `enrollment_presets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_preset_items_preset_course_uq` ON `enrollment_preset_items` (`preset_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `enrollment_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_presets_tenant_name_uq` ON `enrollment_presets` (`tenant_id`,`name`);--> statement-breakpoint
ALTER TABLE `enrollments` ADD `preset_id` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `preset_applied_at` integer;