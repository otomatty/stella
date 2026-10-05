ALTER TABLE submissions ADD COLUMN task_id text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN task_content_hash text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN task_kind text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN submission_mode text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN local_result text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN test_hashes text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN explanation text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN debugging_record text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN support_log text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN machine_check text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN task_snapshot text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN assessed_skills text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN review_task_content_hash text;
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN review_source text;
--> statement-breakpoint
CREATE INDEX submissions_task_attempt_idx ON submissions(tenant_id, student_id, task_id, attempt);
--> statement-breakpoint
CREATE TABLE task_revisions (task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, content_hash text NOT NULL, definition text NOT NULL, bundle text NOT NULL, created_at integer NOT NULL, PRIMARY KEY(task_id, content_hash));
--> statement-breakpoint
INSERT INTO task_revisions SELECT id, content_hash, definition, bundle, unixepoch() * 1000 FROM tasks;
--> statement-breakpoint
CREATE TABLE submission_files (submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE, path text NOT NULL, object_key text NOT NULL, sha256 text NOT NULL, bytes integer NOT NULL, PRIMARY KEY(submission_id, path));
--> statement-breakpoint
CREATE TABLE submission_reviews (id text PRIMARY KEY NOT NULL, submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE, task_content_hash text, source text NOT NULL CHECK(source IN ('ai','human')), reviewer_id text, verdict text NOT NULL CHECK(verdict IN ('pass','resubmit','fail')), notes text NOT NULL, created_at integer NOT NULL);
--> statement-breakpoint
CREATE INDEX submission_reviews_submission_idx ON submission_reviews(submission_id);
--> statement-breakpoint
CREATE TABLE skills (id text PRIMARY KEY NOT NULL, title text NOT NULL);
--> statement-breakpoint
CREATE TABLE skill_evidence (id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, skill_id text NOT NULL REFERENCES skills(id), level text NOT NULL CHECK(level IN ('supported','independent','retained')), submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE, assisted integer NOT NULL, created_at integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX skill_evidence_submission_skill_uq ON skill_evidence(submission_id, skill_id);
--> statement-breakpoint
CREATE INDEX skill_evidence_user_idx ON skill_evidence(user_id);
