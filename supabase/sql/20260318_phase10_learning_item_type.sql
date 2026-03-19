-- Phase 10: distinguish expression vs sentence learning items (minimal schema extension)

alter table if exists public.user_phrases
  add column if not exists learning_item_type text;

update public.user_phrases
set learning_item_type = coalesce(learning_item_type, 'expression')
where learning_item_type is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_phrases_learning_item_type_check'
  ) then
    alter table public.user_phrases
      add constraint user_phrases_learning_item_type_check
      check (learning_item_type in ('expression', 'sentence'));
  end if;
end $$;

alter table if exists public.user_phrases
  alter column learning_item_type set default 'expression';

create index if not exists user_phrases_user_learning_item_type_saved_at_idx
on public.user_phrases(user_id, learning_item_type, saved_at desc);
