-- =================================================================
-- レッスン進捗のサーバ永続化 (Issue #21 / P0)
--
-- これまで進捗はブラウザの localStorage (`lms_lesson_progress`) のみに
-- 保存されており、 端末を変えると失われ、 講師・管理者からも見えなかった。
-- 本マイグレーションで `lesson_progress` テーブルを追加し、 端末横断の
-- 復元と講師/管理者からの可視化 (データ経路) を可能にする。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルを実行する。
--   前提: 20260519000000_cms_foundation.sql が適用済み
--         (tenants / profiles / current_tenant_id() / current_role() を参照する)。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. テーブル
-- ---------------------------------------------------------------
-- lesson_id を text にしているのは、 受講者 UI のコース取得が DB 失敗時に
-- fixtures (uuid でない id) へフォールバックし得るため。 整合性はアプリ層
-- (クライアントは uuid 形式の lesson_id のみ同期する) で担保し、 ここでは
-- FK にしない (assignments.assignment_id と同じ defensive 方針)。

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  completed boolean not null default false,
  -- slides: 最終閲覧ページ (1-indexed)
  last_page int,
  -- slides: 既閲覧ページ集合 (number[] を直列化)
  viewed_pages jsonb not null default '[]'::jsonb,
  -- video: 視聴済み秒数の最大値 (端数許容)
  watched_sec double precision,
  -- クライアントが付与する更新時刻。 端末間の Last-Write-Wins マージに使うため
  -- トリガーで上書きせず、 payload の値をそのまま採用する。
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- 受講者本人のロード用 / 講師の集計用
create index if not exists lesson_progress_user_idx
  on public.lesson_progress(user_id);
create index if not exists lesson_progress_tenant_lesson_idx
  on public.lesson_progress(tenant_id, lesson_id);

-- ---------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------

alter table public.lesson_progress enable row level security;

-- 受講者本人: 自分の進捗を read / insert / update / delete
drop policy if exists lesson_progress_rw_self on public.lesson_progress;
create policy lesson_progress_rw_self on public.lesson_progress
  for all to authenticated
  using (user_id = auth.uid() and tenant_id = public.current_tenant_id())
  with check (user_id = auth.uid() and tenant_id = public.current_tenant_id());

-- 講師 / 管理者: 同テナントの進捗を read (可視化のデータ経路)
drop policy if exists lesson_progress_read_staff on public.lesson_progress;
create policy lesson_progress_read_staff on public.lesson_progress
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor', 'admin')
  );

-- ---------------------------------------------------------------
-- 3. 条件付き upsert RPC (端末間 Last-Write-Wins を書き込み側でも担保)
-- ---------------------------------------------------------------
-- クライアントの単純 upsert は、 別端末が後から書いた新しい行を、 こちらの
-- キューに残った古い payload で上書きし得る。 hydrate 側だけでなく書き込み側も
-- LWW にするため、 conflict 時は payload の updated_at が既存より新しい場合のみ
-- 更新する。 security invoker なので RLS (lesson_progress_rw_self) が適用される。

create or replace function public.upsert_lesson_progress(p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.lesson_progress as lp
    (tenant_id, user_id, lesson_id, completed, last_page, viewed_pages, watched_sec, updated_at)
  select
    x.tenant_id, x.user_id, x.lesson_id, x.completed,
    x.last_page, coalesce(x.viewed_pages, '[]'::jsonb), x.watched_sec, x.updated_at
  from jsonb_to_recordset(p_rows) as x(
    tenant_id text,
    user_id uuid,
    lesson_id text,
    completed boolean,
    last_page int,
    viewed_pages jsonb,
    watched_sec double precision,
    updated_at timestamptz
  )
  on conflict (user_id, lesson_id) do update
    set completed    = excluded.completed,
        last_page    = excluded.last_page,
        viewed_pages = excluded.viewed_pages,
        watched_sec  = excluded.watched_sec,
        updated_at   = excluded.updated_at
    where excluded.updated_at > lp.updated_at;
end;
$$;

grant execute on function public.upsert_lesson_progress(jsonb) to authenticated;
