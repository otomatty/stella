-- =================================================================
-- 成績台帳 (gradebook) と修了判定 → 修了証発行の連動 (Issue #26 / P1)
--
-- 「表示だけの修了証」 を実体化する。
--   1. 修了基準モデル : courses に完了条件 (全レッスン完了 / 小テスト合格 /
--      課題 pass) のトグルを持たせる。
--   2. 成績台帳        : 進捗 (lesson_progress) + 小テスト (quiz_attempts) +
--      課題 (submissions.verdict) を統合して達成状況を集計する RPC。
--   3. 修了証発行      : certificates テーブル (cert_code 一意 / criteria_snapshot)。
--      基準達成で受講者自身 or 講師が発行できる security definer RPC。
--   4. 検証ページ      : cert_code から真正性を確認できる anon 実行可能な RPC
--      (テーブルを匿名公開せず、 サニタイズした公開情報のみ返す)。
--
-- 採点ロジック (修了判定) はすべて security definer RPC に集約し、 クライアントが
-- スコアや判定を改竄できないようにする (quiz_attempts と同じ方針)。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルを実行する。
--   前提: 20260519000000_cms_foundation.sql (courses / lessons / sections /
--         profiles / tenants / current_tenant_id() / current_role() /
--         set_updated_at()), 20260607000000_lesson_progress.sql,
--         20260608000000_quiz.sql, 20260608010000_enrollments.sql,
--         20260525000000_submissions_reviews.sql が適用済みであること。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. 修了基準モデル (courses 拡張)
-- ---------------------------------------------------------------
-- 既存コースにも安全に追加できるよう defensive (add column if not exists)。
-- 既定値は「全レッスン完了 + 小テスト全合格 + 課題全 pass で達成、 達成したら自動発行」。
-- 基準を緩めたい場合は instructor/admin がコース編集 UI でトグルを外す。

alter table public.courses
  add column if not exists require_all_lessons boolean not null default true;
alter table public.courses
  add column if not exists require_quiz_pass boolean not null default true;
alter table public.courses
  add column if not exists require_assignment_pass boolean not null default true;
alter table public.courses
  add column if not exists auto_issue_certificate boolean not null default true;

-- ---------------------------------------------------------------
-- 2. certificates テーブル
-- ---------------------------------------------------------------
-- 検証ページ (匿名) が profiles / courses / tenants の RLS を跨がず描画できるよう、
-- 受講者名 / コース名 / テナント名を denormalize して保持する。
-- criteria_snapshot は発行時点の達成状況 (compute_course_completion の戻り) を凍結する。

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  -- 公開検証用の一意コード (例: FLC-2026-AB12-CD34)。
  cert_code text not null unique,
  -- 発行者。 null = 基準達成による自動発行 / 受講者本人による発行。
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  -- 発行時点の達成状況スナップショット。
  criteria_snapshot jsonb not null default '{}'::jsonb,
  -- 検証ページ用 denormalize。
  recipient_name text not null,
  course_title text not null,
  tenant_name text not null,
  -- 失効フラグ (誤発行の取消など)。 検証ページは revoked=true を無効として扱う。
  revoked boolean not null default false,
  -- 同一受講者 × コースの二重発行を防ぐ。
  unique (user_id, course_id)
);

create index if not exists certificates_user_idx
  on public.certificates(user_id);
create index if not exists certificates_tenant_course_idx
  on public.certificates(tenant_id, course_id);

-- ---------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------
-- 直接の insert/update は許可しない (発行は security definer RPC 経由のみ)。
-- 受講者は自分の修了証を read、 staff は同テナントを read。 匿名検証は RPC で行う。

alter table public.certificates enable row level security;

