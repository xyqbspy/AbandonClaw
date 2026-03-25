-- Phase 18: scene variant runs MVP

create table if not exists public.user_scene_variant_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  session_id uuid references public.user_scene_sessions(id) on delete set null,
  variant_set_id text not null,
  active_variant_id text,
  viewed_variant_ids text[] not null default '{}',
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_scene_variant_runs
drop constraint if exists user_scene_variant_runs_status_check;

alter table public.user_scene_variant_runs
add constraint user_scene_variant_runs_status_check
check (status in ('in_progress', 'completed', 'abandoned'));

create index if not exists user_scene_variant_runs_user_scene_status_idx
on public.user_scene_variant_runs(user_id, scene_id, status, last_active_at desc);

create index if not exists user_scene_variant_runs_user_set_idx
on public.user_scene_variant_runs(user_id, variant_set_id, created_at desc);

drop trigger if exists user_scene_variant_runs_set_updated_at on public.user_scene_variant_runs;
create trigger user_scene_variant_runs_set_updated_at
before update on public.user_scene_variant_runs
for each row execute function public.set_updated_at();

alter table public.user_scene_variant_runs enable row level security;

drop policy if exists "user_scene_variant_runs_select_own" on public.user_scene_variant_runs;
create policy "user_scene_variant_runs_select_own"
on public.user_scene_variant_runs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_scene_variant_runs_insert_own" on public.user_scene_variant_runs;
create policy "user_scene_variant_runs_insert_own"
on public.user_scene_variant_runs for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_scene_variant_runs_update_own" on public.user_scene_variant_runs;
create policy "user_scene_variant_runs_update_own"
on public.user_scene_variant_runs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_scene_variant_runs_delete_own" on public.user_scene_variant_runs;
create policy "user_scene_variant_runs_delete_own"
on public.user_scene_variant_runs for delete
to authenticated
using (user_id = auth.uid());
