-- 受講者の育成 (#38)。手元の確認の要約と、サーバーが記録する課題ごとの支援。
-- 手元の確認は回数と時刻だけを持ち、コード・ファイル名・メッセージは持たない。
CREATE TABLE task_local_runs (
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  passed_runs integer NOT NULL DEFAULT 0,
  failed_runs integer NOT NULL DEFAULT 0,
  error_runs integer NOT NULL DEFAULT 0,
  failure_streak integer NOT NULL DEFAULT 0,
  streak_started_at integer,
  streak_alerted_at integer,
  last_outcome text NOT NULL CHECK (last_outcome IN ('passed', 'failed', 'error')),
  last_failed_steps text NOT NULL DEFAULT '[]',
  last_tests_passed integer,
  last_tests_failed integer,
  first_run_at integer NOT NULL,
  last_run_at integer NOT NULL,
  PRIMARY KEY (user_id, task_id)
);
--> statement-breakpoint
CREATE INDEX task_local_runs_task_id_idx ON task_local_runs(task_id);
--> statement-breakpoint
CREATE INDEX task_local_runs_streak_idx ON task_local_runs(failure_streak);
--> statement-breakpoint
-- kind は CHECK で縛らない。ヒント・解答の表示 (#36) などの種類はアプリ側の一覧に足す。
CREATE TABLE task_support_events (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail text,
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX task_support_events_user_task_idx ON task_support_events(user_id, task_id, created_at);
--> statement-breakpoint
CREATE INDEX task_support_events_task_id_idx ON task_support_events(task_id);
--> statement-breakpoint
-- つまずきの検知が直近の確認Bの判定を15分ごとに引く。提出の全件を読まない。
CREATE INDEX submissions_task_kind_reviewed_idx ON submissions(task_kind, reviewed_at);
