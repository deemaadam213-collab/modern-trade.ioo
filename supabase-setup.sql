-- =====================================================================
-- ECUMT 3-01 — Supabase setup
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  role         text not null default 'student' check (role in ('student', 'teacher')),
  created_at   timestamptz not null default now()
);

create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  exam_id        text not null check (exam_id in ('1','2','3','4','5','all')),
  total          int  not null check (total between 1 and 60),
  correct        int  not null,
  answers        jsonb not null check (jsonb_typeof(answers) = 'array'),
  reviewed       boolean not null default false,
  teacher_correct int,
  teacher_marks  jsonb,
  teacher_note   text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  check (correct between 0 and total),
  check (teacher_correct is null or teacher_correct between 0 and total)
);

create index if not exists submissions_user_idx on public.submissions (user_id, created_at desc);
create index if not exists submissions_created_idx on public.submissions (created_at desc);

-- ---------- helper: is the current user the teacher? ----------
create or replace function public.is_teacher()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

-- ---------- row level security ----------
alter table public.profiles    enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "profiles read own or teacher" on public.profiles;
create policy "profiles read own or teacher" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_teacher());

drop policy if exists "profiles insert own as student" on public.profiles;
create policy "profiles insert own as student" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'student');

drop policy if exists "submissions read own or teacher" on public.submissions;
create policy "submissions read own or teacher" on public.submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

drop policy if exists "submissions insert own" on public.submissions;
create policy "submissions insert own" on public.submissions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and reviewed = false
    and teacher_correct is null
    and teacher_marks is null
    and teacher_note is null
  );

drop policy if exists "submissions teacher update" on public.submissions;
create policy "submissions teacher update" on public.submissions
  for update to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------- weekly leaderboard ----------
-- Week starts every Sunday 00:00 (Africa/Cairo).
-- Points = 1 per correct answer (teacher-adjusted score if the teacher reviewed it).
-- Only the best attempt of each exam counts inside the week, so retaking can't farm points.
-- weeks_ago = 0 -> this week, 1 -> last week.
create or replace function public.weekly_leaderboard(weeks_ago int default 0)
returns table (display_name text, points bigint, exams bigint, is_me boolean)
language sql security definer stable
set search_path = public
as $$
  with bounds as (
    select (date_trunc('week', (now() at time zone 'Africa/Cairo') + interval '1 day') - interval '1 day')
           - (greatest(weeks_ago, 0) * interval '7 days') as ws
  ),
  best as (
    select s.user_id, s.exam_id, max(coalesce(s.teacher_correct, s.correct)) as pts
    from public.submissions s, bounds b
    where (s.created_at at time zone 'Africa/Cairo') >= b.ws
      and (s.created_at at time zone 'Africa/Cairo') <  b.ws + interval '7 days'
    group by s.user_id, s.exam_id
  )
  select p.display_name,
         sum(best.pts)::bigint,
         count(*)::bigint,
         (best.user_id = auth.uid())
  from best
  join public.profiles p on p.id = best.user_id and p.role = 'student'
  group by best.user_id, p.display_name
  order by 2 desc, 3 desc, p.display_name
  limit 50;
$$;

revoke all on function public.weekly_leaderboard(int) from public, anon;
grant execute on function public.weekly_leaderboard(int) to authenticated;

-- =====================================================================
-- Teacher account.
-- 1) First create the user: Authentication -> Users -> Add user
--    (teacher's real email + password, tick "Auto Confirm User").
-- 2) Put that same email below, then run the whole file (it is safe to re-run).
-- =====================================================================
insert into public.profiles (id, username, display_name, role)
select id, 'teacher', 'المعلم', 'teacher'
from auth.users
where email = 'teacher@example.com'      -- <<< CHANGE THIS to the teacher's email
on conflict (id) do update set role = 'teacher';
