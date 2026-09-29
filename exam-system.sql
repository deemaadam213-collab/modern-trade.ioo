-- Run this after student-progress.sql. The answer key table is admin-only.
create table if not exists public.school_exams (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) between 2 and 160),
  description text not null default '', duration_minutes integer not null default 0 check (duration_minutes between 0 and 600),
  is_published boolean not null default false, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.school_exam_questions (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.school_exams(id) on delete cascade,
  order_index integer not null, question_text text not null, question_type text not null check (question_type in ('essay','short','multiple_choice','true_false')),
  options jsonb not null default '[]'::jsonb, points numeric(7,2) not null default 1 check (points > 0), unique(exam_id,order_index)
);
create table if not exists public.school_exam_question_keys (
  question_id uuid primary key references public.school_exam_questions(id) on delete cascade, correct_answer text not null
);
create table if not exists public.school_exam_attempts (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.school_exams(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade, student_name text not null default 'طالب',
  status text not null default 'in_progress' check (status in ('in_progress','submitted')), answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(), submitted_at timestamptz, updated_at timestamptz not null default now(),
  unique (exam_id,student_id)
);
create index if not exists school_exam_attempts_exam_updated_idx on public.school_exam_attempts(exam_id,updated_at desc);
create table if not exists public.school_exam_grades (
  attempt_id uuid primary key references public.school_exam_attempts(id) on delete cascade, score numeric(8,2) not null check (score >= 0),
  feedback text not null default '', graded_by uuid not null references auth.users(id), graded_at timestamptz not null default now()
);

alter table public.school_exams enable row level security;
alter table public.school_exam_questions enable row level security;
alter table public.school_exam_question_keys enable row level security;
alter table public.school_exam_attempts enable row level security;
alter table public.school_exam_grades enable row level security;
revoke all on public.school_exams,public.school_exam_questions,public.school_exam_question_keys,public.school_exam_attempts,public.school_exam_grades from anon,authenticated;
grant select,insert,update,delete on public.school_exams,public.school_exam_questions,public.school_exam_question_keys to authenticated;
grant select,insert on public.school_exam_attempts to authenticated;
grant select,insert,update on public.school_exam_grades to authenticated;

drop policy if exists "Admins manage school exams" on public.school_exams;
create policy "Admins manage school exams" on public.school_exams for all to authenticated using ((select private.is_school_admin())) with check ((select private.is_school_admin()));
drop policy if exists "Students read published exams" on public.school_exams;
create policy "Students read published exams" on public.school_exams for select to authenticated using (is_published);
drop policy if exists "Admins manage exam questions" on public.school_exam_questions;
create policy "Admins manage exam questions" on public.school_exam_questions for all to authenticated using ((select private.is_school_admin())) with check ((select private.is_school_admin()));
drop policy if exists "Students read published exam questions" on public.school_exam_questions;
create policy "Students read published exam questions" on public.school_exam_questions for select to authenticated using (exists (select 1 from public.school_exams e where e.id=exam_id and e.is_published));
drop policy if exists "Admins manage exam keys" on public.school_exam_question_keys;
create policy "Admins manage exam keys" on public.school_exam_question_keys for all to authenticated using ((select private.is_school_admin())) with check ((select private.is_school_admin()));
drop policy if exists "Admins manage all exam attempts" on public.school_exam_attempts;
create policy "Admins manage all exam attempts" on public.school_exam_attempts for all to authenticated using ((select private.is_school_admin())) with check ((select private.is_school_admin()));
drop policy if exists "Students read own exam attempts" on public.school_exam_attempts;
create policy "Students read own exam attempts" on public.school_exam_attempts for select to authenticated using ((select auth.uid())=student_id);
drop policy if exists "Students start published exam attempts" on public.school_exam_attempts;
create policy "Students start published exam attempts" on public.school_exam_attempts for insert to authenticated with check ((select auth.uid())=student_id and status='in_progress' and exists(select 1 from public.school_exams e where e.id=exam_id and e.is_published));
drop policy if exists "Students save own in-progress answers" on public.school_exam_attempts;
drop policy if exists "Admins manage exam grades" on public.school_exam_grades;
create policy "Admins manage exam grades" on public.school_exam_grades for all to authenticated using ((select private.is_school_admin())) with check ((select private.is_school_admin()));
drop policy if exists "Students read own exam grades" on public.school_exam_grades;
create policy "Students read own exam grades" on public.school_exam_grades for select to authenticated using (exists(select 1 from public.school_exam_attempts a where a.id=attempt_id and a.student_id=(select auth.uid())));

create or replace function public.school_exam_create(p_title text,p_description text,p_duration integer,p_publish boolean,p_questions jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_exam uuid; v_item jsonb; v_q uuid; v_i integer:=0; v_type text;
begin
  if not private.is_school_admin() then raise exception 'school_admin_required'; end if;
  if jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions)<1 then raise exception 'exam_requires_questions'; end if;
  insert into public.school_exams(title,description,duration_minutes,is_published,created_by)
  values(trim(p_title),coalesce(p_description,''),greatest(0,least(coalesce(p_duration,0),600)),coalesce(p_publish,false),(select auth.uid())) returning id into v_exam;
  for v_item in select value from jsonb_array_elements(p_questions) loop
    v_i:=v_i+1; v_type:=v_item->>'type';
    if v_type not in ('essay','short','multiple_choice','true_false') then raise exception 'invalid_question_type'; end if;
    insert into public.school_exam_questions(exam_id,order_index,question_text,question_type,options,points)
    values(v_exam,v_i,trim(v_item->>'text'),v_type,coalesce(v_item->'options','[]'::jsonb),greatest(0.01,coalesce((v_item->>'points')::numeric,1))) returning id into v_q;
    if v_type in ('multiple_choice','true_false') and nullif(v_item->>'correct_answer','') is not null then
      insert into public.school_exam_question_keys(question_id,correct_answer) values(v_q,v_item->>'correct_answer');
    end if;
  end loop;
  return v_exam;
end $$;
revoke all on function public.school_exam_create(text,text,integer,boolean,jsonb) from public,anon;
grant execute on function public.school_exam_create(text,text,integer,boolean,jsonb) to authenticated;

create or replace function public.school_exam_save_attempt(p_attempt uuid,p_answers jsonb,p_submit boolean default false)
returns text language plpgsql security definer set search_path='' as $$
declare v_attempt public.school_exam_attempts%rowtype; v_duration integer; v_expired boolean;
begin
  if jsonb_typeof(p_answers)<>'object' then raise exception 'invalid_answers'; end if;
  select * into v_attempt from public.school_exam_attempts where id=p_attempt and student_id=(select auth.uid()) for update;
  if not found then raise exception 'attempt_not_found'; end if;
  if v_attempt.status='submitted' then return 'submitted'; end if;
  select duration_minutes into v_duration from public.school_exams where id=v_attempt.exam_id and is_published;
  if not found then raise exception 'exam_unavailable'; end if;
  if exists(select 1 from jsonb_object_keys(p_answers) as answer_keys(question_id) where not exists(select 1 from public.school_exam_questions q where q.id::text=answer_keys.question_id and q.exam_id=v_attempt.exam_id)) then raise exception 'invalid_question'; end if;
  v_expired:=v_duration>0 and now()>v_attempt.started_at+(v_duration||' minutes')::interval;
  update public.school_exam_attempts set answers=p_answers,updated_at=now(),
    status=case when p_submit or v_expired then 'submitted' else 'in_progress' end,
    submitted_at=case when p_submit or v_expired then coalesce(submitted_at,now()) else null end
    where id=p_attempt;
  if p_submit or v_expired then return 'submitted'; end if;
  return 'in_progress';
end $$;
revoke all on function public.school_exam_save_attempt(uuid,jsonb,boolean) from public,anon;
grant execute on function public.school_exam_save_attempt(uuid,jsonb,boolean) to authenticated;

create or replace function public.school_exam_save_grade(p_attempt uuid,p_score numeric,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare v_max numeric;
begin
  if not private.is_school_admin() then raise exception 'school_admin_required'; end if;
  select coalesce(sum(q.points),0) into v_max from public.school_exam_questions q join public.school_exam_attempts a on a.exam_id=q.exam_id where a.id=p_attempt;
  if p_score<0 or p_score>v_max then raise exception 'grade_out_of_range'; end if;
  insert into public.school_exam_grades(attempt_id,score,feedback,graded_by,graded_at) values(p_attempt,p_score,coalesce(p_feedback,''),(select auth.uid()),now())
  on conflict(attempt_id) do update set score=excluded.score,feedback=excluded.feedback,graded_by=excluded.graded_by,graded_at=excluded.graded_at;
end $$;
revoke all on function public.school_exam_save_grade(uuid,numeric,text) from public,anon;
grant execute on function public.school_exam_save_grade(uuid,numeric,text) to authenticated;

do $$ begin alter publication supabase_realtime add table public.school_exam_attempts;
exception when duplicate_object then null; when undefined_object then null; end $$;
