-- =================================================================
-- enrollments の補助インデックス (手動適用 / CONCURRENTLY)
--
-- staff のテナント内一覧 (tenant → course / user で絞る) を index only scan に
-- 寄せるための複合インデックス。 通常の CREATE INDEX は作成完了まで対象テーブルの
-- INSERT/UPDATE/DELETE をブロックするため、 稼働中の本番では CONCURRENTLY で作る。
--
-- CREATE INDEX CONCURRENTLY はトランザクション内では実行できないため、
-- migrations/ (supabase db push はトランザクションで適用) には含めず、
-- 以下のいずれかで手動適用する:
--   - Dashboard → SQL Editor で本ファイルの SQL を単体で実行 (autocommit)
--   - psql 接続で実行
--
-- 冪等: IF NOT EXISTS 付きのため再実行しても安全。
-- 注意: CONCURRENTLY が途中失敗すると INVALID なインデックスが残ることがある。
--       その場合は `drop index if exists enrollments_tenant_course_idx;` してから再実行。
-- =================================================================

create index concurrently if not exists enrollments_tenant_course_idx
  on public.enrollments(tenant_id, course_id);
