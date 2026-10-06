-- コードの復習: 同じ実装パターンの類題を、時間を空けて出す (#39・07 §7.2・03 §7)。
-- 類題は教材の tasks/<課題>/private/variants/<類題>/ に置き、seed が課題 (tasks の行) として入れる。
-- variant_of に親の課題 ID を持つ行が類題で、講座の課題一覧・レッスン・学習ペース・修了の判定には
-- 出さない。出題した受講者にだけ、配布・提出・ヘルプ・手元の実行記録の既存の流れで使わせる。
-- 親の課題が教材から外れても類題のままにしたいので、外部キーにしない (seed は課題の行を消さない)。
ALTER TABLE tasks ADD COLUMN variant_of text;
--> statement-breakpoint
CREATE INDEX tasks_variant_pattern_idx ON tasks(pattern) WHERE variant_of IS NOT NULL;
--> statement-breakpoint
-- 受講者ごとの類題の出題。1 行 = 受講者・パターンの 1 回の出題 (step は 1 から順)。
-- scheduled (出す日を決めた) → issued (類題を選んで出した) → passed (合格した)。出す日に未見の類題が
-- 在庫に無ければ out-of-stock (講師が在庫の不足を見る)、出した類題が教材から外れたら withdrawn。
-- 同じ受講者・パターンの同じ段を 2 度積まない・同じ類題を 2 度出さない・出したまま合格していない類題は
-- 受講者ごとに 1 つ (今日の類題は 1 問) を、一意制約で守る。
CREATE TABLE variant_reviews (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  step integer NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('day3', 'week1', 'week3', 'remedial', 'unseen')),
  anchor_at integer NOT NULL,
  due_on text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'issued', 'passed', 'out-of-stock', 'withdrawn')),
  variant_task_id text REFERENCES tasks(id) ON DELETE CASCADE,
  issued_at integer,
  passed_at integer,
  passed_assisted integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX variant_reviews_step_uq ON variant_reviews(tenant_id, user_id, pattern, step);
--> statement-breakpoint
CREATE UNIQUE INDEX variant_reviews_variant_uq ON variant_reviews(tenant_id, user_id, variant_task_id);
--> statement-breakpoint
CREATE UNIQUE INDEX variant_reviews_open_uq ON variant_reviews(tenant_id, user_id) WHERE status = 'issued';
--> statement-breakpoint
CREATE INDEX variant_reviews_user_idx ON variant_reviews(user_id);
--> statement-breakpoint
CREATE INDEX variant_reviews_variant_task_idx ON variant_reviews(variant_task_id);
--> statement-breakpoint
CREATE INDEX variant_reviews_tenant_status_idx ON variant_reviews(tenant_id, status);
