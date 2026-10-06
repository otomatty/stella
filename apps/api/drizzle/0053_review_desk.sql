-- 講師のレビュー画面 (Issue #34、docs/curriculum/07 §6.3・§6.4)。
-- 新しい表を足すだけで、既存の行・列は変えない。
--
-- AI が合格にした提出を、人が好きなときに確認した記録 (期間は限らない)。
-- result: confirmed = 確認済みにした、commented = 判定を変えずにコメントを足した (受講者へ通知)、
-- overturned = 再提出に覆した (その提出の合格とスキルの証拠を取り消し、理由を受講者へ通知)。
-- 覆したあとも記録は残す。しきい値の月次見直し (練習の「中」を覆した割合) に使う。
CREATE TABLE submission_checks (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  ai_review_id text REFERENCES ai_reviews(id) ON DELETE SET NULL,
  reviewer_id text REFERENCES profiles(id) ON DELETE SET NULL,
  result text NOT NULL CHECK(result IN ('confirmed','commented','overturned')),
  comment text NOT NULL DEFAULT '',
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX submission_checks_submission_idx ON submission_checks(submission_id, created_at);
--> statement-breakpoint
CREATE INDEX submission_checks_tenant_idx ON submission_checks(tenant_id, created_at);
--> statement-breakpoint
CREATE INDEX submission_checks_reviewer_idx ON submission_checks(reviewer_id);
--> statement-breakpoint
CREATE INDEX submission_checks_ai_review_idx ON submission_checks(ai_review_id);
--> statement-breakpoint
-- 人が AI の判定を覆した記録。ルーブリックと AI への指示の改善に使う (07 §6.4 の 7)。
-- source: post-check = AI が合格にした提出を事後確認で覆した、
-- final-review = 人に回した提出で、AI の判定案と違う判定 (合格か否か) にした。
-- AI の所見・ルーブリックの結果は ai_reviews に残っているので、ここには写さない。
CREATE TABLE ai_review_overrides (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  ai_review_id text NOT NULL REFERENCES ai_reviews(id) ON DELETE CASCADE,
  source text NOT NULL CHECK(source IN ('post-check','final-review')),
  ai_verdict text NOT NULL CHECK(ai_verdict IN ('pass','resubmit')),
  human_verdict text NOT NULL CHECK(human_verdict IN ('pass','resubmit','fail')),
  reviewer_id text REFERENCES profiles(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX ai_review_overrides_tenant_idx ON ai_review_overrides(tenant_id, created_at);
--> statement-breakpoint
CREATE INDEX ai_review_overrides_submission_idx ON ai_review_overrides(submission_id);
--> statement-breakpoint
CREATE INDEX ai_review_overrides_ai_review_idx ON ai_review_overrides(ai_review_id);
--> statement-breakpoint
CREATE INDEX ai_review_overrides_reviewer_idx ON ai_review_overrides(reviewer_id);
--> statement-breakpoint
-- コメント集。課題のパターン (tasks.pattern) ごとに、よくある違反と定型コメントを持つ。
-- stage_id が null ならテナントの全講座、pattern が null なら講座の全パターンに出す。
-- rule_id はコーディング規則の ID (coding_rules は seed で入れ直すので外部キーにしない)。
CREATE TABLE review_comment_templates (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage_id text REFERENCES stages(id) ON DELETE CASCADE,
  pattern text,
  rule_id text,
  violation text NOT NULL,
  body text NOT NULL,
  created_by text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX review_comment_templates_scope_idx ON review_comment_templates(tenant_id, stage_id, pattern);
--> statement-breakpoint
CREATE INDEX review_comment_templates_stage_idx ON review_comment_templates(stage_id);
--> statement-breakpoint
CREATE INDEX review_comment_templates_creator_idx ON review_comment_templates(created_by);
