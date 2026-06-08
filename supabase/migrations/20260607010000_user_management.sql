-- =================================================================
-- ユーザー管理の実データ化と招待フロー (Issue #22)
--
-- 管理者が SQL Editor を触らずにユーザーを一覧 / 招待 / ロール変更 / 無効化
-- できるようにするための DB 側の変更。
--
-- 設計方針:
--   - 一覧 (select): instructor/admin が同テナントを read 可能 (既存 + 本ファイルで再確認)。
--   - 招待 / ロール変更 / 無効化 (write): service-role 経由の API (apps/api) で実施する。
--     特権操作を 1 箇所に集約し、 クライアントからの直接 write は許可しない。
--   - 自己昇格防止: 一般ユーザー (authenticated) による role / tenant_id / disabled の
--     自己変更は BEFORE UPDATE トリガーで確実にブロックする (RLS の with check 自己サブクエリ
--     は更新後の値を参照し得て信頼できないため、 トリガー方式に変更)。
--   - 無効化の即時化: current_role() / current_tenant_id() が disabled なユーザーに対して
--     null を返すようにし、 未失効 JWT を持つ無効化ユーザーを RLS レベルでも遮断する。
--
-- 適用方法: Dashboard → SQL Editor で本ファイルを実行、 または `bun run supabase:push`。
-- =================================================================

-- ---------------------------------------------------------------
-- 1. 無効化フラグ
-- ---------------------------------------------------------------
-- UI 一覧で「無効」状態を表示できるよう profiles に列を持たせる。
-- 実際のログイン遮断は API 側で auth.users を ban しつつ、 RLS でも下記ヘルパで遮断する。
alter table public.profiles
  add column if not exists disabled boolean not null default false;

-- ---------------------------------------------------------------
-- 2. RLS ヘルパで無効化ユーザーをゲートする
-- ---------------------------------------------------------------
-- disabled = true のユーザーは role / tenant が null になり、 これらを参照する全ての
-- テナント境界ポリシー (courses / sections / lessons / assignments / submissions など) で
-- アクセスが拒否される。 未失効の JWT を保持していても即座に遮断される。
create or replace function public.current_tenant_id()
returns text language sql stable security definer set search_path = public as
$$ select tenant_id from public.profiles where id = auth.uid() and disabled = false $$;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and disabled = false $$;

grant execute on function public.current_tenant_id() to authenticated, anon;
grant execute on function public.current_role() to authenticated, anon;

-- ---------------------------------------------------------------
-- 3. 重要カラムの自己変更を禁止するトリガー
-- ---------------------------------------------------------------
-- service-role 経由 (auth.uid() が null) の管理 API のみが role / tenant_id / disabled を
-- 変更できる。 認証済み一般ユーザーによる更新ではこれらの列を強制的に元の値へ戻す。
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.role := old.role;
    new.tenant_id := old.tenant_id;
    new.disabled := old.disabled;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------
-- 4. profiles の RLS ポリシー再定義
-- ---------------------------------------------------------------

-- select: 自分自身 (無効化されていない場合) または同テナントの instructor/admin。
-- admin/instructor 側は無効化ユーザーも一覧に含められるよう、 行の disabled では絞らない。
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    (id = auth.uid() and disabled = false)
    or (public.current_role() in ('instructor','admin') and tenant_id = public.current_tenant_id())
  );

-- update: 自分自身かつ無効化されていない行のみ。 role / tenant_id / disabled の変更は
-- 上のトリガーで無効化される。 disabled = false 条件で、 無効化済みユーザーが未失効 JWT で
-- 表示名等を書き換えること (onboarding の ensureProfile upsert 経路) も遮断する。
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() and disabled = false)
  with check (id = auth.uid() and disabled = false);

-- ---------------------------------------------------------------
-- 5. submissions の RLS を disabled-aware ヘルパへ作り直す
-- ---------------------------------------------------------------
-- submissions (20260525000000) のポリシーは profiles を直接サブクエリしており、
-- current_tenant_id() / current_role() を通らないため無効化ゲートが効かない。
-- helper ベースに作り直し、 無効化ユーザー (helper が null を返す) を即時遮断する。
-- submissions テーブルが未作成の環境でも壊れないよう存在チェックで囲う。
do $$
begin
  if to_regclass('public.submissions') is null then
    return;
  end if;

  -- 受講者: 自分の提出のみ insert / select (無効化されると current_tenant_id() が null)
  drop policy if exists submissions_student_insert on public.submissions;
  create policy submissions_student_insert on public.submissions
    for insert to authenticated
    with check (
      student_id = auth.uid()
      and tenant_id = public.current_tenant_id()
    );

  drop policy if exists submissions_student_select on public.submissions;
  create policy submissions_student_select on public.submissions
    for select to authenticated
    using (
      student_id = auth.uid()
      and public.current_tenant_id() is not null
    );

  -- 講師 / 管理者: テナント内の提出物を閲覧・更新
  drop policy if exists submissions_instructor_select on public.submissions;
  create policy submissions_instructor_select on public.submissions
    for select to authenticated
    using (
      tenant_id = public.current_tenant_id()
      and public.current_role() in ('instructor','admin')
    );

  drop policy if exists submissions_instructor_update on public.submissions;
  create policy submissions_instructor_update on public.submissions
    for update to authenticated
    using (
      tenant_id = public.current_tenant_id()
      and public.current_role() in ('instructor','admin')
    )
    with check (
      tenant_id = public.current_tenant_id()
      and public.current_role() in ('instructor','admin')
      and (
        student_id is null
        or exists (
          select 1 from public.profiles p
          where p.id = student_id
            and p.tenant_id = public.current_tenant_id()
        )
      )
    );
end $$;
