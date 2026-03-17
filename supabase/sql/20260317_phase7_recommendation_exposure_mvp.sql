-- Phase 7: scene recommendation exposure dedupe MVP

create table if not exists public.scene_phrase_recommendation_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_slug text not null,
  normalized_text text not null,
  source_chunk_text text,
  last_recommended_at timestamptz not null default now(),
  recommended_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, scene_slug, normalized_text)
);

drop trigger if exists scene_phrase_recommendation_state_set_updated_at
on public.scene_phrase_recommendation_state;

create trigger scene_phrase_recommendation_state_set_updated_at
before update on public.scene_phrase_recommendation_state
for each row execute function public.set_updated_at();

create index if not exists scene_phrase_recommendation_state_user_scene_time_idx
on public.scene_phrase_recommendation_state(user_id, scene_slug, last_recommended_at desc);

create index if not exists scene_phrase_recommendation_state_user_text_idx
on public.scene_phrase_recommendation_state(user_id, normalized_text);

alter table public.scene_phrase_recommendation_state enable row level security;

drop policy if exists "scene_phrase_reco_state_select_own"
on public.scene_phrase_recommendation_state;
create policy "scene_phrase_reco_state_select_own"
on public.scene_phrase_recommendation_state for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "scene_phrase_reco_state_insert_own"
on public.scene_phrase_recommendation_state;
create policy "scene_phrase_reco_state_insert_own"
on public.scene_phrase_recommendation_state for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "scene_phrase_reco_state_update_own"
on public.scene_phrase_recommendation_state;
create policy "scene_phrase_reco_state_update_own"
on public.scene_phrase_recommendation_state for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
