-- =================================================================
-- 分析ダッシュボードの実データ集計 (Issue #28 / P2)
--
-- KPI ダッシュボードと講師ダッシュボードの「ハードコード / fixtures」 を、
-- enrollment + lesson_progress + quiz_attempts + submissions + certificates から
-- 算出する実データ集計に置き換えるための RPC を提供する。
--
--   get_tenant_analytics()      : 管理者ダッシュボード用テナント KPI 一式 (jsonb)
--   get_instructor_overview()   : 講師ダッシュボード用の未返信 / 遅延 / 進捗 (jsonb)
--
-- 採点・判定ロジック (compute_course_completion 等) と同様、 集計はすべて
-- security definer RPC に集約し、 呼び出し元が「同テナントの instructor/admin」
-- であることを検証する (current_tenant_id() / current_role())。 越テナント参照は
-- current_tenant_id() を母集合に使うことで構造的に遮断する。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルを実行する。
--   前提: 20260519000000_cms_foundation.sql (courses / sections / lessons /
--         profiles / tenants / current_tenant_id() / current_role()),
--         20260607000000_lesson_progress.sql, 20260608000000_quiz.sql,
--         20260608010000_enrollments.sql, 20260608030000_notifications.sql (questions は
--         20260608020000_qa.sql), 20260609000000_certificates.sql,
--         20260525000000_submissions_reviews.sql が適用済みであること。
-- =================================================================

-- ---------------------------------------------------------------
-- 1. 管理者ダッシュボード — テナント KPI 集計
-- ---------------------------------------------------------------
-- 戻り値 (jsonb):
--   active_learners            : status='active' の enrollment を持つ受講者数 (distinct)
--   total_learners             : 無効化されていない student 数
--   completion_rate            : completed enrollment / 全 enrollment (%)
--   certs_this_month           : 当月発行された修了証数 (revoked 除く)
--   certs_total                : 累計発行数 (revoked 除く)
--   avg_study_hours            : 受講者あたりの平均学習時間 (lesson_progress.watched_sec の累計)
--   new_enrollments_this_month : 当月の新規受講登録数
--   new_enrollments_prev_month : 前月の新規受講登録数 (前月比トレンド用)
--   enrollment_trend           : 直近 12 ヶ月の月次新規登録数 [{month,label,count}]
--   completion_by_course       : コース別の登録者数 n と完了率 pct [{course_id,name,n,pct}]
--   stumbles                   : 正答率の低い小テスト設問 [{question_id,prompt,n,correct_pct}]
--   status_breakdown           : enrollment の状態別件数 {active,completed,expired}
--   generated_at               : 集計時刻

create or replace function public.get_tenant_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant text := public.current_tenant_id();
  v_role   text := public.current_role();
  v_now    timestamptz := now();
  v_month_start timestamptz := date_trunc('month', now());
  v_prev_month_start timestamptz := date_trunc('month', now()) - interval '1 month';

  v_active_learners int := 0;
  v_total_learners  int := 0;
  v_total_enroll    int := 0;
  v_completed_enroll int := 0;
  v_expired_enroll  int := 0;
  v_active_enroll   int := 0;
  v_completion_rate numeric := 0;
  v_certs_month     int := 0;
  v_certs_total     int := 0;
  v_avg_hours       numeric := 0;
  v_new_month       int := 0;
  v_new_prev        int := 0;
  v_trend           jsonb := '[]'::jsonb;
  v_by_course       jsonb := '[]'::jsonb;
  v_stumbles        jsonb := '[]'::jsonb;
begin
  -- 認可: 同テナントの instructor/admin のみ。 無効化ユーザーは current_* が null。
  if v_tenant is null or v_role not in ('instructor','admin') then
    return null;
  end if;

  -- 受講者数。
  select count(*) into v_total_learners
    from public.profiles
   where tenant_id = v_tenant
     and role = 'student'
     and coalesce(disabled, false) = false;

  select count(distinct user_id) into v_active_learners
    from public.enrollments
   where tenant_id = v_tenant
     and status = 'active';

  -- enrollment 状態別。
  select
    count(*),
    count(*) filter (where status = 'completed'),
    count(*) filter (where status = 'expired'),
    count(*) filter (where status = 'active'),
    count(*) filter (where enrolled_at >= v_month_start),
    count(*) filter (where enrolled_at >= v_prev_month_start and enrolled_at < v_month_start)
  into v_total_enroll, v_completed_enroll, v_expired_enroll, v_active_enroll, v_new_month, v_new_prev
  from public.enrollments
  where tenant_id = v_tenant;

  v_completion_rate := case
    when v_total_enroll = 0 then 0
    else round(v_completed_enroll::numeric * 100 / v_total_enroll)
  end;

  -- 修了証 (revoked は除外)。
  select
    count(*) filter (where issued_at >= v_month_start),
    count(*)
  into v_certs_month, v_certs_total
  from public.certificates
  where tenant_id = v_tenant
    and revoked = false;

  -- 平均学習時間 (時間)。 lesson_progress.watched_sec の受講者あたり累計。
  select coalesce(round(
    sum(coalesce(watched_sec, 0)) / nullif(count(distinct user_id), 0) / 3600.0,
    1
  ), 0)
  into v_avg_hours
  from public.lesson_progress
  where tenant_id = v_tenant;

  -- 直近 12 ヶ月の月次新規登録数。 空月も 0 で埋める。
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(m.month, 'YYYY-MM'),
      'label', to_char(m.month, 'FMMM') || '月',
      'count', coalesce(e.cnt, 0)
    )
    order by m.month
  ), '[]'::jsonb)
  into v_trend
  from (
    select generate_series(
      date_trunc('month', v_now) - interval '11 months',
      date_trunc('month', v_now),
      interval '1 month'
    ) as month
  ) m
  left join (
    select date_trunc('month', enrolled_at) as month, count(*) as cnt
      from public.enrollments
     where tenant_id = v_tenant
     group by 1
  ) e on e.month = m.month;

  -- コース別の登録者数と完了率。
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'course_id', t.id,
      'name', t.title,
      'n', t.n,
      'pct', case when t.n = 0 then 0 else round(t.done::numeric * 100 / t.n) end
    )
    order by t.n desc, t.title
  ), '[]'::jsonb)
  into v_by_course
  from (
    select c.id, c.title,
           count(e.id) as n,
           count(e.id) filter (where e.status = 'completed') as done
      from public.courses c
      left join public.enrollments e
        on e.course_id = c.id and e.tenant_id = v_tenant
     where c.tenant_id = v_tenant
     group by c.id, c.title
     having count(e.id) > 0
  ) t;

  -- 小テストのつまずき分析。 各設問について、 その小テストの全 attempt の回答を
  -- 正解集合と突き合わせて正答率を算出する (順不同・重複は無視)。 正答率の低い順。
  select coalesce(jsonb_agg(s.row order by s.correct_pct asc, s.n desc), '[]'::jsonb)
  into v_stumbles
  from (
    select
      qq.id as question_id,
      count(*) as n,
      case when count(*) = 0 then 0
           else round(count(*) filter (where sel.is_correct)::numeric * 100 / count(*))
      end as correct_pct,
      jsonb_build_object(
        'question_id', qq.id,
        'prompt', qq.prompt,
        'n', count(*),
        'correct_pct', case when count(*) = 0 then 0
          else round(count(*) filter (where sel.is_correct)::numeric * 100 / count(*)) end
      ) as row
    from public.quiz_questions qq
    join public.quizzes qz on qz.id = qq.quiz_id
    join public.lessons l on l.id = qz.lesson_id
    join public.sections sec on sec.id = l.section_id
    join public.courses c on c.id = sec.course_id
    join public.quiz_attempts qa on qa.quiz_id = qz.id and qa.tenant_id = v_tenant
    cross join lateral (
      select coalesce(array_agg(x::uuid), '{}'::uuid[]) as selected
      from (
        select distinct jsonb_array_elements_text(ans->'selected_option_ids') as x
          from jsonb_array_elements(qa.answers) ans
         where (ans->>'question_id') = qq.id::text
      ) picked
    ) selq
    cross join lateral (
      select coalesce(array_agg(qo.id), '{}'::uuid[]) as correct_ids
        from public.quiz_options qo
       where qo.question_id = qq.id and qo.is_correct
    ) corq
    cross join lateral (
      select (selq.selected @> corq.correct_ids and selq.selected <@ corq.correct_ids) as is_correct
    ) sel
    where c.tenant_id = v_tenant
    group by qq.id, qq.prompt
    having count(*) >= 1
    order by correct_pct asc, n desc
    limit 8
  ) s;

  return jsonb_build_object(
    'active_learners', v_active_learners,
    'total_learners', v_total_learners,
    'completion_rate', v_completion_rate,
    'certs_this_month', v_certs_month,
    'certs_total', v_certs_total,
    'avg_study_hours', v_avg_hours,
    'new_enrollments_this_month', v_new_month,
    'new_enrollments_prev_month', v_new_prev,
    'enrollment_trend', v_trend,
    'completion_by_course', v_by_course,
    'stumbles', v_stumbles,
    'status_breakdown', jsonb_build_object(
      'active', v_active_enroll,
      'completed', v_completed_enroll,
      'expired', v_expired_enroll
    ),
    'generated_at', v_now
  );
