-- Phase 12: store AI-generated bilingual example sentences for expressions

alter table if exists public.user_phrases
add column if not exists ai_example_sentences jsonb;
