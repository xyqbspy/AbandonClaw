-- Phase 16: scene training station MVP

alter table public.user_scene_progress
add column if not exists mastery_stage text not null default 'listening',
add column if not exists mastery_percent numeric not null default 0,
add column if not exists focused_expression_count int not null default 0,
add column if not exists practiced_sentence_count int not null default 0,
add column if not exists scene_practice_count int not null default 0,
add column if not exists variant_unlocked_at timestamptz,
add column if not exists last_practiced_at timestamptz;

alter table public.user_scene_progress
drop constraint if exists user_scene_progress_mastery_stage_check;

alter table public.user_scene_progress
add constraint user_scene_progress_mastery_stage_check
check (
  mastery_stage in (
    'listening',
    'focus',
    'sentence_practice',
    'scene_practice',
    'variant_unlocked',
    'mastered'
  )
);

alter table public.user_scene_progress
drop constraint if exists user_scene_progress_mastery_percent_check;

alter table public.user_scene_progress
add constraint user_scene_progress_mastery_percent_check
check (mastery_percent >= 0 and mastery_percent <= 100);

create index if not exists user_scene_progress_user_mastery_last_practiced_idx
on public.user_scene_progress(user_id, mastery_stage, last_practiced_at desc);

create table if not exists public.user_scene_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  current_step text not null default 'listen',
  selected_block_id text,
  full_play_count int not null default 0,
  opened_expression_count int not null default 0,
  practiced_sentence_count int not null default 0,
  scene_practice_completed boolean not null default false,
  is_done boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_scene_sessions
drop constraint if exists user_scene_sessions_current_step_check;

alter table public.user_scene_sessions
add constraint user_scene_sessions_current_step_check
check (
  current_step in (
    'listen',
    'focus_expression',
    'practice_sentence',
    'scene_practice',
    'done'
  )
);

create index if not exists user_scene_sessions_user_scene_last_active_idx
on public.user_scene_sessions(user_id, scene_id, last_active_at desc);

create index if not exists user_scene_sessions_user_open_idx
on public.user_scene_sessions(user_id, is_done, last_active_at desc);

drop trigger if exists user_scene_sessions_set_updated_at on public.user_scene_sessions;
create trigger user_scene_sessions_set_updated_at
before update on public.user_scene_sessions
for each row execute function public.set_updated_at();

alter table public.user_scene_sessions enable row level security;

drop policy if exists "user_scene_sessions_select_own" on public.user_scene_sessions;
create policy "user_scene_sessions_select_own"
on public.user_scene_sessions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_scene_sessions_insert_own" on public.user_scene_sessions;
create policy "user_scene_sessions_insert_own"
on public.user_scene_sessions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_scene_sessions_update_own" on public.user_scene_sessions;
create policy "user_scene_sessions_update_own"
on public.user_scene_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_scene_sessions_delete_own" on public.user_scene_sessions;
create policy "user_scene_sessions_delete_own"
on public.user_scene_sessions for delete
to authenticated
using (user_id = auth.uid());
