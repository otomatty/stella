ALTER TABLE submissions ADD COLUMN share_reflection integer NOT NULL DEFAULT 0
  CONSTRAINT submissions_share_reflection_check CHECK (share_reflection IN (0, 1));
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN reflection_hidden_at integer;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN reflection_hidden_by text REFERENCES profiles(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX submissions_shared_reflection_idx
  ON submissions(student_id, task_id, submitted_at, attempt, id)
  WHERE share_reflection = 1;
