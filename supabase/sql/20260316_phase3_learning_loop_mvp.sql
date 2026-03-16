-- Phase 3: learning loop MVP persistence

-- 1) Extend user_scene_progress for real learning state
alter table public.user_scene_progress
add column if not exists status text not null default 'not_started',
add column if not exists progress_percent numeric not null default 0,
add column if not exists last_sentence_index int,
add column if not exists last_variant_index int,
add column if not exists started_at timestamptz,
add column if not exists total_study_seconds int not null default 0,
add column if not exists today_study_seconds int not null default 0,
add column if not exists saved_phrase_count int not null default 0;

alter table public.user_scene_progress
drop constraint if exists user_scene_progress_status_check;

alter table public.user_scene_progress
add constraint user_scene_progress_status_check
check (status in ('not_started', 'in_progress', 'completed', 'paused'));

alter table public.user_scene_progress
drop constraint if exists user_scene_progress_progress_percent_check;

alter table public.user_scene_progress
add constraint user_scene_progress_progress_percent_check
check (progress_percent >= 0 and progress_percent <= 100);

alter table public.user_scene_progress
drop constraint if exists user_scene_progress_last_sentence_index_check;

alter table public.user_scene_progress
add constraint user_scene_progress_last_sentence_index_check
check (last_sentence_index is null or last_sentence_index >= 0);

alter table public.user_scene_progress
drop constraint if exists user_scene_progress_last_variant_index_check;

alter table public.user_scene_progress
add constraint user_scene_progress_last_variant_index_check
check (last_variant_index is null or last_variant_index >= 0);

create index if not exists user_scene_progress_user_status_last_viewed_idx
on public.user_scene_progress(user_id, status, last_viewed_at desc);

create index if not exists user_scene_progress_user_completed_at_idx
on public.user_scene_progress(user_id, completed_at desc);

-- 2) Optional daily stats table for lightweight dashboard/streak calculations
create table if not exists public.user_daily_learning_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  study_seconds int not null default 0,
  scenes_started int not null default 0,
  scenes_completed int not null default 0,
  review_items_completed int not null default 0,
  phrases_saved int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists user_daily_learning_stats_user_date_idx
on public.user_daily_learning_stats(user_id, date desc);

drop trigger if exists user_daily_learning_stats_set_updated_at on public.user_daily_learning_stats;
create trigger user_daily_learning_stats_set_updated_at
before update on public.user_daily_learning_stats
for each row execute function public.set_updated_at();

alter table public.user_daily_learning_stats enable row level security;

drop policy if exists "user_daily_learning_stats_select_own" on public.user_daily_learning_stats;
create policy "user_daily_learning_stats_select_own"
on public.user_daily_learning_stats for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_daily_learning_stats_insert_own" on public.user_daily_learning_stats;
create policy "user_daily_learning_stats_insert_own"
on public.user_daily_learning_stats for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_daily_learning_stats_update_own" on public.user_daily_learning_stats;
create policy "user_daily_learning_stats_update_own"
on public.user_daily_learning_stats for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_daily_learning_stats_delete_own" on public.user_daily_learning_stats;
create policy "user_daily_learning_stats_delete_own"
on public.user_daily_learning_stats for delete
to authenticated
using (user_id = auth.uid());