drop policy if exists certificates_read_self on public.certificates;
create policy certificates_read_self on public.certificates
  for select to authenticated
  using (user_id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy if exists certificates_read_staff on public.certificates;
create policy certificates_read_staff on public.certificates
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- ---------------------------------------------------------------
-- 4. 修了判定 (成績台帳の中核) RPC
-- ---------------------------------------------------------------
-- 進捗 / 小テスト / 課題を統合し、 (受講者, コース) の達成状況を返す。
--   - 全レッスン : lesson_progress.completed が true のレッスン数。
--   - 小テスト   : type='quiz' かつ quizzes 行を持つレッスンのうち、
--                  passed=true の attempt が 1 件以上あるもの。
--   - 課題       : type='assignment' のレッスンのうち、
--                  submissions.verdict='pass' が 1 件以上あるもの。
-- 認可: 受講者本人、 または同テナントの staff のみ。 それ以外は null。

create or replace function public.compute_course_completion(
  p_user_id uuid,
  p_course_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller_tenant text := public.current_tenant_id();
  v_caller_role   text := public.current_role();
  v_uid           uuid := auth.uid();
  v_course        public.courses%rowtype;
  v_total_lessons int := 0;
  v_done_lessons  int := 0;
  v_total_quiz    int := 0;
  v_passed_quiz   int := 0;
  v_total_assign  int := 0;
  v_passed_assign int := 0;
  v_met           boolean;
  v_cert          public.certificates%rowtype;
begin
  if v_uid is null or v_caller_tenant is null then
    return null;
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.tenant_id <> v_caller_tenant then
    return null;
  end if;

  -- 認可: 本人 or 同テナント staff。
  if not (
    p_user_id = v_uid
    or v_caller_role in ('instructor','admin')
  ) then
    return null;
  end if;

  -- 対象ユーザーが呼び出し元と同テナントであることを必須化する。
  -- staff が任意 UUID (他テナントの profiles.id) を渡して越テナント参照するのを防ぐ。
  if not exists (
    select 1 from public.profiles p
     where p.id = p_user_id and p.tenant_id = v_caller_tenant
  ) then
    return null;
  end if;

  -- レッスン総数と完了数。
  select
    count(*),
    count(*) filter (
      where exists (
        select 1 from public.lesson_progress lp
         where lp.user_id = p_user_id
           and lp.lesson_id = l.id::text
           and lp.completed
      )
    )
  into v_total_lessons, v_done_lessons
  from public.lessons l
  join public.sections s on s.id = l.section_id
  where s.course_id = p_course_id;

  -- 小テスト (quizzes 行を持つ quiz レッスン) の総数と合格数。
  select
    count(*),
    count(*) filter (
      where exists (
        select 1 from public.quiz_attempts qa
         where qa.quiz_id = q.id
           and qa.user_id = p_user_id
           and qa.passed
      )
    )
  into v_total_quiz, v_passed_quiz
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  join public.sections s on s.id = l.section_id
  where s.course_id = p_course_id;

  -- 課題 (assignment レッスン) の総数と pass 数。
  select
    count(*),
    count(*) filter (
      where exists (
        select 1 from public.submissions sub
         where sub.lesson_id = l.id
           and sub.student_id = p_user_id
           and sub.verdict = 'pass'
      )
    )
  into v_total_assign, v_passed_assign
  from public.lessons l
  join public.sections s on s.id = l.section_id
  where s.course_id = p_course_id
    and l.type = 'assignment';

  -- 達成判定: コースに有効な基準を全て満たし、 かつレッスンが 1 つ以上ある。
  v_met := v_total_lessons > 0
    and (not v_course.require_all_lessons or v_done_lessons >= v_total_lessons)
    and (not v_course.require_quiz_pass or v_passed_quiz >= v_total_quiz)
    and (not v_course.require_assignment_pass or v_passed_assign >= v_total_assign);

  -- 既存の修了証 (あれば cert_code を載せる)。
  select * into v_cert
    from public.certificates
   where user_id = p_user_id and course_id = p_course_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'course_id', p_course_id,
    'course_title', v_course.title,
    'total_lessons', v_total_lessons,
    'completed_lessons', v_done_lessons,
    'total_quizzes', v_total_quiz,
    'passed_quizzes', v_passed_quiz,
    'total_assignments', v_total_assign,
    'passed_assignments', v_passed_assign,
    'criteria', jsonb_build_object(
      'require_all_lessons', v_course.require_all_lessons,
      'require_quiz_pass', v_course.require_quiz_pass,
      'require_assignment_pass', v_course.require_assignment_pass,
      'auto_issue_certificate', v_course.auto_issue_certificate
    ),
    'met', v_met,
    'has_certificate', found,
    'cert_code', case when found then v_cert.cert_code else null end
  );
end;
$$;

grant execute on function public.compute_course_completion(uuid, uuid) to authenticated;

-- 受講者本人の達成状況を返す薄いラッパ。
create or replace function public.get_my_course_completion(p_course_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.compute_course_completion(auth.uid(), p_course_id);
$$;

grant execute on function public.get_my_course_completion(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 5. 成績台帳 (gradebook) RPC — staff 向け
-- ---------------------------------------------------------------
-- あるコースに受講登録された受講者ごとの達成状況一覧を返す。
-- enrollment を母集合とし、 各受講者の completion を集計する。

create or replace function public.get_course_gradebook(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant text := public.current_tenant_id();
  v_role   text := public.current_role();
  v_course public.courses%rowtype;
  v_rows   jsonb := '[]'::jsonb;
  r        record;
begin
  if v_tenant is null or v_role not in ('instructor','admin') then
    return null;
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.tenant_id <> v_tenant then
    return null;
  end if;

  for r in
    select e.user_id, p.display_name, p.initials, p.email,
           e.status, e.due_at, e.enrolled_at
      from public.enrollments e
      join public.profiles p on p.id = e.user_id
     where e.course_id = p_course_id
       and e.tenant_id = v_tenant
     order by p.display_name
  loop
    v_rows := v_rows || jsonb_build_object(
      'user_id', r.user_id,
      'display_name', r.display_name,
      'initials', r.initials,
      'email', r.email,
      'enrollment_status', r.status,
      'due_at', r.due_at,
      'enrolled_at', r.enrolled_at,
      'completion', public.compute_course_completion(r.user_id, p_course_id)
    );
  end loop;

  return jsonb_build_object(
    'course_id', p_course_id,
    'course_title', v_course.title,
    'criteria', jsonb_build_object(
      'require_all_lessons', v_course.require_all_lessons,
      'require_quiz_pass', v_course.require_quiz_pass,
      'require_assignment_pass', v_course.require_assignment_pass,
      'auto_issue_certificate', v_course.auto_issue_certificate
    ),
    'rows', v_rows
  );
end;
$$;

grant execute on function public.get_course_gradebook(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 6. 修了証発行 RPC
-- ---------------------------------------------------------------
-- 認可: 受講者本人 (自分の達成済みコース) または同テナント staff (講師承認)。
-- 基準未達なら例外。 既発行ならべき等に既存の修了証を返す。
-- 発行時に enrollment を completed にする (あれば)。

create or replace function public.issue_certificate(
  p_user_id uuid,
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_tenant text := public.current_tenant_id();
  v_caller_role   text := public.current_role();
  v_uid           uuid := auth.uid();
  v_course        public.courses%rowtype;
  v_completion    jsonb;
  v_existing      public.certificates%rowtype;
  v_code          text;
  v_recipient     text;
  v_tenant_name   text;
  v_issued_by     uuid;
  v_new           public.certificates%rowtype;
begin
  if v_uid is null or v_caller_tenant is null then
    raise exception 'not authenticated';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.tenant_id <> v_caller_tenant then
    raise exception 'course not found';
  end if;

  -- 認可。
  if not (p_user_id = v_uid or v_caller_role in ('instructor','admin')) then
    raise exception 'not authorized to issue this certificate';
  end if;

  -- 自動発行を許可しないコースは、 受講者本人による発行を拒否する (講師承認のみ)。
  if v_caller_role not in ('instructor','admin')
     and not v_course.auto_issue_certificate then
    raise exception 'certificate requires instructor approval';
  end if;

  -- 対象ユーザーが同テナントかつ当該コースに受講登録済みであることを必須化する。
  -- enrollment 行は (user_id, course_id) 一意で tenant_id を持つため、 これ 1 つで
  -- 「越テナント発行」 と 「未割当コースへの発行」 の両方を遮断できる。
  if not exists (
    select 1 from public.enrollments e
     where e.user_id = p_user_id
       and e.course_id = p_course_id
       and e.tenant_id = v_caller_tenant
  ) then
    raise exception 'user is not enrolled in this course';
  end if;

  -- 基準達成チェック (発行の唯一の前提)。
  v_completion := public.compute_course_completion(p_user_id, p_course_id);
  if v_completion is null then
    raise exception 'cannot evaluate completion for this user/course';
  end if;
  if not (v_completion->>'met')::boolean then
    raise exception 'completion criteria not met';
  end if;

  -- denormalize 用の名称を解決。
  select display_name into v_recipient from public.profiles where id = p_user_id;
  if v_recipient is null then
    raise exception 'recipient profile not found';
  end if;
  select name into v_tenant_name from public.tenants where id = v_course.tenant_id;

  -- 自動発行 (本人 / 基準達成) と staff 承認発行を区別する。
  v_issued_by := case when v_caller_role in ('instructor','admin') then v_uid else null end;

  -- 一意な cert_code を生成 (衝突時はリトライ)。
  loop
    v_code := 'FLC-' || to_char(now(), 'YYYY') || '-' ||
      upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
      upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
    exit when not exists (select 1 from public.certificates where cert_code = v_code);
  end loop;

  -- 既存確認 → insert を分離すると同時実行で一意制約衝突になり得るため、
  -- ON CONFLICT DO NOTHING で原子的に発行し、 衝突時 (= 既発行) は既存を返す。
  insert into public.certificates
    (tenant_id, user_id, course_id, cert_code, issued_by, criteria_snapshot,
     recipient_name, course_title, tenant_name)
  values
    (v_course.tenant_id, p_user_id, p_course_id, v_code, v_issued_by, v_completion,
     v_recipient, v_course.title, coalesce(v_tenant_name, v_course.tenant_id))
  on conflict (user_id, course_id) do nothing
  returning * into v_new;

  if v_new.id is null then
    select * into v_existing
      from public.certificates
     where user_id = p_user_id and course_id = p_course_id;
    return jsonb_build_object(
      'id', v_existing.id,
      'cert_code', v_existing.cert_code,
      'course_id', v_existing.course_id,
      'user_id', v_existing.user_id,
      'issued_at', v_existing.issued_at,
      'recipient_name', v_existing.recipient_name,
      'course_title', v_existing.course_title,
      'tenant_name', v_existing.tenant_name,
      'revoked', v_existing.revoked,
      'already_existed', true
    );
  end if;

  -- enrollment を completed にする。 既に completed の場合は元の完了日時を保持する。
  update public.enrollments
     set status = 'completed', completed_at = now()
   where user_id = p_user_id and course_id = p_course_id
     and status <> 'completed';

  return jsonb_build_object(
    'id', v_new.id,
    'cert_code', v_new.cert_code,
    'course_id', v_new.course_id,
    'user_id', v_new.user_id,
    'issued_at', v_new.issued_at,
    'recipient_name', v_new.recipient_name,
    'course_title', v_new.course_title,
    'tenant_name', v_new.tenant_name,
    'revoked', v_new.revoked,
    'already_existed', false
  );
end;
$$;

grant execute on function public.issue_certificate(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- 7. 公開検証 RPC (匿名実行可)
-- ---------------------------------------------------------------
-- cert_code から真正性を確認する。 テーブルを匿名公開せず、 公開して問題ない
-- denormalize 済みの情報のみ返す。 失効 / 不存在は valid=false / null で表す。

create or replace function public.verify_certificate(p_cert_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cert public.certificates%rowtype;
begin
  if p_cert_code is null or length(trim(p_cert_code)) = 0 then
    return null;
  end if;

  select * into v_cert
    from public.certificates
   where cert_code = upper(trim(p_cert_code));

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if v_cert.revoked then
    return jsonb_build_object(
      'valid', false,
      'reason', 'revoked',
      'cert_code', v_cert.cert_code
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'cert_code', v_cert.cert_code,
    'recipient_name', v_cert.recipient_name,
    'course_title', v_cert.course_title,
    'tenant_name', v_cert.tenant_name,
    'issued_at', v_cert.issued_at
  );
end;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
