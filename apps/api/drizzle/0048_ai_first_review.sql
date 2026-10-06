-- 提出の AI 一次レビュー (Issue #33、docs/curriculum/07 §6.3・§6.6・§6.7)。
-- 提出ごとの AI の状態。queued = AI が確認中、confirmed = AI で確定、escalated = 人に回した、
-- superseded = 同じ課題の新しい提出で置き換えた。旧形式の提出は NULL のまま。
ALTER TABLE submissions ADD COLUMN ai_review_status text;
--> statement-breakpoint
-- AI レビューの待ち行列。提出直後 (waitUntil) と cron の両方が、リースを取ってから 1 件ずつ処理する。
-- leased_at は 60 秒あたりの呼び出し回数の上限 (AI エンドポイントと同じ 20 回) の数え方にも使う。
CREATE TABLE ai_review_jobs (
  submission_id text PRIMARY KEY NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','done','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at integer NOT NULL,
  lease_id text,
  leased_at integer,
  lease_until integer,
  last_error text,
  enqueued_at integer NOT NULL,
  finished_at integer
);
--> statement-breakpoint
CREATE INDEX ai_review_jobs_due_idx ON ai_review_jobs(state, next_attempt_at);
--> statement-breakpoint
CREATE INDEX ai_review_jobs_leased_idx ON ai_review_jobs(leased_at);
--> statement-breakpoint
-- AI の判定は人の判定 (submission_reviews) と別に残す。受講者向けの API は、AI で確定した
-- 提出の learner_reply だけを返す。人に回した提出の所見・理由は staff にだけ返す。
CREATE TABLE ai_reviews (
  id text PRIMARY KEY NOT NULL,
  submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  task_id text NOT NULL,
  task_content_hash text NOT NULL,
  task_kind text NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('confirmed','escalated')),
  route_reasons text NOT NULL DEFAULT '[]',
  confidence text CHECK(confidence IN ('high','medium','low')),
  reported_confidence text CHECK(reported_confidence IN ('high','medium','low')),
  proposed_verdict text CHECK(proposed_verdict IN ('pass','resubmit')),
  rubric_results text NOT NULL DEFAULT '[]',
  findings text NOT NULL DEFAULT '[]',
  draft_reply text,
  learner_reply text,
  leak_check text,
  applied_rules text NOT NULL DEFAULT '[]',
  rule_set_hash text,
  failure text,
  model text,
  prompt_version text NOT NULL,
  threshold_version text NOT NULL,
  usage text,
  disposition text CHECK(disposition IN ('applied','superseded')),
  applied_at integer,
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX ai_reviews_submission_idx ON ai_reviews(submission_id, created_at);
--> statement-breakpoint
CREATE INDEX ai_reviews_tenant_idx ON ai_reviews(tenant_id, created_at);
--> statement-breakpoint
-- 非公開の素材 (解答例・観点とよくある違反) を、素材そのものの版 (private_hash) ごとに残す。
-- 課題の版 (content_hash) は非公開の素材を含まず、task_private は seed のたびに最新で上書きされる。
-- 行は追記だけで書き換えない。提出は受け付けた時点の素材の版を task_private_hash に記録し、
-- AI のレビューはその版を読む。
CREATE TABLE task_private_versions (
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  private_hash text NOT NULL,
  files text NOT NULL,
  created_at integer NOT NULL,
  PRIMARY KEY (task_id, private_hash)
);
--> statement-breakpoint
ALTER TABLE submissions ADD COLUMN task_private_hash text;
--> statement-breakpoint
-- コーディング規則の正本 (packages/content/coding-rules.md と講座の追加分) を seed で入れる。
CREATE TABLE coding_rules (
  id text PRIMARY KEY NOT NULL,
  scope text NOT NULL,
  position integer NOT NULL,
  title text NOT NULL,
  statement text NOT NULL,
  applies_to text NOT NULL,
  introduced_in text NOT NULL,
  exception text,
  content_hash text NOT NULL
);
--> statement-breakpoint
CREATE INDEX coding_rules_scope_idx ON coding_rules(scope, position);
--> statement-breakpoint
-- 導入前に受け付けた未判定の提出。同じ課題の新しい提出がある試行は置き換え済み、
-- 機械の照合が一致して確認A・Bの支援も無いものは AI の確認待ち、それ以外は人に回す。
UPDATE submissions SET ai_review_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM submissions newer
    WHERE newer.tenant_id = submissions.tenant_id AND newer.student_id = submissions.student_id
      AND newer.task_id = submissions.task_id AND newer.attempt > submissions.attempt
  ) THEN 'superseded'
  WHEN json_extract(machine_check, '$.matched') = 1
    AND NOT (task_kind IN ('assessment-a','assessment-b') AND json_array_length(coalesce(support_log, '[]')) > 0)
    THEN 'queued'
  ELSE 'escalated'
END
WHERE task_id IS NOT NULL AND verdict IS NULL;
--> statement-breakpoint
-- 人に回したものも AI の下書きを作るので、置き換え済み以外は待ち行列に積む。
INSERT INTO ai_review_jobs (submission_id, tenant_id, state, attempts, next_attempt_at, enqueued_at)
SELECT id, tenant_id, 'queued', 0, unixepoch() * 1000, unixepoch() * 1000
FROM submissions WHERE task_id IS NOT NULL AND verdict IS NULL AND ai_review_status IN ('queued','escalated');
--> statement-breakpoint
-- 確認A・Bの支援付きで、まだ「AI が確認中」に見えている課題の状態を「講師の確認待ち」にそろえる。
UPDATE task_progress SET status = 'instructor-pending'
WHERE status = 'submitted' AND EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.student_id = task_progress.user_id AND s.task_id = task_progress.task_id
    AND s.ai_review_status = 'escalated'
    AND s.attempt = (
      SELECT max(m.attempt) FROM submissions m
      WHERE m.tenant_id = s.tenant_id AND m.student_id = s.student_id AND m.task_id = s.task_id
    )
);
--> statement-breakpoint
-- 導入前の未判定の提出のうち、課題の版が今の版と同じものだけ、今の task_private を素材の版とみなす
-- (SQL では内容ハッシュを計算できないので、版の名前は migrated-<課題の版> にする)。
-- 版が違う提出は素材が分からないので空のままにし、AI は判定せずに人に回す。
INSERT OR IGNORE INTO task_private_versions (task_id, private_hash, files, created_at)
SELECT t.id, 'migrated-' || t.content_hash, p.files, unixepoch() * 1000
FROM tasks t JOIN task_private p ON p.task_id = t.id
WHERE EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.task_id = t.id AND s.task_content_hash = t.content_hash AND s.verdict IS NULL
);
--> statement-breakpoint
UPDATE submissions SET task_private_hash = 'migrated-' || task_content_hash
WHERE task_id IS NOT NULL AND verdict IS NULL AND EXISTS (
  SELECT 1 FROM tasks t JOIN task_private p ON p.task_id = t.id
  WHERE t.id = submissions.task_id AND t.content_hash = submissions.task_content_hash
);
