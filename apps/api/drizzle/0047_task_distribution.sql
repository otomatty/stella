-- 課題の配布 (#31)。課題文のレッスンから課題を開くための参照と、固定した開始点の配布・利用記録。
-- 課題文のレッスン (seed が課題ごとに作る text レッスン)。Web はこれで「VS Code で開く」を出す。
ALTER TABLE tasks ADD COLUMN lesson_id text;
--> statement-breakpoint
-- 固定した開始点は通常の配布 (tasks.bundle) と分けて持つ。前の課題の動く実装を含むので、
-- 受講者が求めたときだけ返し、使ったことを記録する。private/ の素材はここに入れない。
CREATE TABLE task_fixed_starts (
  task_id text PRIMARY KEY NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  files text NOT NULL
);
--> statement-breakpoint
CREATE TABLE task_fixed_start_uses (
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  used_at integer NOT NULL,
  PRIMARY KEY (user_id, task_id, content_hash)
);
--> statement-breakpoint
CREATE INDEX task_fixed_start_uses_task_idx ON task_fixed_start_uses(task_id);
--> statement-breakpoint
CREATE INDEX task_fixed_start_uses_tenant_idx ON task_fixed_start_uses(tenant_id);
