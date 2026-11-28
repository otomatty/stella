CREATE TABLE `study_activity_hours` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  `date` text NOT NULL,
  `hour` integer NOT NULL,
  `watched_sec` real DEFAULT 0 NOT NULL,
  `completed_lessons` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT `study_activity_hours_hour_range` CHECK (`hour` BETWEEN 0 AND 23)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_activity_hours_user_date_hour_uq` ON `study_activity_hours` (`user_id`, `date`, `hour`);
--> statement-breakpoint
CREATE INDEX `study_activity_hours_date_idx` ON `study_activity_hours` (`date`);
