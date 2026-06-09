-- =================================================================
-- 通知・お知らせ機能 (Issue #25 / P1)
--
-- お知らせ (アナウンス) と各種イベント通知 (添削完了 / Q&A 回答 等) を永続化し、
-- アプリ内通知センターで受け取れるようにする。
--
--   announcements : 講師・管理者が発信するお知らせ (テナント全体 / コース単位)。
--                   受講者ダッシュボードの「お知らせ」カードのソース。
--   notifications : ユーザ個人宛のイベント通知 (本人のみ read/既読化)。
--                   お知らせの配信先 (fan-out) + 添削完了 / Q&A 回答などのイベント。
--
-- 設計方針:
--   - notifications は本人のみ read/update/delete。 INSERT は専用ポリシーを置かず、
--     security definer のトリガー経由でのみ生成する (クライアントの自己申告で
--     他人宛の通知を捏造できないようにする)。
--   - announcements の read は同テナントの認証済みユーザ、 write は講師/管理者のみ。
--     author_id / author_name は BEFORE トリガーで auth.uid() の profile から埋める。
--   - お知らせ作成時は AFTER トリガーで対象受講者へ notification を fan-out する
--     (course_id 指定時は受講登録者、 未指定時はテナントの全受講者)。
--   - 添削確定 (submissions.reviewed_at が新たに設定) / 講師の Q&A 返信で
--     対象ユーザーへ notification を生成する。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor で本ファイルを実行、
--           または `bun run supabase:push`。
-- 前提:
--   - 20260519000000_cms_foundation.sql (tenants / profiles / courses /
--     current_tenant_id() / current_role() / set_updated_at())
--   - 20260525000000_submissions_reviews.sql (submissions)
--   - 20260608010000_enrollments.sql (enrollments)
--   - 20260608020000_qa.sql (questions / question_replies)
--   が適用済みであること。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. announcements テーブル
-- ---------------------------------------------------------------
-- course_id は nullable (テナント全体のお知らせは course 無し)。 コース削除でも
-- お知らせ自体は消さず course 紐付けのみ外す運用も考えられるが、 コース単位の
-- お知らせはコンテキストごと消える方が自然なため on delete cascade。
-- author は退職等で profiles が消えても表示を保てるよう author_name を denormalize し、
-- author_id は on delete set null。

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  -- 発信者の表示名を denormalize (profiles の RLS を跨がず描画するため)。
  author_name text not null default '',
  title text not null default '',
  body text not null default '',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists announcements_tenant_idx
  on public.announcements(tenant_id, published_at desc);
create index if not exists announcements_course_idx
  on public.announcements(course_id);

-- ---------------------------------------------------------------
-- 2. notifications テーブル
-- ---------------------------------------------------------------
-- payload は通知種別ごとの参照情報 (submission_id / question_id / announcement_id 等)。
-- フロントは type と payload から遷移先・表示を組み立てる。

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id text not null references public.tenants(id) on delete cascade,
  type text not null
    check (type in ('announcement','review_completed','qa_answered','assignment_due')),
  title text not null default '',
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 本人の未読優先の新着順スキャン用。
create index if not exists notifications_user_idx
  on public.notifications(user_id, read, created_at desc);

-- ---------------------------------------------------------------
-- 3. announcements トリガー
-- ---------------------------------------------------------------

-- 発信者情報を呼び出し元の profile から埋める。 認可自体は RLS の insert ポリシーに
-- 委ねるが、 author_id / author_name を auth.uid() に確定し自己申告を排除する。
create or replace function public.announcement_fill_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select display_name into v_name from public.profiles where id = v_uid;

  new.author_id := v_uid;
  new.author_name := coalesce(v_name, '');
  return new;
end;
$$;

drop trigger if exists announcement_fill_author_trg on public.announcements;
create trigger announcement_fill_author_trg before insert on public.announcements
  for each row execute function public.announcement_fill_author();

-- お知らせを対象受講者へ fan-out する。
--   course_id 指定 → そのコースの受講登録者
--   course_id 未指定 → テナントの全受講者 (role='student')
-- 発信者自身 (author_id) には配信しない。 security definer で notifications の
-- INSERT ポリシー不在を跨ぐ。
create or replace function public.announcement_fanout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, tenant_id, type, title, body, payload)
  select
    p.id,
    new.tenant_id,
    'announcement',
    new.title,
    new.body,
    jsonb_build_object('announcement_id', new.id, 'course_id', new.course_id)
  from public.profiles p
  where p.tenant_id = new.tenant_id
    and p.role = 'student'
    and p.id is distinct from new.author_id
    and (
      new.course_id is null
      or exists (
        select 1 from public.enrollments e
        where e.user_id = p.id
          and e.course_id = new.course_id
      )
    );
  return new;
end;
$$;

drop trigger if exists announcement_fanout_trg on public.announcements;
create trigger announcement_fanout_trg after insert on public.announcements
  for each row execute function public.announcement_fanout();

-- ---------------------------------------------------------------
-- 4. イベント通知トリガー (submissions / question_replies)
-- ---------------------------------------------------------------

