-- 類題の合格を人が覆したときに、出題の記録を「出した」に戻す (#39)。戻した出題は、受講者が
-- やり直して合格するまで開いたままにする。そのあいだに別のパターンの類題を出していることが
-- あるので、「出したまま合格していない類題は受講者ごとに 1 つ」の一意制約からは、戻した出題
-- (reopened_at のある行) を外す。新しく出す類題は、戻した出題を含めて開いた出題があれば出さない
-- (lib/variant-reviews.ts)。
ALTER TABLE variant_reviews ADD COLUMN reopened_at integer;
--> statement-breakpoint
DROP INDEX variant_reviews_open_uq;
--> statement-breakpoint
CREATE UNIQUE INDEX variant_reviews_open_uq ON variant_reviews(tenant_id, user_id) WHERE status = 'issued' AND reopened_at IS NULL;
