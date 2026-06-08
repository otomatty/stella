-- =================================================================
-- Q&A・ディスカッションの永続化 (Issue #24 / P1)
--
-- 受講者の質問と講師の回答を永続化し、 レッスン単位 / コース単位のスレッドとして
-- 成立させる。 講師の「未返信キュー」 (status='open') も実データにする。
--
--   questions         : 質問スレッドのルート (course / lesson に紐付く)
--   question_replies  : スレッドへの返信 (受講者の追記 / 講師の回答)
--
-- 設計方針:
--   - 同テナントの認証済みユーザは質問・返信を read 可 (ディスカッション板として共有)。
--   - 投稿は本人のみ。 author_id / 表示名 / is_instructor は BEFORE トリガーで
--     呼び出し元 (auth.uid()) の profile から埋めるため、 クライアントの自己申告に依存しない。
--   - profiles の RLS は受講者が他人の行を read できない (本人 + staff のみ) ため、
--     表示名はスレッド側に denormalize して保持する (join に頼らない)。
--   - 講師/管理者は status 変更可。 講師が回答 (is_instructor 返信) すると
--     親 question は自動的に 'answered' へ遷移する (未返信キューから外れる)。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor で本ファイルを実行、
--           または `bun run supabase:push`。
-- 前提: 20260519000000_cms_foundation.sql (tenants / profiles / courses / lessons /
--       current_tenant_id() / current_role() / set_updated_at()) が適用済みであること。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. questions テーブル
-- ---------------------------------------------------------------
-- lesson_id は nullable (コース全体への質問は lesson 無し)。 レッスン削除でも
-- スレッドは残せるよう on delete set null。 course は質問の所属コンテキストなので cascade。

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- 投稿者の表示名 / イニシャルを denormalize (profiles の RLS を跨がず描画するため)。
  author_name text not null default '',
  author_initials text,
  title text not null default '',
  body text not null default '',
  status text not null check (status in ('open','answered','closed')) default 'open',
  created_at timestamptz not null default now(),
  -- 返信が付くたびに bump し、 スレッドの新着順ソートに使う。
  updated_at timestamptz not null default now()
);

create index if not exists questions_tenant_idx on public.questions(tenant_id);
create index if not exists questions_course_idx on public.questions(course_id);
create index if not exists questions_lesson_idx on public.questions(lesson_id);
create index if not exists questions_author_idx on public.questions(author_id);
-- 未返信キュー (status='open') のテナント横断スキャン用。
create index if not exists questions_tenant_status_idx
  on public.questions(tenant_id, status);

-- ---------------------------------------------------------------
-- 2. question_replies テーブル
-- ---------------------------------------------------------------

create table if not exists public.question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  author_initials text,
  body text not null default '',
  -- 投稿者が講師/管理者か。 トリガーで profile から決定する (自己申告に依存しない)。
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists question_replies_question_idx
  on public.question_replies(question_id, created_at);

-- ---------------------------------------------------------------
-- 3. トリガー
-- ---------------------------------------------------------------

-- updated_at 自動更新 (返信トリガーからの明示 update では set_updated_at は走らないが、
-- 直接 update された場合に備えて付与する)。
drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

-- 投稿者情報を呼び出し元の profile から埋める (questions / question_replies 共通)。
-- author_id / author_name / author_initials を上書きし、 返信では is_instructor も決定する。
create or replace function public.qa_fill_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_initials text;
  v_role text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select display_name, initials, role
    into v_name, v_initials, v_role
    from public.profiles
   where id = v_uid;

  new.author_id := v_uid;
  new.author_name := coalesce(v_name, '');
  new.author_initials := coalesce(v_initials, nullif(left(coalesce(v_name, ''), 2), ''));

  if tg_table_name = 'question_replies' then
    new.is_instructor := (v_role in ('instructor','admin'));
  end if;

  return new;
end;
$$;

drop trigger if exists qa_fill_author_questions on public.questions;
create trigger qa_fill_author_questions before insert on public.questions
  for each row execute function public.qa_fill_author();

drop trigger if exists qa_fill_author_replies on public.question_replies;
create trigger qa_fill_author_replies before insert on public.question_replies
  for each row execute function public.qa_fill_author();

-- 返信が付いたら親スレッドの updated_at を bump。 講師回答なら open→answered に遷移。
-- security definer でテーブル RLS を跨ぎ、 受講者の追記でも updated_at を更新できるようにする。
create or replace function public.qa_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.questions
     set updated_at = now(),
         status = case
           when new.is_instructor and status = 'open' then 'answered'
           else status
         end
   where id = new.question_id;
  return new;
end;
$$;

drop trigger if exists qa_on_reply_insert on public.question_replies;
create trigger qa_on_reply_insert after insert on public.question_replies
  for each row execute function public.qa_on_reply();

-- ---------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------

alter table public.questions enable row level security;
alter table public.question_replies enable row level security;

-- questions ----------------------------------------------------

-- read: 同テナントの認証済みユーザ全員 (ディスカッション板として共有)。
drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- insert: 本人のみ (author_id はトリガーで auth.uid() に確定)。 対象 course が同テナントであること。
drop policy if exists questions_insert_self on public.questions;
create policy questions_insert_self on public.questions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.courses c
      where c.id = questions.course_id
        and c.tenant_id = public.current_tenant_id()
    )
  );

-- update (author): 自分のスレッドの本文 / status を更新可 (自己解決クローズ等)。
-- with check の course_id 検証で、 他テナントのコースへの付け替え (越テナント混入) を遮断する。
drop policy if exists questions_update_author on public.questions;
create policy questions_update_author on public.questions
  for update to authenticated
  using (author_id = auth.uid() and tenant_id = public.current_tenant_id())
  with check (
    author_id = auth.uid()
    and tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.courses c
      where c.id = questions.course_id
        and c.tenant_id = public.current_tenant_id()
    )
  );

-- update (staff): 講師/管理者は同テナントの status 等を変更可。
drop policy if exists questions_update_staff on public.questions;
create policy questions_update_staff on public.questions
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.courses c
      where c.id = questions.course_id
        and c.tenant_id = public.current_tenant_id()
    )
  );

-- delete: 本人または staff (同テナント)。
drop policy if exists questions_delete on public.questions;
create policy questions_delete on public.questions
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (author_id = auth.uid() or public.current_role() in ('instructor','admin'))
  );

-- question_replies ---------------------------------------------

-- read: 親スレッドが同テナントなら read 可。
drop policy if exists question_replies_read on public.question_replies;
create policy question_replies_read on public.question_replies
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_replies.question_id
        and q.tenant_id = public.current_tenant_id()
    )
  );

-- insert: 本人のみ (author_id / is_instructor はトリガーで確定)。 親スレッドが同テナントであること。
drop policy if exists question_replies_insert_self on public.question_replies;
create policy question_replies_insert_self on public.question_replies
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_replies.question_id
        and q.tenant_id = public.current_tenant_id()
    )
  );

-- delete: 本人または staff (同テナント)。
drop policy if exists question_replies_delete on public.question_replies;
create policy question_replies_delete on public.question_replies
  for delete to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_replies.question_id
        and q.tenant_id = public.current_tenant_id()
        and (
          question_replies.author_id = auth.uid()
          or public.current_role() in ('instructor','admin')
        )
    )
  );
