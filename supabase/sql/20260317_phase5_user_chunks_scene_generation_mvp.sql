-- Phase 5: user chunk memory + personalized scene generation MVP

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  normalized_text text not null unique,
  display_text text not null,
  translation text,
  chunk_type text not null default 'chunk',
  difficulty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chunks
drop constraint if exists chunks_chunk_type_check;

alter table public.chunks
add constraint chunks_chunk_type_check
check (chunk_type in ('chunk'));

drop trigger if exists chunks_set_updated_at on public.chunks;
create trigger chunks_set_updated_at
before update on public.chunks
for each row execute function public.set_updated_at();

create index if not exists chunks_normalized_text_idx
on public.chunks(normalized_text);

create table if not exists public.user_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_id uuid not null references public.chunks(id) on delete cascade,
  status text not null default 'encountered',
  encounter_count int not null default 1,
  practice_count int not null default 0,
  mastery_score numeric not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_practiced_at timestamptz,
  source_scene_id uuid references public.scenes(id) on delete set null,
  source_scene_slug text,
  source_sentence_index int,
  source_sentence_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, chunk_id)
);

alter table public.user_chunks
drop constraint if exists user_chunks_status_check;

alter table public.user_chunks
add constraint user_chunks_status_check
check (status in ('encountered', 'practiced', 'familiar'));

drop trigger if exists user_chunks_set_updated_at on public.user_chunks;
create trigger user_chunks_set_updated_at
before update on public.user_chunks
for each row execute function public.set_updated_at();

create index if not exists user_chunks_user_chunk_idx
on public.user_chunks(user_id, chunk_id);

create index if not exists user_chunks_user_last_practiced_idx
on public.user_chunks(user_id, last_practiced_at desc);

create index if not exists user_chunks_user_practice_count_idx
on public.user_chunks(user_id, practice_count desc);

create index if not exists user_chunks_user_last_seen_idx
on public.user_chunks(user_id, last_seen_at desc);

alter table public.chunks enable row level security;
alter table public.user_chunks enable row level security;

drop policy if exists "chunks_select_authenticated" on public.chunks;
create policy "chunks_select_authenticated"
on public.chunks for select
to authenticated
using (true);

drop policy if exists "user_chunks_select_own" on public.user_chunks;
create policy "user_chunks_select_own"
on public.user_chunks for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_chunks_insert_own" on public.user_chunks;
create policy "user_chunks_insert_own"
on public.user_chunks for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_chunks_update_own" on public.user_chunks;
create policy "user_chunks_update_own"
on public.user_chunks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_chunks_delete_own" on public.user_chunks;
create policy "user_chunks_delete_own"
on public.user_chunks for delete
to authenticated
using (user_id = auth.uid());
