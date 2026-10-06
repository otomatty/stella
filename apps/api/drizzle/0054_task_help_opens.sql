-- ヒント・解答例・解説を開いた記録 (#36・07 §8)。素材ごと (ヒントは段ごと) に最初の 1 回を残す。
-- 提出の支援記録に hint・solution を足す根拠になり、確認A・Bでは人に回す判定 (#33) にも使う。
-- 予備の類題 (private/variants/) とレビューの観点 (private/review.md) は受講者へ返さないので、
-- item に現れない。合格後に開いたものも after_pass = 1 で残す (後の提出の支援には数える)。
CREATE TABLE task_help_opens (
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  item text NOT NULL,
  level integer DEFAULT 0 NOT NULL,
  content_hash text NOT NULL,
  private_hash text NOT NULL,
  after_pass integer DEFAULT 0 NOT NULL,
  opened_at integer NOT NULL,
  PRIMARY KEY (user_id, task_id, item, level)
);
--> statement-breakpoint
CREATE INDEX task_help_opens_task_idx ON task_help_opens(task_id);
--> statement-breakpoint
CREATE INDEX task_help_opens_tenant_idx ON task_help_opens(tenant_id);
