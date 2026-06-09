-- =================================================================
-- 監査ログ (Issue #27 / P2)
--
-- 認証・権限変更・削除など重要操作を append-only で記録・保管・閲覧する。
--
--   audit_logs : テナント単位の監査証跡。 1 行 = 1 操作。
--                update / delete は (authenticated に対し) 一切許可しない append-only。
--
-- 記録経路 (issue の「service-role 経由の API もしくは DB トリガー」 に対応):
--   - ロール変更 / ユーザー招待 / 無効化・復帰
--       → これらは service-role 経由の管理 API (apps/api/.../admin-users.ts) でしか
--         実行できない。 API 側で recordAuditLog() を呼んで記録する。 service-role は
--         RLS を迂回するため INSERT ポリシー無しでも書ける。 actor も API が確定する。
--   - コース公開 / 非公開 / 削除
--       → これらは RLS 配下でブラウザの supabase クライアントから直接 courses を
--         更新・削除する (専用 API が無い)。 auth.uid() が取れるため、 courses への
--         AFTER UPDATE/DELETE トリガー (security definer) で記録する。
--
-- append-only の担保:
--   - RLS を有効化し SELECT ポリシー (同テナントの instructor/admin) のみを置く。
--   - INSERT / UPDATE / DELETE ポリシーは作らない → authenticated/anon からの
--     直接の書き込み・改ざん・削除はすべて拒否される。
--   - 記録はすべて security definer トリガー または service-role 経由で行うため、
--     これらは RLS を迂回して INSERT できる。
--   - 保管ポリシー (1 年以上) と将来的な世代削除の運用は docs/audit-log-retention.md。
--     世代削除は service-role (定期ジョブ) からのみ行う想定で、 DELETE をハード
--     ブロックはしない (保管期間経過後の削除を許すため)。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor で本ファイルを実行、
--           または `bun run supabase:push`。
-- 前提:
--   - 20260519000000_cms_foundation.sql (tenants / profiles / courses /
--     current_tenant_id() / current_role())
--   が適用済みであること。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. audit_logs テーブル
-- ---------------------------------------------------------------
-- actor は退職等で profiles が消えても証跡を残せるよう actor_name / actor_role を
-- denormalize し、 actor_id は on delete set null (誰が、 が消えても何をしたかは残す)。
-- target_id は course (uuid) / email / auth リソース等を横断的に指せるよう text。
-- metadata は操作種別ごとの補足 (変更前後の値・slug・email 等)。
-- tenant_id は on delete restrict。 保管要件 (1 年以上) と append-only 方針に従い、
-- テナント削除で監査証跡が連鎖削除されないようにする (テナント削除前に証跡の
-- アーカイブ / 明示的なクリーンアップを必須化する)。
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  -- 実行者の表示名 / ロールを denormalize (profiles の RLS を跨がず一覧描画するため)。
  actor_name text not null default '',
  actor_role text,
  action text not null,
  target_type text not null default '',
  target_id text,
  ip text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- テナント内の新着順スキャン (一覧の既定ソート) 用。
create index if not exists audit_logs_tenant_idx
  on public.audit_logs(tenant_id, created_at desc);
-- 実行者での絞り込み用。
create index if not exists audit_logs_actor_idx
  on public.audit_logs(actor_id, created_at desc);
-- 操作種別での絞り込み用。
create index if not exists audit_logs_action_idx
  on public.audit_logs(tenant_id, action, created_at desc);

-- ---------------------------------------------------------------
-- 2. courses への監査トリガー (公開 / 非公開 / 削除)
-- ---------------------------------------------------------------
-- これらの操作はブラウザの supabase クライアントから RLS 配下で直接行われるため、
-- auth.uid() から実行者を確定できる。 security definer で audit_logs の INSERT
-- ポリシー不在を跨ぎ、 actor_name / actor_role を profiles から補完する。
create or replace function public.audit_course_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_name text := '';
  v_role text;
begin
  if v_actor is not null then
    select display_name, role into v_name, v_role
    from public.profiles where id = v_actor;
  end if;

  if (tg_op = 'DELETE') then
    insert into public.audit_logs
      (tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, metadata)
    values
      (old.tenant_id, v_actor, coalesce(v_name, ''), v_role,
       'course_delete', 'course', old.id::text,
       jsonb_build_object('slug', old.slug, 'title', old.title, 'status', old.status));
    return old;
  end if;

  -- UPDATE: 公開状態 (status) の遷移のみ記録する。 タイトル等の編集は対象外。
  if new.status is distinct from old.status then
    insert into public.audit_logs
      (tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, metadata)
    values
      (new.tenant_id, v_actor, coalesce(v_name, ''), v_role,
       case
         when new.status = 'published' then 'course_publish'
         when old.status = 'published' then 'course_unpublish'
         else 'course_status_change'
       end,
       'course', new.id::text,
       jsonb_build_object('slug', new.slug, 'title', new.title,
                          'from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists audit_course_update_trg on public.courses;
create trigger audit_course_update_trg after update on public.courses
  for each row execute function public.audit_course_event();

drop trigger if exists audit_course_delete_trg on public.courses;
create trigger audit_course_delete_trg after delete on public.courses
  for each row execute function public.audit_course_event();

-- ---------------------------------------------------------------
-- 3. RLS — append-only (read のみ許可)
-- ---------------------------------------------------------------
alter table public.audit_logs enable row level security;

-- read: 同テナントの instructor/admin のみ。 無効化ユーザーは current_tenant_id() /
-- current_role() が null を返すため自動的に遮断される (user_management 参照)。
drop policy if exists audit_logs_read_staff on public.audit_logs;
create policy audit_logs_read_staff on public.audit_logs
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor', 'admin')
  );

-- INSERT / UPDATE / DELETE ポリシーは意図的に置かない。
--   - authenticated / anon からの直接書き込み・改ざん・削除はすべて拒否 (append-only)。
--   - 記録は security definer トリガー (上記) と service-role 経由の管理 API でのみ行い、
--     いずれも RLS を迂回するため INSERT できる。
