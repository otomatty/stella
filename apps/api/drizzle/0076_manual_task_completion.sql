ALTER TABLE task_problem_results ADD COLUMN source TEXT NOT NULL DEFAULT 'tests' CHECK (source IN ('tests', 'manual'));
--> statement-breakpoint
ALTER TABLE task_problem_results ADD COLUMN manual_reason TEXT;
--> statement-breakpoint
ALTER TABLE task_problem_results ADD COLUMN manual_by TEXT;
--> statement-breakpoint
ALTER TABLE task_problem_results ADD COLUMN manual_at INTEGER;
