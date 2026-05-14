alter table public.scenes
  add column if not exists level text not null default 'L1',
  add column if not exists category text not null default 'general',
  add column if not exists subcategory text,
  add column if not exists source_type text not null default 'builtin',
  add column if not exists is_starter boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists estimated_minutes integer not null default 5,
  add column if not exists learning_goal text,
  add column if not exists tags jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scenes_source_type_check'
      and conrelid = 'public.scenes'::regclass
  ) then
    alter table public.scenes
      add constraint scenes_source_type_check
      check (source_type in ('builtin', 'user_generated', 'imported', 'ai_generated'));
  end if;
end
$$;

update public.scenes
set
  source_type = case
    when origin = 'imported' then 'imported'
    else 'builtin'
  end,
  estimated_minutes = greatest(
    1,
    coalesce(
      nullif((scene_json ->> 'estimatedMinutes'), '')::integer,
      estimated_minutes,
      5
    )
  ),
  tags = case
    when jsonb_typeof(scene_json -> 'tags') = 'array' then scene_json -> 'tags'
    when tags is null then '[]'::jsonb
    else tags
  end
where true;

create index if not exists scenes_source_type_idx on public.scenes(source_type);
create index if not exists scenes_starter_featured_sort_idx
  on public.scenes(is_starter desc, is_featured desc, sort_order asc, created_at desc);
