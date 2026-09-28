-- Run this in Supabase Dashboard > SQL Editor > New query.
-- Each student can manage only their own progress. Approved school admins can read all progress.

create table if not exists public.student_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  student_name text not null default 'طالب',
  answers jsonb not null default '{}'::jsonb,
  tf_answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_progress add column if not exists student_name text not null default 'طالب';
alter table public.student_progress enable row level security;
revoke all privileges on table public.student_progress from anon, authenticated;
grant select, insert, update on table public.student_progress to authenticated;

create table if not exists public.school_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.school_admins enable row level security;
revoke all privileges on table public.school_admins from anon, authenticated;
grant select on table public.school_admins to authenticated;

drop policy if exists "Students can read their own progress" on public.student_progress;
create policy "Students can read their own progress"
  on public.student_progress for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Students can create their own progress" on public.student_progress;
create policy "Students can create their own progress"
  on public.student_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Students can update their own progress" on public.student_progress;
create policy "Students can update their own progress"
  on public.student_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "School admins can read all student progress" on public.student_progress;
drop policy if exists "School admins can read their admin record" on public.school_admins;
create policy "School admins can read their admin record"
  on public.school_admins for select to authenticated
  using ((select auth.uid()) = user_id);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.school_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_school_admin() from public, anon;
grant execute on function private.is_school_admin() to authenticated;

create policy "School admins can read all student progress"
  on public.student_progress for select to authenticated
  using ((select private.is_school_admin()));

-- To grant a specific account school-admin access, first create and confirm that account.
-- Then replace the email below and run this statement as a trusted project owner.
-- Do not expose INSERT permission for school_admins to browser users.
-- insert into public.school_admins (user_id)
-- select id from auth.users where lower(email) = lower('ADMIN_EMAIL_HERE')
-- on conflict (user_id) do nothing;
