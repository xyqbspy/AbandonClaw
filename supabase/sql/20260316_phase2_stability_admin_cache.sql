-- Phase 2: stability, cache observability, and admin query performance

-- 1) scenes: improve admin listing/filtering performance
create index if not exists scenes_created_at_idx
on public.scenes(created_at desc);

create index if not exists scenes_origin_public_created_at_idx
on public.scenes(origin, is_public, created_at desc);

-- 2) scene_variants: fix cache_key uniqueness model and improve read performance
alter table public.scene_variants
drop constraint if exists scene_variants_cache_key_key;

drop index if exists scene_variants_cache_key_key;

create index if not exists scene_variants_cache_key_idx
on public.scene_variants(cache_key);

create index if not exists scene_variants_created_at_idx
on public.scene_variants(created_at desc);

create unique index if not exists scene_variants_scene_cache_variant_unique
on public.scene_variants(scene_id, cache_key, variant_index)
where cache_key is not null;

-- 3) ai_cache: add observability fields and query indexes
alter table public.ai_cache
add column if not exists status text not null default 'success',
add column if not exists input_hash text,
add column if not exists source_ref text,
add column if not exists meta_json jsonb,
add column if not exists expires_at timestamptz;

alter table public.ai_cache
drop constraint if exists ai_cache_status_check;

alter table public.ai_cache
add constraint ai_cache_status_check
check (status in ('success', 'error'));

create index if not exists ai_cache_cache_type_created_at_idx
on public.ai_cache(cache_type, created_at desc);

create index if not exists ai_cache_status_created_at_idx
on public.ai_cache(status, created_at desc);

create index if not exists ai_cache_source_ref_idx
on public.ai_cache(source_ref);

create index if not exists ai_cache_input_hash_idx
on public.ai_cache(input_hash);

-- 4) user_scene_progress: add time-based index for activity views
create index if not exists user_scene_progress_last_viewed_at_idx
on public.user_scene_progress(last_viewed_at desc);
