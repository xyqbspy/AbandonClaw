-- Phase 17: scene practice runs MVP

create table if not exists public.user_scene_practice_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  session_id uuid references public.user_scene_sessions(id) on delete set null,
  practice_set_id text not null,
  source_type text not null default 'original',
  source_variant_id uuid references public.scenes(id) on delete set null,
  status text not null default 'in_progress',
  current_mode text not null default 'cloze',
  completed_modes text[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_scene_practice_runs
drop constraint if exists user_scene_practice_runs_source_type_check;

alter table public.user_scene_practice_runs
add constraint user_scene_practice_runs_source_type_check
check (source_type in ('original', 'variant'));

alter table public.user_scene_practice_runs
drop constraint if exists user_scene_practice_runs_status_check;

alter table public.user_scene_practice_runs
add constraint user_scene_practice_runs_status_check
check (status in ('in_progress', 'completed', 'abandoned'));

alter table public.user_scene_practice_runs
drop constraint if exists user_scene_practice_runs_current_mode_check;

alter table public.user_scene_practice_runs
add constraint user_scene_practice_runs_current_mode_check
check (current_mode in ('cloze', 'guided_recall', 'sentence_recall', 'full_dictation'));

create index if not exists user_scene_practice_runs_user_scene_status_idx
on public.user_scene_practice_runs(user_id, scene_id, status, last_active_at desc);

create index if not exists user_scene_practice_runs_user_set_idx
on public.user_scene_practice_runs(user_id, practice_set_id, created_at desc);

drop trigger if exists user_scene_practice_runs_set_updated_at on public.user_scene_practice_runs;
create trigger user_scene_practice_runs_set_updated_at
before update on public.user_scene_practice_runs
for each row execute function public.set_updated_at();

alter table public.user_scene_practice_runs enable row level security;

drop policy if exists "user_scene_practice_runs_select_own" on public.user_scene_practice_runs;
create policy "user_scene_practice_runs_select_own"
on public.user_scene_practice_runs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_scene_practice_runs_insert_own" on public.user_scene_practice_runs;
create policy "user_scene_practice_runs_insert_own"
on public.user_scene_practice_runs for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_scene_practice_runs_update_own" on public.user_scene_practice_runs;
create policy "user_scene_practice_runs_update_own"
on public.user_scene_practice_runs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_scene_practice_runs_delete_own" on public.user_scene_practice_runs;
create policy "user_scene_practice_runs_delete_own"
on public.user_scene_practice_runs for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.user_scene_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.user_scene_practice_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  session_id uuid references public.user_scene_sessions(id) on delete set null,
  practice_set_id text not null,
  mode text not null,
  exercise_id text not null,
  sentence_id text,
  user_answer text not null default '',
  assessment_level text not null,
  is_correct boolean not null default false,
  attempt_index int not null default 1,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_scene_practice_attempts
drop constraint if exists user_scene_practice_attempts_mode_check;

alter table public.user_scene_practice_attempts
add constraint user_scene_practice_attempts_mode_check
check (mode in ('cloze', 'guided_recall', 'sentence_recall', 'full_dictation'));

alter table public.user_scene_practice_attempts
drop constraint if exists user_scene_practice_attempts_assessment_level_check;

alter table public.user_scene_practice_attempts
add constraint user_scene_practice_attempts_assessment_level_check
check (assessment_level in ('incorrect', 'keyword', 'structure', 'complete'));

alter table public.user_scene_practice_attempts
drop constraint if exists user_scene_practice_attempts_attempt_index_check;

alter table public.user_scene_practice_attempts
add constraint user_scene_practice_attempts_attempt_index_check
check (attempt_index >= 1);

create index if not exists user_scene_practice_attempts_run_created_idx
on public.user_scene_practice_attempts(run_id, created_at desc);

create index if not exists user_scene_practice_attempts_user_scene_mode_idx
on public.user_scene_practice_attempts(user_id, scene_id, mode, created_at desc);

create index if not exists user_scene_practice_attempts_user_exercise_idx
on public.user_scene_practice_attempts(user_id, practice_set_id, exercise_id, created_at desc);

alter table public.user_scene_practice_attempts enable row level security;

drop policy if exists "user_scene_practice_attempts_select_own" on public.user_scene_practice_attempts;
create policy "user_scene_practice_attempts_select_own"
on public.user_scene_practice_attempts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_scene_practice_attempts_insert_own" on public.user_scene_practice_attempts;
create policy "user_scene_practice_attempts_insert_own"
on public.user_scene_practice_attempts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_scene_practice_attempts_delete_own" on public.user_scene_practice_attempts;
create policy "user_scene_practice_attempts_delete_own"
on public.user_scene_practice_attempts for delete
to authenticated
using (user_id = auth.uid());
