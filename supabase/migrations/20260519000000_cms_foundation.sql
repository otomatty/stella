-- =================================================================
-- Course Material CMS foundation (Issue #10)
--
-- 教材 CMS (講師が UI からコース/レッスン/課題を作成・編集できる) 用の
-- 永続化基盤 (テナント / プロフィール / コース / セクション / レッスン / 課題)
-- とアクセス制御 (RLS + Storage policy)。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor で本ファイルを実行する。
--   既存の Storage バケット `materials-public` がある前提。 無ければ自動で作成する。
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. テナント / プロフィール
-- ---------------------------------------------------------------

create table if not exists public.tenants (
  id text primary key,
  name text not null,
  subtitle text,
  icon text,
  active_count int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.tenants (id, name, subtitle, icon) values
  ('coach', '部活動指導者', '地域スポーツ指導者講習', 'school'),
  ('ses',   'SES未経験エンジニア育成', 'エンジニア研修 / 資格対策', 'cpu')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id text not null references public.tenants(id) on delete restrict,
  role text not null check (role in ('student','instructor','admin')) default 'student',
  display_name text not null,
  initials text,
  email text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_tenant_idx on public.profiles(tenant_id);

-- ---------------------------------------------------------------
-- 2. コース / セクション / レッスン
-- ---------------------------------------------------------------

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  category text,
  color text check (color in ('indigo','green','amber','slate')),
  duration_hours int,
  description text,
  status text not null check (status in ('draft','published','archived')) default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists courses_tenant_idx on public.courses(tenant_id);
create index if not exists courses_status_idx on public.courses(tenant_id, status);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sections_course_idx on public.sections(course_id, "order");

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  title text not null,
  type text not null check (type in ('video','slides','text','quiz','assignment','code')),
  "order" int not null default 0,
  duration_label text,
  video_path text,
  pdf_path text,
  markdown text,
  -- FK にしないのは assignment id 形式が text かつ @falcon/shared 由来のものを参照する場合があるため。
  -- 整合性は CMS 側 (アプリケーション層) で担保する。
  assignment_id text,
  total_pages int,
  total_sec int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_section_idx on public.lessons(section_id, "order");
create index if not exists lessons_assignment_idx on public.lessons(assignment_id);

-- ---------------------------------------------------------------
-- 3. 課題定義
-- ---------------------------------------------------------------

create table if not exists public.assignments (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  stage text not null check (stage in ('S0','S1','S2','S3','S4','S5')),
  chapter_id text not null,
  title text not null,
  description text not null default '',
  language text not null default 'javascript' check (language in ('javascript','sql')),
  test_kind text not null check (test_kind in ('stdout','function','sql','mutation','eslint-config')),
  starter_files jsonb not null default '[]'::jsonb,
  entry_file text,
  entry_points jsonb,
  tests jsonb not null default '[]'::jsonb,
  sql_seed text,
  lint_preset text check (lint_preset in ('S1','S2','S3','S4','S5')),
  static_analysis jsonb,
  mutation jsonb,
  demo_call text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 既存環境 (本マイグレーション以前を適用済み) でも欠落列を補えるよう defensive に追加。
alter table public.assignments add column if not exists demo_call text;
create index if not exists assignments_tenant_idx on public.assignments(tenant_id);
create index if not exists assignments_chapter_idx on public.assignments(stage, chapter_id);

-- ---------------------------------------------------------------
-- 4. updated_at トリガー
-- ---------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 5. ヘルパー SQL 関数 (RLS で参照)
-- ---------------------------------------------------------------

create or replace function public.current_tenant_id()
returns text language sql stable security definer set search_path = public as
$$ select tenant_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

grant execute on function public.current_tenant_id() to authenticated, anon;
grant execute on function public.current_role() to authenticated, anon;

-- ---------------------------------------------------------------
-- 5b. アトミックな並び替え RPC
-- ---------------------------------------------------------------
-- 個別 UPDATE を逐次 / 並列で打つと部分的失敗で不整合が残る。
-- 単一 UPDATE + unnest with ordinality で原子的に全行を更新する。
-- security invoker なので RLS (sections_write / lessons_write) が引き続き適用される。

create or replace function public.reorder_sections(p_course_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.sections
     set "order" = (t.idx - 1)::int
    from unnest(p_ids) with ordinality as t(id, idx)
   where public.sections.id = t.id
     and public.sections.course_id = p_course_id;
$$;

create or replace function public.reorder_lessons(p_section_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.lessons
     set "order" = (t.idx - 1)::int
    from unnest(p_ids) with ordinality as t(id, idx)
   where public.lessons.id = t.id
     and public.lessons.section_id = p_section_id;
$$;

grant execute on function public.reorder_sections(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_lessons(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------
-- 6. RLS 有効化 + ポリシー
-- ---------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.lessons enable row level security;
alter table public.assignments enable row level security;

-- tenants: 認証済みは全件 read 可。 書き込みは管理者のみ (将来枠) — MVP では service role 経由のみ。
drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants
  for select to authenticated using (true);

-- profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (public.current_role() in ('instructor','admin') and tenant_id = public.current_tenant_id())
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    -- 自己昇格を防ぐ。 instructor / admin への変更は SQL Editor で運用者が行う。
    and role = 'student'
    -- FK で既に存在チェックされるが、 明示的に policy にも記述し
    -- ポリシー違反としてのエラーメッセージで失敗できるようにする (defense-in-depth)。
    and exists (select 1 from public.tenants t where t.id = tenant_id)
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- 自分の role / tenant_id 変更は不可。 変更したい場合は管理者が SQL Editor で行う。
    and role = (select role from public.profiles where id = auth.uid())
    and tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

-- courses
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      status = 'published'
      or public.current_role() in ('instructor','admin')
    )
  );

drop policy if exists courses_write on public.courses;
create policy courses_write on public.courses
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- sections (親 course のテナント/状態を継承)
drop policy if exists sections_read on public.sections;
create policy sections_read on public.sections
  for select to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = sections.course_id
        and c.tenant_id = public.current_tenant_id()
        and (c.status = 'published' or public.current_role() in ('instructor','admin'))
    )
  );

drop policy if exists sections_write on public.sections;
create policy sections_write on public.sections
  for all to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.courses c
      where c.id = sections.course_id
        and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1 from public.courses c
      where c.id = sections.course_id
        and c.tenant_id = public.current_tenant_id()
    )
  );

-- lessons (親 section -> course のテナント/状態を継承)
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to authenticated
  using (
    exists (
      select 1
        from public.sections s
        join public.courses c on c.id = s.course_id
       where s.id = lessons.section_id
         and c.tenant_id = public.current_tenant_id()
         and (c.status = 'published' or public.current_role() in ('instructor','admin'))
    )
  );

drop policy if exists lessons_write on public.lessons;
create policy lessons_write on public.lessons
  for all to authenticated
  using (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.sections s
        join public.courses c on c.id = s.course_id
       where s.id = lessons.section_id
         and c.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.current_role() in ('instructor','admin')
    and exists (
      select 1
        from public.sections s
        join public.courses c on c.id = s.course_id
       where s.id = lessons.section_id
         and c.tenant_id = public.current_tenant_id()
    )
  );

-- assignments
drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists assignments_write on public.assignments;
create policy assignments_write on public.assignments
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

-- ---------------------------------------------------------------
-- 7. Storage バケット `materials-public` のポリシー
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('materials-public', 'materials-public', true)
on conflict (id) do nothing;

-- public read は CMS 以前から既存。 念の為 additive に再定義。
drop policy if exists materials_public_read on storage.objects;
create policy materials_public_read on storage.objects
  for select to public
  using (bucket_id = 'materials-public');

-- 書き込みは instructor/admin かつ tenant/{tenant_id}/... プレフィクスのみ。
drop policy if exists materials_public_write on storage.objects;
create policy materials_public_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'materials-public'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[2] = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

drop policy if exists materials_public_update on storage.objects;
create policy materials_public_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'materials-public'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[2] = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );

drop policy if exists materials_public_delete on storage.objects;
create policy materials_public_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'materials-public'
    and (storage.foldername(name))[1] = 'tenant'
    and (storage.foldername(name))[2] = public.current_tenant_id()
    and public.current_role() in ('instructor','admin')
  );
