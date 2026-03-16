-- Phase 4: phrase favorites formal closed-loop MVP

create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  normalized_text text not null unique,
  display_text text not null,
  translation text,
  usage_note text,
  difficulty text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists phrases_set_updated_at on public.phrases;
create trigger phrases_set_updated_at
before update on public.phrases
for each row execute function public.set_updated_at();

create index if not exists phrases_normalized_text_idx
on public.phrases(normalized_text);

create table if not exists public.user_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase_id uuid not null references public.phrases(id) on delete cascade,
  status text not null default 'saved',
  source_scene_id uuid references public.scenes(id) on delete set null,
  source_scene_slug text,
  source_sentence_index int,
  source_sentence_text text,
  source_chunk_text text,
  saved_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, phrase_id)
);

alter table public.user_phrases
drop constraint if exists user_phrases_status_check;

alter table public.user_phrases
add constraint user_phrases_status_check
check (status in ('saved', 'archived'));

drop trigger if exists user_phrases_set_updated_at on public.user_phrases;
create trigger user_phrases_set_updated_at
before update on public.user_phrases
for each row execute function public.set_updated_at();

create index if not exists user_phrases_user_saved_at_idx
on public.user_phrases(user_id, saved_at desc);

create index if not exists user_phrases_user_status_saved_at_idx
on public.user_phrases(user_id, status, saved_at desc);

create index if not exists user_phrases_user_phrase_idx
on public.user_phrases(user_id, phrase_id);

alter table public.phrases enable row level security;
alter table public.user_phrases enable row level security;

drop policy if exists "phrases_select_authenticated" on public.phrases;
create policy "phrases_select_authenticated"
on public.phrases for select
to authenticated
using (true);

drop policy if exists "user_phrases_select_own" on public.user_phrases;
create policy "user_phrases_select_own"
on public.user_phrases for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_phrases_insert_own" on public.user_phrases;
create policy "user_phrases_insert_own"
on public.user_phrases for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_phrases_update_own" on public.user_phrases;
create policy "user_phrases_update_own"
on public.user_phrases for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_phrases_delete_own" on public.user_phrases;
create policy "user_phrases_delete_own"
on public.user_phrases for delete
to authenticated
using (user_id = auth.uid());
