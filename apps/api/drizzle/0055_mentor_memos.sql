-- 週次の育成メモ (#38・07 §6.5)。受講者 1 人・週 1 枚。講師向けで、受講者本人の API には返さない。
-- 15分の cron が前の週の行を積み (state = queued)、数件ずつ材料を集めて AI に書かせる (ready)。
-- AI が使えないときも機械的な要約で ready にする。材料を集められないまま試行の上限に達したら
-- failed で終える (last_error を残す)。受講者・週で一意なので、何度積んでも 1 枚。
CREATE TABLE mentor_memos (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  learner_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start text NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'ready', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at integer NOT NULL,
  lease_id text,
  lease_until integer,
  last_error text,
  source text CHECK (source IN ('ai', 'fallback')),
  summary text,
  observations text NOT NULL DEFAULT '[]',
  suggested_action text CHECK (suggested_action IN ('message', 'pace', 'watch')),
  action_reason text,
  message_draft text,
  material text,
  failure text,
  model text,
  prompt_version text,
  usage text,
  generated_at integer,
  actions text NOT NULL DEFAULT '[]',
  handled_at integer,
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX mentor_memos_learner_week_uq ON mentor_memos(learner_id, week_start);
--> statement-breakpoint
CREATE INDEX mentor_memos_due_idx ON mentor_memos(state, next_attempt_at);
--> statement-breakpoint
CREATE INDEX mentor_memos_tenant_week_idx ON mentor_memos(tenant_id, week_start);
--> statement-breakpoint
-- つまずきの検知 (人に回る提出が続く) が、直近に提出へ当てた AI の結果を15分ごとに引く。
CREATE INDEX ai_reviews_applied_idx ON ai_reviews(applied_at);
