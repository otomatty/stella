-- =================================================================
-- 小テスト (Quiz) 機能 (Issue #23 / P1)
--
-- レッスンタイプ `quiz` をデータ駆動の実機能にする。 設問の作成・出題・
-- 採点・スコア保存を成立させる。
--
--   quizzes        : lesson に紐付く設定 (合格点 / 制限時間 / シャッフル / 試行上限)
--   quiz_questions : 設問 (単一選択 single / 複数選択 multiple / 真偽 boolean)
--   quiz_options   : 選択肢 + 正誤
--   quiz_attempts  : 受講者の回答 (score / passed / answers jsonb)
--
-- 採点は **サーバ側 RPC (submit_quiz_attempt)** で行う。 正解 (is_correct) を
-- 受講者へ送らないよう、 設問テーブルの SELECT は staff のみに付与し、 受講者は
-- get_quiz_for_lesson RPC でサニタイズされた設問を受け取る (カンニング不可)。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルを実行する。
--   前提: 20260519000000_cms_foundation.sql が適用済み
--         (lessons / sections / courses / current_tenant_id() / current_role()
--          / set_updated_at() を参照する)。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. テーブル
-- ---------------------------------------------------------------

-- quizzes: lesson 1 件につき 1 quiz (unique lesson_id)。
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  -- 合格に必要な得点率 (%)
  pass_score int not null default 70 check (pass_score between 0 and 100),
  -- 制限時間 (秒)。 null = 無制限。 (UI のタイマーは将来対応の列確保)
  time_limit_sec int,
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  -- 再受験上限。 null = 無制限。 (列確保。 現状 UI では未強制)
  max_attempts int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id)
);

-- quiz_questions: 設問。
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  kind text not null check (kind in ('single','multiple','boolean')),
  prompt text not null default '',
  -- 提出後に表示する解説 (任意)
  explanation text,
  points int not null default 1 check (points >= 0),
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quiz_questions_quiz_idx
  on public.quiz_questions(quiz_id, "order");

-- quiz_options: 選択肢 + 正誤。
create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null default '',
  is_correct boolean not null default false,
  "order" int not null default 0
);
create index if not exists quiz_options_question_idx
  on public.quiz_options(question_id, "order");

-- quiz_attempts: 受講者の回答結果。
-- lesson_progress と同じく tenant_id を保持し RLS をシンプルにする。
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null,
  max_score int not null,
  passed boolean not null,
  -- 受講者が送った回答 [{question_id, selected_option_ids:[...]}]
  answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx
  on public.quiz_attempts(user_id);
create index if not exists quiz_attempts_tenant_quiz_idx
  on public.quiz_attempts(tenant_id, quiz_id);

-- ---------------------------------------------------------------
-- 2. updated_at トリガー
-- ---------------------------------------------------------------

drop trigger if exists set_quizzes_updated_at on public.quizzes;
create trigger set_quizzes_updated_at before update on public.quizzes
  for each row execute function public.set_updated_at();

drop trigger if exists set_quiz_questions_updated_at on public.quiz_questions;
create trigger set_quiz_questions_updated_at before update on public.quiz_questions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;

-- quizzes: staff (instructor/admin) のみ read+write。
-- 受講者には SELECT を付与せず、 出題は get_quiz_for_lesson RPC 経由のみ。
drop policy if exists quizzes_staff_all on public.quizzes;
create policy quizzes_staff_all on public.quizzes
  for all to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.lessons l
        join public.sections s on s.id = l.section_id
        join public.courses c on c.id = s.course_id
       where l.id = quizzes.lesson_id
         and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.lessons l
        join public.sections s on s.id = l.section_id
        join public.courses c on c.id = s.course_id
       where l.id = quizzes.lesson_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

-- quiz_questions: staff のみ (親 quiz -> lesson -> course の tenant を継承)。
drop policy if exists quiz_questions_staff_all on public.quiz_questions;
create policy quiz_questions_staff_all on public.quiz_questions
  for all to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.quizzes q
        join public.lessons l on l.id = q.lesson_id
        join public.sections s on s.id = l.section_id
        join public.courses c on c.id = s.course_id
       where q.id = quiz_questions.quiz_id
         and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.quizzes q
        join public.lessons l on l.id = q.lesson_id
        join public.sections s on s.id = l.section_id
        join public.courses c on c.id = s.course_id
       where q.id = quiz_questions.quiz_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

-- quiz_options: staff のみ (親 question -> quiz -> lesson -> course を継承)。
drop policy if exists quiz_options_staff_all on public.quiz_options;
create policy quiz_options_staff_all on public.quiz_options
  for all to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.quiz_questions qq
        join public.quizzes q on q.id = qq.quiz_id
        join public.lessons l on l.id = q.lesson_id
        join public.sections s on s.id = l.section_id
        join public.courses c on c.id = s.course_id
       where qq.id = quiz_options.question_id
         and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.quiz_questions qq
        join public.quizzes q on q.id = qq.quiz_id
        join public.lessons l on l.id = q.lesson_id
        join public.sections s on s.id = l.section_id
        join public.courses c on c.id = s.course_id
       where qq.id = quiz_options.question_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