-- 添削確定: reviewed_at が初めて設定された時のみ、 受講者本人へ通知。
-- patchToUpdate は status が pending 以外になる度に reviewed_at を打ち直すため、
-- 「変化したら通知」 だと添削後の微修正で重複通知が出る。 old.reviewed_at is null に
-- 限定して初回確定のみ通知する (再提出は別 submission 行になり old が null のため拾える)。
create or replace function public.notify_review_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  if new.student_id is not null
     and new.reviewed_at is not null
     and old.reviewed_at is null then
    v_body := case new.verdict
      when 'pass' then '合格しました。 おめでとうございます。'
      when 'resubmit' then '再提出が必要です。 フィードバックを確認してください。'
      when 'fail' then '残念ながら不合格です。 フィードバックを確認してください。'
      else 'フィードバックが届いています。'
    end;

    insert into public.notifications (user_id, tenant_id, type, title, body, payload)
    values (
      new.student_id,
      new.tenant_id,
      'review_completed',
      coalesce(nullif(new.assignment_title, ''), '課題') || ' の添削が完了しました',
      v_body,
      jsonb_build_object(
        'submission_id', new.id,
        'verdict', new.verdict,
        'status', new.status,
        'course_title', new.course_title
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_review_completed_trg on public.submissions;
create trigger notify_review_completed_trg after update on public.submissions
  for each row execute function public.notify_review_completed();

-- Q&A 回答: 講師/管理者の返信 (is_instructor) が付いたら質問者本人へ通知。
-- 自分のスレッドへの自答 (author 同一) には通知しない。 is_instructor は
-- qa_fill_author (BEFORE INSERT) で確定済みのため AFTER INSERT で参照できる。
create or replace function public.notify_qa_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q public.questions;
begin
  select * into v_q from public.questions where id = new.question_id;
  if not found then
    return new;
  end if;

  if new.is_instructor and v_q.author_id is distinct from new.author_id then
    insert into public.notifications (user_id, tenant_id, type, title, body, payload)
    values (
      v_q.author_id,
      v_q.tenant_id,
      'qa_answered',
      '質問に回答がつきました',
      left(new.body, 140),
      jsonb_build_object(
        'question_id', v_q.id,
        'course_id', v_q.course_id,
        'lesson_id', v_q.lesson_id,
        'reply_id', new.id
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_qa_answered_trg on public.question_replies;
create trigger notify_qa_answered_trg after insert on public.question_replies
  for each row execute function public.notify_qa_answered();

-- ---------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------

alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

-- announcements ------------------------------------------------

-- read: 同テナント前提。 テナント全体のお知らせ (course_id is null) は全員、
-- コース単位のお知らせは当該コースの受講登録者のみ (fan-out 対象と一致させる)。
-- 講師/管理者は同テナントの全お知らせを read 可。
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      course_id is null
      or public.current_role() in ('instructor','admin')
      or exists (
        select 1 from public.enrollments e
        where e.course_id = announcements.course_id
          and e.user_id = auth.uid()
      )
    )
  );

-- insert: 講師/管理者のみ (author はトリガーで auth.uid() に確定)。 course 指定時は同テナント。
drop policy if exists announcements_insert_staff on public.announcements;
create policy announcements_insert_staff on public.announcements
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
    and (
      course_id is null
      or exists (
        select 1 from public.courses c
        where c.id = announcements.course_id
          and c.tenant_id = public.current_tenant_id()
      )
    )
  );

-- update: 講師/管理者 (同テナント)。
drop policy if exists announcements_update_staff on public.announcements;
create policy announcements_update_staff on public.announcements
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
    and (
      course_id is null
      or exists (
        select 1 from public.courses c
        where c.id = announcements.course_id
          and c.tenant_id = public.current_tenant_id()
      )
    )
  );

-- delete: 講師/管理者 (同テナント)。
drop policy if exists announcements_delete_staff on public.announcements;
create policy announcements_delete_staff on public.announcements
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- notifications ------------------------------------------------
-- INSERT ポリシーは置かない。 生成は security definer トリガー経由のみ。
-- 本人判定に加え tenant_id = current_tenant_id() を併用する。 これにより無効化ユーザー
-- (current_tenant_id() が null を返す / user_management 参照) は未失効 JWT でも通知に
-- アクセスできず、 別テナントへ移管された場合も旧テナントの通知が読めなくなる。

-- read: 本人かつ現テナント (無効化ゲート併用)。
drop policy if exists notifications_read_self on public.notifications;
create policy notifications_read_self on public.notifications
  for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = public.current_tenant_id()
  );

-- update: 本人かつ現テナント (既読化)。 行の付け替え (user_id 変更) は with check で遮断。
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
  for update to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    user_id = auth.uid()
    and tenant_id = public.current_tenant_id()
  );

-- delete: 本人かつ現テナント。
drop policy if exists notifications_delete_self on public.notifications;
create policy notifications_delete_self on public.notifications
  for delete to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = public.current_tenant_id()
  );
