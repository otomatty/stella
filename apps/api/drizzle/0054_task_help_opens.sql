-- ヒント・解答例・解説を開いた記録 (#36・07 §8)。素材ごと (ヒントは段ごと)・出した版 (課題の版と
-- 素材の版) ごとに最初の 1 回を残す。提出の支援記録に hint・solution を足す根拠になり、確認A・Bでは
-- 人に回す判定 (#33) にも使う。予備の類題 (private/variants/) とレビューの観点 (private/review.md) は
-- 受講者へ返さないので、item に現れない。合格後に開いたものも after_pass = 1 で残す。
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
  PRIMARY KEY (user_id, task_id, item, level, content_hash, private_hash)
);
--> statement-breakpoint
CREATE INDEX task_help_opens_task_idx ON task_help_opens(task_id);
--> statement-breakpoint
CREATE INDEX task_help_opens_tenant_idx ON task_help_opens(tenant_id);
--> statement-breakpoint
-- 課題の版ごとの、その版を配っていたときの非公開の素材の版。手元の版が古い受講者に、その版の
-- ヒント・解答例・解説を出すのに使う。seed がこの版を今の版として入れるたびに書き直す。
ALTER TABLE task_revisions ADD COLUMN private_hash text;
--> statement-breakpoint
-- 今の版だけは、今の素材 (task_private) と同じ中身の素材の版から埋められる。前の版は分からないので
-- null のまま (API は素材を出さず、受け取り直しを案内する)。
UPDATE task_revisions SET private_hash = (
  SELECT v.private_hash
  FROM tasks t
  JOIN task_private p ON p.task_id = t.id
  JOIN task_private_versions v ON v.task_id = t.id AND v.files = p.files
  WHERE t.id = task_revisions.task_id AND t.content_hash = task_revisions.content_hash
  LIMIT 1
);
