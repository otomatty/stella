-- =================================================================
-- Instructor review workflow (Issue #8 / P3)
--
-- 提出物と講師添削結果の永続化。 ローカルデモは localStorage が主で、
-- Supabase 設定時は本マイグレーション適用後に API 拡張で読み書き可能。
-- =================================================================

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  assignment_id text,
  course_title text not null,
  section_title text,
  assignment_title text not null,
  code text not null,
  status text not null check (status in ('pending','passed','resubmit','failed')) default 'pending',
  priority text not null check (priority in ('high','normal','low')) default 'normal',
  attempt int not null default 1,
  ai_ready boolean not null default false,
  ai_suggestions jsonb not null default '[]'::jsonb,
  rubric jsonb not null default '[]'::jsonb,
  review_notes text not null default '',
  verdict text check (verdict in ('pass','resubmit','fail')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id) on delete set null
);

create index if not exists submissions_tenant_status_idx
  on public.submissions(tenant_id, status, submitted_at desc);

alter table public.submissions enable row level security;

-- 受講者: 自分の提出のみ insert / select
create policy submissions_student_insert on public.submissions
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

create policy submissions_student_select on public.submissions
  for select to authenticated
  using (student_id = auth.uid());

-- 講師 / 管理者: テナント内の提出物を閲覧・更新 (status はアプリ層で pending 等にマップ)
create policy submissions_instructor_select on public.submissions
  for select to authenticated
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('instructor','admin')
  );

create policy submissions_instructor_update on public.submissions
  for update to authenticated
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('instructor','admin')
  )
  with check (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('instructor','admin')
  );
