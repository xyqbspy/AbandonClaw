-- Phase 21: persisted scene practice sets

create table if not exists public.user_scene_practice_sets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  source_type text not null default 'original',
  source_variant_id text,
  status text not null default 'generated',
  generation_source text not null default 'system',
  practice_set_json jsonb not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_scene_practice_sets
drop constraint if exists user_scene_practice_sets_source_type_check;

alter table public.user_scene_practice_sets
add constraint user_scene_practice_sets_source_type_check
check (source_type in ('original', 'variant'));

alter table public.user_scene_practice_sets
drop constraint if exists user_scene_practice_sets_status_check;

alter table public.user_scene_practice_sets
add constraint user_scene_practice_sets_status_check
check (status in ('generated', 'completed', 'abandoned'));

alter table public.user_scene_practice_sets
drop constraint if exists user_scene_practice_sets_generation_source_check;

alter table public.user_scene_practice_sets
add constraint user_scene_practice_sets_generation_source_check
check (generation_source in ('ai', 'system'));

create index if not exists user_scene_practice_sets_user_scene_status_idx
on public.user_scene_practice_sets(user_id, scene_id, status, updated_at desc);

create index if not exists user_scene_practice_sets_user_scene_source_idx
on public.user_scene_practice_sets(user_id, scene_id, source_type, source_variant_id, updated_at desc);

drop trigger if exists user_scene_practice_sets_set_updated_at on public.user_scene_practice_sets;
create trigger user_scene_practice_sets_set_updated_at
before update on public.user_scene_practice_sets
for each row execute function public.set_updated_at();

alter table public.user_scene_practice_sets enable row level security;

drop policy if exists "user_scene_practice_sets_select_own" on public.user_scene_practice_sets;
create policy "user_scene_practice_sets_select_own"
on public.user_scene_practice_sets for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_scene_practice_sets_insert_own" on public.user_scene_practice_sets;
create policy "user_scene_practice_sets_insert_own"
on public.user_scene_practice_sets for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_scene_practice_sets_update_own" on public.user_scene_practice_sets;
create policy "user_scene_practice_sets_update_own"
on public.user_scene_practice_sets for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_scene_practice_sets_delete_own" on public.user_scene_practice_sets;
create policy "user_scene_practice_sets_delete_own"
on public.user_scene_practice_sets for delete
to authenticated
using (user_id = auth.uid());

