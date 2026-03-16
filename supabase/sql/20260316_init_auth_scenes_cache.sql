-- Enable helpers
create extension if not exists pgcrypto;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  english_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto create profile on signup
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Scenes
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  theme text,
  source_text text,
  scene_json jsonb not null,
  translation text,
  difficulty text,
  origin text not null check (origin in ('seed', 'imported')),
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenes_origin_idx on public.scenes(origin);
create index if not exists scenes_created_by_idx on public.scenes(created_by);
create index if not exists scenes_is_public_idx on public.scenes(is_public);

drop trigger if exists scenes_set_updated_at on public.scenes;
create trigger scenes_set_updated_at
before update on public.scenes
for each row execute function public.set_updated_at();

-- Scene variants
create table if not exists public.scene_variants (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  variant_index int not null,
  variant_json jsonb not null,
  retain_chunk_ratio numeric,
  theme text,
  model text,
  prompt_version text,
  cache_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists scene_variants_scene_id_idx on public.scene_variants(scene_id);
create unique index if not exists scene_variants_scene_idx_unique
on public.scene_variants(scene_id, variant_index, coalesce(cache_key, ''));

-- AI cache
create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  cache_type text not null,
  input_json jsonb not null,
  output_json jsonb not null,
  model text,
  prompt_version text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_cache_cache_type_idx on public.ai_cache(cache_type);
create index if not exists ai_cache_created_by_idx on public.ai_cache(created_by);

-- User progress
create table if not exists public.user_scene_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, scene_id)
);

create index if not exists user_scene_progress_user_id_idx
on public.user_scene_progress(user_id);
create index if not exists user_scene_progress_scene_id_idx
on public.user_scene_progress(scene_id);

drop trigger if exists user_scene_progress_set_updated_at on public.user_scene_progress;
create trigger user_scene_progress_set_updated_at
before update on public.user_scene_progress
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.scenes enable row level security;
alter table public.scene_variants enable row level security;
alter table public.ai_cache enable row level security;
alter table public.user_scene_progress enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Scenes policies: read for authenticated users (public or owned)
drop policy if exists "scenes_select_visible" on public.scenes;
create policy "scenes_select_visible"
on public.scenes for select
to authenticated
using (is_public = true or created_by = auth.uid());

-- Scene variants read policy (visible through source scene)
drop policy if exists "scene_variants_select_visible" on public.scene_variants;
create policy "scene_variants_select_visible"
on public.scene_variants for select
to authenticated
using (
  exists (
    select 1
    from public.scenes s
    where s.id = scene_variants.scene_id
      and (s.is_public = true or s.created_by = auth.uid())
  )
);

-- AI cache read policy (for authenticated clients; writes should happen server-side)
drop policy if exists "ai_cache_select_authenticated" on public.ai_cache;
create policy "ai_cache_select_authenticated"
on public.ai_cache for select
to authenticated
using (true);

-- User progress policies
drop policy if exists "user_scene_progress_select_own" on public.user_scene_progress;
create policy "user_scene_progress_select_own"
on public.user_scene_progress for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_scene_progress_insert_own" on public.user_scene_progress;
create policy "user_scene_progress_insert_own"
on public.user_scene_progress for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_scene_progress_update_own" on public.user_scene_progress;
create policy "user_scene_progress_update_own"
on public.user_scene_progress for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_scene_progress_delete_own" on public.user_scene_progress;
create policy "user_scene_progress_delete_own"
on public.user_scene_progress for delete
to authenticated
using (user_id = auth.uid());
