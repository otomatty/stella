-- =================================================================
-- enrollments / groups / group_members の RLS 改善
--
-- 1) パフォーマンス: 既存ポリシーは `public.current_tenant_id()` /
--    `public.current_role()` / `auth.uid()` を裸で呼んでおり、 Postgres は
--    これらを「行ごと」に評価する。 `(select fn())` で包むと InitPlan として
--    「ステートメントごとに 1 回」の評価になり、 行数が増えても RLS の
--    オーバーヘッドが一定になる (Supabase 公式の RLS performance recommendation)。
--    参照: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices
--
-- 2) 無限再帰の解消: 20260608010000 時点の groups / group_members ポリシーは
--    互いのテーブルをサブクエリしており (groups_read_member → group_members、
--    group_members_*_staff → groups)、 双方のポリシーが評価される経路で
--    `infinite recursion detected in policy` になる。 security definer ヘルパ
--    (is_group_member / group_tenant_id) 経由に変えて RLS の評価連鎖を断ち切る。
--
-- ポリシーの許可条件 (誰が何をできるか) は一切変えない。
--
-- 適用方法: Dashboard → SQL Editor で本ファイルを実行、 または `bun run supabase:push`。
-- 前提: 20260608010000_enrollments.sql が適用済みであること。
-- 補足: enrollments の補助インデックスは書き込みロックを避けるため本ファイルには
--       含めず、 supabase/manual/20260610_enrollments_tenant_course_idx.sql で
--       CONCURRENTLY 作成する (トランザクション内では実行できないため別手順)。
-- =================================================================

-- ---------------------------------------------------------------
-- 0. RLS 再帰を断ち切る security definer ヘルパ
-- ---------------------------------------------------------------
-- current_tenant_id() と同じ方式。 関数内のクエリは定義者権限で実行されるため
-- 参照先テーブルの RLS が評価されず、 ポリシー同士の循環参照にならない。

-- 呼び出しユーザーが指定グループのメンバーか (groups_read_member 用)。
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  )
$$;

-- グループの tenant_id を返す (group_members_*_staff 用)。 不在なら null。
create or replace function public.group_tenant_id(p_group_id uuid)
returns text language sql stable security definer set search_path = public as
$$ select tenant_id from public.groups where id = p_group_id $$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.group_tenant_id(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 1. enrollments
-- ---------------------------------------------------------------

drop policy if exists enrollments_read_self on public.enrollments;
create policy enrollments_read_self on public.enrollments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and tenant_id = (select public.current_tenant_id())
  );

drop policy if exists enrollments_read_staff on public.enrollments;
create policy enrollments_read_staff on public.enrollments
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_role()) in ('instructor','admin')
  );

drop policy if exists enrollments_write_staff on public.enrollments;
create policy enrollments_write_staff on public.enrollments
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_role()) in ('instructor','admin')
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_role()) in ('instructor','admin')
    -- FK だけでは防げない越テナント割当 (他テナントの user_id / course_id 指定) の遮断。
    -- exists 内の current_tenant_id() も InitPlan 化し、 PK 索引参照のみ行ごとに残す。
    -- (profiles / courses のポリシーは groups 系を参照しないため再帰しない)
    and exists (
      select 1 from public.profiles p
      where p.id = enrollments.user_id
        and p.tenant_id = (select public.current_tenant_id())
    )
    and exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id
        and c.tenant_id = (select public.current_tenant_id())
    )
  );

-- ---------------------------------------------------------------
-- 2. groups
-- ---------------------------------------------------------------

drop policy if exists groups_read_staff on public.groups;
create policy groups_read_staff on public.groups
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_role()) in ('instructor','admin')
  );

-- group_members への直接サブクエリをやめ、 security definer ヘルパで
-- group_members ポリシー (groups を参照する) への評価連鎖を断ち切る。
drop policy if exists groups_read_member on public.groups;
create policy groups_read_member on public.groups
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and public.is_group_member(id)
  );

drop policy if exists groups_write_staff on public.groups;
create policy groups_write_staff on public.groups
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_role()) in ('instructor','admin')
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_role()) in ('instructor','admin')
  );

-- ---------------------------------------------------------------
-- 3. group_members
-- ---------------------------------------------------------------
-- groups への直接サブクエリをやめ、 group_tenant_id() ヘルパで
-- groups ポリシー (group_members を参照する) への評価連鎖を断ち切る。

drop policy if exists group_members_read_staff on public.group_members;
create policy group_members_read_staff on public.group_members
  for select to authenticated
  using (
    (select public.current_role()) in ('instructor','admin')
    and public.group_tenant_id(group_id) = (select public.current_tenant_id())
  );

drop policy if exists group_members_read_self on public.group_members;
create policy group_members_read_self on public.group_members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists group_members_write_staff on public.group_members;
create policy group_members_write_staff on public.group_members
  for all to authenticated
  using (
    (select public.current_role()) in ('instructor','admin')
    and public.group_tenant_id(group_id) = (select public.current_tenant_id())
  )
  with check (
    (select public.current_role()) in ('instructor','admin')
    and public.group_tenant_id(group_id) = (select public.current_tenant_id())
    and exists (
      select 1 from public.profiles p
      where p.id = group_members.user_id
        and p.tenant_id = (select public.current_tenant_id())
    )
  );
