drop index if exists public.user_phrases_user_expression_family_idx;

alter table public.user_phrases
drop column if exists expression_family_id;
