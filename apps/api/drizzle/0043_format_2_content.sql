ALTER TABLE stages ADD COLUMN format integer NOT NULL DEFAULT 1 CHECK (format IN (1, 2));
--> statement-breakpoint
ALTER TABLE stages ADD COLUMN environment text;
--> statement-breakpoint
ALTER TABLE quizzes ADD COLUMN source text NOT NULL DEFAULT 'practice' CHECK (source IN ('practice', 'knowledge'));
--> statement-breakpoint
ALTER TABLE quiz_questions ADD COLUMN skills text NOT NULL DEFAULT '[]';
--> statement-breakpoint
CREATE TABLE content_units (
  section_id text PRIMARY KEY NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  planned_hours real NOT NULL,
  skills text NOT NULL,
  reuses text NOT NULL,
  "references" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE tasks (
  id text PRIMARY KEY NOT NULL,
  section_id text NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL,
  pattern text NOT NULL,
  skills text NOT NULL,
  estimated_minutes real NOT NULL,
  "order" integer NOT NULL,
  content_hash text NOT NULL,
  definition text NOT NULL,
  bundle text NOT NULL,
  active integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX tasks_section_id_idx ON tasks(section_id);
--> statement-breakpoint
CREATE TABLE task_private (
  task_id text PRIMARY KEY NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  files text NOT NULL
);
--> statement-breakpoint
CREATE TABLE task_progress (
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'local-passed', 'submitted', 'ai-passed', 'instructor-pending', 'resubmit', 'passed')),
  content_hash text NOT NULL,
  updated_at integer NOT NULL,
  PRIMARY KEY (user_id, task_id)
);
--> statement-breakpoint
CREATE INDEX task_progress_task_id_idx ON task_progress(task_id);
