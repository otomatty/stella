CREATE TABLE `lesson_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`path` text NOT NULL,
	`file_name` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`mime_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
