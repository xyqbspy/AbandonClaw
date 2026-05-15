alter table public.phrases
  add column if not exists is_builtin boolean not null default false,
  add column if not exists is_core boolean not null default false,
  add column if not exists level text,
  add column if not exists category text,
  add column if not exists phrase_type text,
  add column if not exists source_scene_slug text,
  add column if not exists frequency_rank integer;

create index if not exists phrases_builtin_core_idx
  on public.phrases (is_builtin desc, is_core desc, level asc, category asc, frequency_rank asc nulls last);

create index if not exists phrases_source_scene_slug_idx
  on public.phrases (source_scene_slug);