-- quiz_attempts: 受講者本人は自分の attempt を read のみ。 staff は同テナント read。
-- 挿入・採点は security definer RPC (submit_quiz_attempt) 経由で行うため、 受講者ロールに
-- INSERT/UPDATE/DELETE を許可しない (許可するとスコア書き換えでチート可能になる)。
drop policy if exists quiz_attempts_rw_self on public.quiz_attempts;
drop policy if exists quiz_attempts_read_self on public.quiz_attempts;
create policy quiz_attempts_read_self on public.quiz_attempts
  for select to authenticated
  using (user_id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy if exists quiz_attempts_read_staff on public.quiz_attempts;
create policy quiz_attempts_read_staff on public.quiz_attempts
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- ---------------------------------------------------------------
-- 4. 受講者向け出題 RPC (サニタイズ済み: is_correct / explanation を含めない)
-- ---------------------------------------------------------------
-- security definer でテーブル RLS を迂回しつつ、 呼び出し元が staff か
-- 「公開コースの同テナント受講者」 であることを検証する。

create or replace function public.get_quiz_for_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant text := public.current_tenant_id();
  v_role   text := public.current_role();
  v_quiz   public.quizzes%rowtype;
  v_authorized boolean;
  v_result jsonb;
begin
  if v_tenant is null then
    return null;
  end if;

  select * into v_quiz from public.quizzes where lesson_id = p_lesson_id;
  if not found then
    return null;
  end if;

  -- アクセス可否: staff は同テナント、 受講者は公開コース配下のみ。
  select exists (
    select 1
      from public.lessons l
      join public.sections s on s.id = l.section_id
      join public.courses c on c.id = s.course_id
     where l.id = p_lesson_id
       and c.tenant_id = v_tenant
       and (c.status = 'published' or v_role in ('instructor','admin'))
  ) into v_authorized;

  if not v_authorized then
    return null;
  end if;

  select jsonb_build_object(
    'quiz', jsonb_build_object(
      'id', v_quiz.id,
      'lesson_id', v_quiz.lesson_id,
      'pass_score', v_quiz.pass_score,
      'time_limit_sec', v_quiz.time_limit_sec,
      'shuffle_questions', v_quiz.shuffle_questions,
      'shuffle_options', v_quiz.shuffle_options,
      'max_attempts', v_quiz.max_attempts
    ),
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'kind', qq.kind,
          'prompt', qq.prompt,
          'points', qq.points,
          'order', qq."order",
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object('id', qo.id, 'label', qo.label, 'order', qo."order")
              order by qo."order", qo.id
            )
            from public.quiz_options qo
            where qo.question_id = qq.id
          ), '[]'::jsonb)
        )
        order by qq."order", qq.id
      )
      from public.quiz_questions qq
      where qq.quiz_id = v_quiz.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_quiz_for_lesson(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 5. サーバ採点 + attempt 保存 RPC
-- ---------------------------------------------------------------
-- p_answers 形式: [{ "question_id": "<uuid>", "selected_option_ids": ["<uuid>", ...] }]
-- 採点: single/boolean は正解 1 つと完全一致、 multiple は正解集合と完全一致で得点。
-- 戻り値: { score, max_score, passed, results:[{question_id, correct, correct_option_ids, explanation}] }
-- 正解・解説は提出後にのみ返す。

create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant text := public.current_tenant_id();
  v_role   text := public.current_role();
  v_uid    uuid := auth.uid();
  v_quiz   public.quizzes%rowtype;
  v_authorized boolean;
  v_score int := 0;
  v_max int := 0;
  v_passed boolean;
  v_results jsonb := '[]'::jsonb;
  r record;
  v_selected uuid[];
  v_correct uuid[];
  v_is_correct boolean;
begin
  if v_uid is null or v_tenant is null then
    raise exception 'not authenticated';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'quiz not found';
  end if;

  -- 公開コースの同テナント受講者、 または staff のみ受験可。
  select exists (
    select 1
      from public.lessons l
      join public.sections s on s.id = l.section_id
      join public.courses c on c.id = s.course_id
     where l.id = v_quiz.lesson_id
       and c.tenant_id = v_tenant
       and (c.status = 'published' or v_role in ('instructor','admin'))
  ) into v_authorized;

  if not v_authorized then
    raise exception 'not authorized for this quiz';
  end if;

  -- 各設問を採点。
  for r in
    select qq.id, qq.kind, qq.points, qq.explanation
      from public.quiz_questions qq
     where qq.quiz_id = p_quiz_id
     order by qq."order", qq.id
  loop
    v_max := v_max + r.points;

    -- 受講者が選んだ option id 集合 (該当設問)
    select coalesce(array_agg(elem::uuid), '{}'::uuid[])
      into v_selected
      from (
        select distinct jsonb_array_elements_text(a->'selected_option_ids') as elem
          from jsonb_array_elements(p_answers) as a
         where (a->>'question_id')::uuid = r.id
      ) s;

    -- 正解の option id 集合
    select coalesce(array_agg(qo.id), '{}'::uuid[])
      into v_correct
      from public.quiz_options qo
     where qo.question_id = r.id and qo.is_correct;

    -- 集合の完全一致で正誤判定 (順不同・重複無視)。 配列包含演算子で簡潔に。
    v_is_correct := (v_selected @> v_correct) and (v_selected <@ v_correct);

    if v_is_correct then
      v_score := v_score + r.points;
    end if;

    v_results := v_results || jsonb_build_object(
      'question_id', r.id,
      'correct', v_is_correct,
      'correct_option_ids', to_jsonb(v_correct),
      'explanation', r.explanation
    );
  end loop;

  v_passed := case
    when v_max = 0 then true
    else (v_score::numeric * 100 / v_max) >= v_quiz.pass_score
  end;

  insert into public.quiz_attempts
    (tenant_id, quiz_id, user_id, score, max_score, passed, answers, submitted_at)
  values
    (v_tenant, p_quiz_id, v_uid, v_score, v_max, v_passed, coalesce(p_answers, '[]'::jsonb), now());

  return jsonb_build_object(
    'score', v_score,
    'max_score', v_max,
    'passed', v_passed,
    'results', v_results
  );
end;
$$;

grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
