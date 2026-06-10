-- =================================================================
-- 組織マスタ (orgs) 管理 (Issue #29 / P2)
--
-- B2B (顧客企業・学校) を表す tenants を「運用可能なマスタ」 にする。 既存の
-- tenants (id / name / subtitle / icon / active_count) に契約情報を持たせ、
-- 管理者が一覧・作成・編集できるようにする。
--
-- 書き込み経路:
--   tenants の RLS は read のみ (認証済みは全件 read 可、 書き込みポリシー無し)。
--   組織の作成・編集はテナント横断の特権操作のため、 user-management と同様に
--   service-role 経由の管理 API (apps/api/.../organizations.ts) でのみ行う。
--   service-role は RLS を迂回するため、 本 migration では RLS を変更しない。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor で本ファイルを実行、
--           または `bun run supabase:push`。
-- 前提: 20260519000000_cms_foundation.sql (tenants / set_updated_at()) が
--       適用済みであること。
-- =================================================================

-- ---------------------------------------------------------------
-- 1. tenants に契約情報を追加
-- ---------------------------------------------------------------
-- 既存行に安全に追加できるよう defensive (add column if not exists)。
-- plan_seats は席数上限 (null = 無制限)。 contract_* は契約期間。
-- active は契約中フラグ (解約済みの組織を一覧で区別する)。

alter table public.tenants
  add column if not exists contact_name text;
alter table public.tenants
  add column if not exists contact_email text;
alter table public.tenants
  add column if not exists plan_seats int;
alter table public.tenants
  add column if not exists contract_start date;
alter table public.tenants
  add column if not exists contract_end date;
alter table public.tenants
  add column if not exists active boolean not null default true;
alter table public.tenants
  add column if not exists updated_at timestamptz not null default now();

-- 席数は非負を要求する (UI 側でも検証するが DB でも担保)。
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_plan_seats_nonneg'
  ) then
    alter table public.tenants
      add constraint tenants_plan_seats_nonneg
      check (plan_seats is null or plan_seats >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2. updated_at トリガー
-- ---------------------------------------------------------------

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();
