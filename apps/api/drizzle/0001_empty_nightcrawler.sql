CREATE TABLE `support_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL
);
