-- Phase 9: manual expression source metadata (minimal MVP)
-- Safe to run multiple times.

alter table if exists public.user_phrases
  add column if not exists source_type text;

alter table if exists public.user_phrases
  add column if not exists source_note text;

-- Backfill existing rows as scene-derived by default.
update public.user_phrases
set source_type = coalesce(source_type, 'scene')
where source_type is null;

-- Keep source_type constrained.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_phrases_source_type_check'
  ) then
    alter table public.user_phrases
      add constraint user_phrases_source_type_check
      check (source_type in ('scene', 'manual'));
  end if;
end $$;

alter table if exists public.user_phrases
  alter column source_type set default 'scene';

