alter table public.user_scene_progress
add column if not exists completed_sentence_count int not null default 0;

alter table public.user_scene_sessions
add column if not exists completed_sentence_count int not null default 0;