end;
$$;

grant execute on function public.get_tenant_analytics() to authenticated;

-- ---------------------------------------------------------------
-- 2. 講師ダッシュボード — 未返信 / 遅延 / 受講者進捗
-- ---------------------------------------------------------------
-- 本スキーマには「講師 ↔ 受講者」 の明示的な担当割当が無いため、 講師の母集合は
-- 同テナント全体とする。 戻り値 (jsonb):
--   open_questions   : 未回答 (status='open') の Q&A 件数
--   overdue_learners : 期限超過かつ未完了の active enrollment 数
--   total_learners   : enrollment を持つ受講者数 (distinct)
--   students         : 期限が近い順の受講者進捗サンプル [{user_id,display_name,initials,
--                      course_title,progress_pct,overdue}]

create or replace function public.get_instructor_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant text := public.current_tenant_id();
  v_role   text := public.current_role();
  v_open   int := 0;
  v_overdue int := 0;
  v_total  int := 0;
  v_students jsonb := '[]'::jsonb;
begin
  if v_tenant is null or v_role not in ('instructor','admin') then
    return null;
  end if;

  select count(*) into v_open
    from public.questions
   where tenant_id = v_tenant
     and status = 'open';

  select count(*) into v_overdue
    from public.enrollments
   where tenant_id = v_tenant
     and status = 'active'
     and due_at is not null
     and due_at < now();

  select count(distinct user_id) into v_total
    from public.enrollments
   where tenant_id = v_tenant;

  -- 受講者進捗サンプル: active enrollment を期限の近い順に最大 6 件。
  -- 進捗率はコースの全レッスンに対する完了レッスン比。
  select coalesce(jsonb_agg(r.row order by r.due_sort asc), '[]'::jsonb)
  into v_students
  from (
    select
      jsonb_build_object(
        'user_id', e.user_id,
        'display_name', p.display_name,
        'initials', p.initials,
        'course_title', c.title,
        'progress_pct', case when prog.total = 0 then 0
          else round(prog.done::numeric * 100 / prog.total) end,
        'overdue', (e.due_at is not null and e.due_at < now())
      ) as row,
      coalesce(e.due_at, 'infinity'::timestamptz) as due_sort
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    join public.courses c on c.id = e.course_id
    cross join lateral (
      select
        count(l.id) as total,
        count(l.id) filter (
          where exists (
            select 1 from public.lesson_progress lp
             where lp.user_id = e.user_id
               and lp.lesson_id = l.id::text
               and lp.completed
          )
        ) as done
      from public.lessons l
      join public.sections s on s.id = l.section_id
      where s.course_id = e.course_id
    ) prog
    where e.tenant_id = v_tenant
      and e.status = 'active'
    order by due_sort asc
    limit 6
  ) r;

  return jsonb_build_object(
    'open_questions', v_open,
    'overdue_learners', v_overdue,
    'total_learners', v_total,
    'students', v_students
  );
end;
$$;

grant execute on function public.get_instructor_overview() to authenticated;
