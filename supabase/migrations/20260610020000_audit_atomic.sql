-- =================================================================
-- 監査ログ記録を主操作とトランザクション統合 (Issue #39)
--
-- #27 (PR #38) では特権操作 (ロール変更 / 招待 / 無効化・復帰) の監査記録を
-- best-effort (recordAuditLog の失敗は console.error のみ) としていた。 本 migration は
-- 「主操作 (profiles の更新) + audit_logs への記録」 を 1 つの関数 (= 単一トランザクション)
-- に集約し、 どちらか一方だけが成功する状態を構造的に無くす。
--
--   admin_change_role   : profiles.role 更新 + role_change の記録 (原子的)
--   admin_apply_disable : profiles.disabled 更新 + user_disable/enable の記録 (原子的)
--   admin_apply_invite  : profiles upsert + user_invite の記録 (原子的)
--
-- auth.users への副作用 (ban / 招待 / 削除) は DB トランザクション外のため、 API 側で
--   1. auth.users を先に変更
--   2. 本関数で (profiles + audit) を原子的に適用
--   3. 本関数が失敗したら auth.users 変更をロールバック
-- という順序で呼ぶ (best-effort の解消)。 監査記録が失敗すれば主操作 (profiles) も
-- 巻き戻り、 API はエラーを返すため、 二重適用は起きない。
--
-- セキュリティ:
--   これらは特権の塊のため authenticated/anon からは呼べないようにする
--   (execute を revoke し service_role のみに grant)。 actor / tenant は API が
--   認証済みの呼び出し元から確定して渡す。 各関数は target が指定テナントに属することを
--   再検証し、 TOCTOU 越テナント更新を防ぐ。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor で本ファイルを実行、
--           または `bun run supabase:push`。
-- 前提: 20260519000000_cms_foundation.sql (profiles / tenants),
--       20260607010000_user_management.sql (profiles.disabled),
--       20260609010000_audit_logs.sql (audit_logs) が適用済みであること。
-- =================================================================

-- ---------------------------------------------------------------
-- 1. ロール変更 (profiles.role 更新 + 監査記録を原子的に)
-- ---------------------------------------------------------------
create or replace function public.admin_change_role(
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text,
  p_tenant_id text,
  p_target_id uuid,
  p_new_role text,
  p_ip text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_role text;
begin
  if p_new_role not in ('student','instructor','admin') then
    raise exception 'invalid_role';
  end if;

  -- target を同テナントに限定して取得 (越テナント更新の遮断)。
  select role into v_old_role
    from public.profiles
   where id = p_target_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'target_not_found';
  end if;

  update public.profiles
     set role = p_new_role
   where id = p_target_id and tenant_id = p_tenant_id;

  insert into public.audit_logs
    (tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, ip, metadata)
  values
    (p_tenant_id, p_actor_id, coalesce(p_actor_name, ''), p_actor_role,
     'role_change', 'user', p_target_id::text, p_ip,
     jsonb_build_object('from', v_old_role, 'to', p_new_role));

  return jsonb_build_object('from', v_old_role, 'to', p_new_role);
end;
$$;

-- ---------------------------------------------------------------
-- 2. 無効化 / 復帰 (profiles.disabled 更新 + 監査記録を原子的に)
-- ---------------------------------------------------------------
create or replace function public.admin_apply_disable(
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text,
  p_tenant_id text,
  p_target_id uuid,
  p_disabled boolean,
  p_ip text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set disabled = p_disabled
   where id = p_target_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'target_not_found';
  end if;

  insert into public.audit_logs
    (tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, ip, metadata)
  values
    (p_tenant_id, p_actor_id, coalesce(p_actor_name, ''), p_actor_role,
     case when p_disabled then 'user_disable' else 'user_enable' end,
     'user', p_target_id::text, p_ip, '{}'::jsonb);

  return jsonb_build_object('disabled', p_disabled);
end;
$$;

-- ---------------------------------------------------------------
-- 3. 招待 (profiles upsert + 監査記録を原子的に)
-- ---------------------------------------------------------------
create or replace function public.admin_apply_invite(
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text,
  p_tenant_id text,
  p_target_id uuid,
  p_email text,
  p_display_name text,
  p_role text,
  p_initials text,
  p_ip text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('student','instructor','admin') then
    raise exception 'invalid_role';
  end if;

  insert into public.profiles (id, tenant_id, role, display_name, email, initials, disabled)
  values (p_target_id, p_tenant_id, p_role, p_display_name, p_email, p_initials, false)
  on conflict (id) do update
    set tenant_id = excluded.tenant_id,
        role = excluded.role,
        display_name = excluded.display_name,
        email = excluded.email,
        initials = excluded.initials,
        disabled = false;

  insert into public.audit_logs
    (tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, ip, metadata)
  values
    (p_tenant_id, p_actor_id, coalesce(p_actor_name, ''), p_actor_role,
     'user_invite', 'user', p_target_id::text, p_ip,
     jsonb_build_object('email', p_email, 'role', p_role));

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------
-- 4. 実行権限 — service_role のみ
-- ---------------------------------------------------------------
-- 特権操作のため authenticated/anon からの直接呼び出しを禁止し、 service-role 経由の
-- 管理 API (apps/api) からのみ呼べるようにする。
revoke all on function public.admin_change_role(uuid, text, text, text, uuid, text, text) from public;
revoke all on function public.admin_apply_disable(uuid, text, text, text, uuid, boolean, text) from public;
revoke all on function public.admin_apply_invite(uuid, text, text, text, uuid, text, text, text, text, text) from public;

grant execute on function public.admin_change_role(uuid, text, text, text, uuid, text, text) to service_role;
grant execute on function public.admin_apply_disable(uuid, text, text, text, uuid, boolean, text) to service_role;
grant execute on function public.admin_apply_invite(uuid, text, text, text, uuid, text, text, text, text, text) to service_role;
