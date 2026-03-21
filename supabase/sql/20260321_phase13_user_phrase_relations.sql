create table if not exists public.user_phrase_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_user_phrase_id uuid not null references public.user_phrases(id) on delete cascade,
  target_user_phrase_id uuid not null references public.user_phrases(id) on delete cascade,
  relation_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_user_phrase_id, target_user_phrase_id, relation_type),
  constraint user_phrase_relations_type_check
    check (relation_type in ('similar', 'contrast')),
  constraint user_phrase_relations_not_self_check
    check (source_user_phrase_id <> target_user_phrase_id)
);

create index if not exists user_phrase_relations_user_source_idx
on public.user_phrase_relations(user_id, source_user_phrase_id, relation_type);

create index if not exists user_phrase_relations_user_target_idx
on public.user_phrase_relations(user_id, target_user_phrase_id, relation_type);

drop trigger if exists user_phrase_relations_set_updated_at on public.user_phrase_relations;
create trigger user_phrase_relations_set_updated_at
before update on public.user_phrase_relations
for each row execute function public.set_updated_at();

alter table public.user_phrase_relations enable row level security;

drop policy if exists "user_phrase_relations_select_own" on public.user_phrase_relations;
create policy "user_phrase_relations_select_own"
on public.user_phrase_relations for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_phrase_relations_insert_own" on public.user_phrase_relations;
create policy "user_phrase_relations_insert_own"
on public.user_phrase_relations for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_phrase_relations_update_own" on public.user_phrase_relations;
create policy "user_phrase_relations_update_own"
on public.user_phrase_relations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_phrase_relations_delete_own" on public.user_phrase_relations;
create policy "user_phrase_relations_delete_own"
on public.user_phrase_relations for delete
to authenticated
using (user_id = auth.uid());
