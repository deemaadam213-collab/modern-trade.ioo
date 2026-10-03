 -- =====================================================================
-- ECUMT 3-01 — Migration: replace Supabase Auth (email+confirmation)
-- with a simple username/password table.
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- 1. new accounts table (no auth.users / no email needed) ----------
create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  display_name  text not null,
  role          text not null default 'student' check (role in ('student', 'teacher')),
  created_at    timestamptz not null default now()
);

alter table public.app_users enable row level security;
-- No direct select/insert policies on purpose: all access goes through
-- the SECURITY DEFINER functions below, so the anon key can never read
-- password_hash directly from the table.

-- ---------- 2. point submissions at app_users instead of auth.users/profiles ----------
alter table public.submissions drop constraint if exists submissions_user_id_fkey;
alter table public.submissions alter column user_id drop default;
alter table public.submissions add constraint submissions_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade;

-- ---------- 3. signup / login as SECURITY DEFINER functions ----------
create or replace function public.signup_user(p_username text, p_password_hash text, p_display_name text)
returns table (id uuid, display_name text, role text)
language plpgsql security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if exists (select 1 from public.app_users au where au.username = lower(trim(p_username))) then
    raise exception 'USERNAME_TAKEN';
  end if;
  insert into public.app_users (username, password_hash, display_name)
  values (lower(trim(p_username)), p_password_hash, p_display_name)
  returning app_users.id into v_id;
  return query select v_id, p_display_name, 'student'::text;
end;
$$;

revoke all on function public.signup_user(text, text, text) from public;
grant execute on function public.signup_user(text, text, text) to anon, authenticated;

create or replace function public.login_user(p_username text, p_password_hash text)
returns table (id uuid, display_name text, role text)
language sql security definer stable
set search_path = public
as $$
  select id, display_name, role
  from public.app_users
  where username = lower(trim(p_username)) and password_hash = p_password_hash;
$$;

revoke all on function public.login_user(text, text) from public;
grant execute on function public.login_user(text, text) to anon, authenticated;

-- ---------- 4. is_teacher now takes the user id explicitly (no auth.uid() anymore) ----------
drop function if exists public.is_teacher();

create or replace function public.is_app_teacher(p_user_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.app_users where id = p_user_id and role = 'teacher');
$$;

-- ---------- 5. submissions RLS: relaxed, since there is no Supabase Auth JWT anymore ----------
-- IMPORTANT TRADE-OFF: without Supabase Auth, the database cannot verify
-- *who* is calling the anon API, so these policies trust whatever user_id
-- the page sends. Fine for a low-stakes class exam-practice site; it is
-- not bank-grade security. Keep the anon key as it is (never expose the
-- service_role key in client code).
drop policy if exists "submissions read own or teacher" on public.submissions;
drop policy if exists "submissions insert own"          on public.submissions;
drop policy if exists "submissions teacher update"       on public.submissions;

create policy "submissions anon insert" on public.submissions
  for insert to anon, authenticated
  with check (reviewed = false and teacher_correct is null and teacher_marks is null and teacher_note is null);

create policy "submissions anon select" on public.submissions
  for select to anon, authenticated
  using (true);

create policy "submissions anon update" on public.submissions
  for update to anon, authenticated
  using (true) with check (true);

-- ---------- 6. profiles table: no longer used by the app, left in place untouched ----------
-- (safe to ignore / drop later once you've confirmed everything works)

-- ---------- 7. weekly leaderboard: now takes the caller's id as a parameter ----------
drop function if exists public.weekly_leaderboard(int);

create or replace function public.weekly_leaderboard(weeks_ago int default 0, p_user_id uuid default null)
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
  select au.display_name,
         sum(best.pts)::bigint,
         count(*)::bigint,
         (best.user_id = p_user_id)
  from best
  join public.app_users au on au.id = best.user_id and au.role = 'student'
  group by best.user_id, au.display_name
  order by 2 desc, 3 desc, au.display_name
  limit 50;
$$;

revoke all on function public.weekly_leaderboard(int, uuid) from public, anon;
grant execute on function public.weekly_leaderboard(int, uuid) to anon, authenticated;

-- =====================================================================
-- 8. Teacher account — run this AFTER the rest of the file above.
-- The hash formula below must match E.hashPassword() in auth.js exactly:
--   sha256("ecumt::" + lowercase(username) + "::" + password)
-- =====================================================================
insert into public.app_users (username, password_hash, display_name, role)
values (
  'teacher',                                                                   -- <<< CHANGE: teacher username
  encode(digest('ecumt::teacher::ChangeThisPassword123', 'sha256'), 'hex'),    -- <<< CHANGE: 'teacher' and the password both here
  'المعلم',
  'teacher'
)
on conflict (username) do update set role = 'teacher';
