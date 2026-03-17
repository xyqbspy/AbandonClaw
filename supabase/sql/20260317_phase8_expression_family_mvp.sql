-- Phase 8: expression family support (minimal schema extension)

alter table public.user_phrases
add column if not exists expression_family_id text;

create index if not exists user_phrases_user_expression_family_idx
on public.user_phrases(user_id, expression_family_id);
