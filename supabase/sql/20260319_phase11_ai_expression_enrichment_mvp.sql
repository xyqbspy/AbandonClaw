-- Phase 11: AI expression enrichment status + minimal learning fields

alter table if exists public.user_phrases
add column if not exists ai_enrichment_status text;

alter table if exists public.user_phrases
add column if not exists ai_semantic_focus text;

alter table if exists public.user_phrases
add column if not exists ai_typical_scenario text;

alter table if exists public.user_phrases
add column if not exists ai_enrichment_error text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'user_phrases_ai_enrichment_status_check'
  ) then
    alter table public.user_phrases
      drop constraint user_phrases_ai_enrichment_status_check;
  end if;
end $$;

alter table if exists public.user_phrases
add constraint user_phrases_ai_enrichment_status_check
check (
  ai_enrichment_status is null
  or ai_enrichment_status in ('pending', 'done', 'failed')
);

create index if not exists user_phrases_user_ai_enrichment_status_idx
on public.user_phrases(user_id, ai_enrichment_status);
