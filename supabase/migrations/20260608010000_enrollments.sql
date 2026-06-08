-- =================================================================
-- 受講登録 (Enrollment) 基盤 (Issue #20 / P0)
--
-- 「誰がどのコースを、 いつまでに受講するか」 を表現する基盤。
-- これまでは「テナント内の published コースは全員に見える」だけで、
-- 受講者ごとの割当 / 期限 / 必須・任意の区別ができなかった。
--
-- 設計方針:
--   - 割当 (insert/update/delete) は instructor/admin が RLS 配下で直接行う。
--     auth.users を触らないため user-management のような service-role API は不要。
--   - 受講者は自分の enrollment のみ read。 status / due_at の変更は staff のみ。
--   - groups / group_members は将来のコホート割当のための足場として用意する
--     (本 migration では UI から未使用)。
--
-- 適用方法: Dashboard → SQL Editor で本ファイルを実行、 または `bun run supabase:push`。
-- 前提: 20260519000000_cms_foundation.sql (tenants / profiles / courses /
--       current_tenant_id() / current_role()) が適用済みであること。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. enrollments テーブル
-- ---------------------------------------------------------------
-- user_id / course_id は FK で実在を担保しつつ、 RLS の with check で
-- 「呼び出し元と同テナントの行か」 を別途検証する (越テナント割当の防止)。

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  -- 割当者 (staff)。 退職等で profiles が消えても enrollment は残す。
  assigned_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  required boolean not null default true,
  status text not null check (status in ('active','completed','expired')) default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  -- 同一受講者 × コースの二重登録を防ぐ (再割当は upsert で更新)。
  unique (user_id, course_id)
);

-- 受講者本人のロード用 / staff の集計用
create index if not exists enrollments_user_idx
  on public.enrollments(user_id);
create index if not exists enrollments_tenant_idx
  on public.enrollments(tenant_id);
create index if not exists enrollments_course_idx
  on public.enrollments(course_id);

-- ---------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------

alter table public.enrollments enable row level security;

-- 受講者本人: 自分の enrollment のみ read (無効化されると current_tenant_id() が null)。
drop policy if exists enrollments_read_self on public.enrollments;
create policy enrollments_read_self on public.enrollments
  for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = public.current_tenant_id()
  );

-- instructor / admin: 同テナントの enrollment を全件 read。
drop policy if exists enrollments_read_staff on public.enrollments;
create policy enrollments_read_staff on public.enrollments
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- instructor / admin: 同テナントの enrollment を insert / update / delete。
-- with check で対象 user / course が共に同テナントであることを要求し、
-- FK だけでは防げない越テナント割当 (他テナントの user_id / course_id 指定) を遮断する。
drop policy if exists enrollments_write_staff on public.enrollments;
create policy enrollments_write_staff on public.enrollments
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.profiles p
      where p.id = enrollments.user_id
        and p.tenant_id = public.current_tenant_id()
    )
    and exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id
        and c.tenant_id = public.current_tenant_id()
    )
  );

-- ---------------------------------------------------------------
-- 3. グループ / コホート (将来枠 — 本 migration では UI 未使用)
-- ---------------------------------------------------------------
-- 「クラス単位でまとめて割当」 を後続で実装するための足場。
-- スキーマと RLS だけ先に確定させ、 割当ロジック (group → enrollments 展開) は別 issue。

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists groups_tenant_idx on public.groups(tenant_id);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- groups: staff は同テナントを read/write。 受講者は自分が所属するグループのみ read。
drop policy if exists groups_read_staff on public.groups;
create policy groups_read_staff on public.groups
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

drop policy if exists groups_read_member on public.groups;
create policy groups_read_member on public.groups
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

drop policy if exists groups_write_staff on public.groups;
create policy groups_write_staff on public.groups
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- group_members: staff は同テナントのグループに対し read/write。 受講者は自分の所属のみ read。
drop policy if exists group_members_read_staff on public.group_members;
create policy group_members_read_staff on public.group_members
  for select to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists group_members_read_self on public.group_members;
create policy group_members_read_self on public.group_members
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists group_members_write_staff on public.group_members;
create policy group_members_write_staff on public.group_members
  for all to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.tenant_id = public.current_tenant_id()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = group_members.user_id
        and p.tenant_id = public.current_tenant_id()
    )
  );
