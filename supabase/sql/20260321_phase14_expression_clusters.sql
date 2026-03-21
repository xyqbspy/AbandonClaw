create table if not exists public.user_expression_clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  main_user_phrase_id uuid null references public.user_phrases(id) on delete set null,
  title text null,
  semantic_focus text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_expression_clusters_user_idx
on public.user_expression_clusters(user_id, updated_at desc);

create index if not exists user_expression_clusters_user_main_idx
on public.user_expression_clusters(user_id, main_user_phrase_id);

create table if not exists public.user_expression_cluster_members (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.user_expression_clusters(id) on delete cascade,
  user_phrase_id uuid not null references public.user_phrases(id) on delete cascade,
  role text not null default 'variant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cluster_id, user_phrase_id),
  unique(user_phrase_id),
  constraint user_expression_cluster_members_role_check
    check (role in ('main', 'variant'))
);

create index if not exists user_expression_cluster_members_cluster_idx
on public.user_expression_cluster_members(cluster_id, role);

create index if not exists user_expression_cluster_members_phrase_idx
on public.user_expression_cluster_members(user_phrase_id);

drop trigger if exists user_expression_clusters_set_updated_at on public.user_expression_clusters;
create trigger user_expression_clusters_set_updated_at
before update on public.user_expression_clusters
for each row execute function public.set_updated_at();

drop trigger if exists user_expression_cluster_members_set_updated_at on public.user_expression_cluster_members;
create trigger user_expression_cluster_members_set_updated_at
before update on public.user_expression_cluster_members
for each row execute function public.set_updated_at();

alter table public.user_expression_clusters enable row level security;
alter table public.user_expression_cluster_members enable row level security;

drop policy if exists "user_expression_clusters_select_own" on public.user_expression_clusters;
create policy "user_expression_clusters_select_own"
on public.user_expression_clusters for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_expression_clusters_insert_own" on public.user_expression_clusters;
create policy "user_expression_clusters_insert_own"
on public.user_expression_clusters for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_expression_clusters_update_own" on public.user_expression_clusters;
create policy "user_expression_clusters_update_own"
on public.user_expression_clusters for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_expression_clusters_delete_own" on public.user_expression_clusters;
create policy "user_expression_clusters_delete_own"
on public.user_expression_clusters for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_expression_cluster_members_select_own" on public.user_expression_cluster_members;
create policy "user_expression_cluster_members_select_own"
on public.user_expression_cluster_members for select
to authenticated
using (
  exists (
    select 1
    from public.user_expression_clusters c
    where c.id = cluster_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "user_expression_cluster_members_insert_own" on public.user_expression_cluster_members;
create policy "user_expression_cluster_members_insert_own"
on public.user_expression_cluster_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_expression_clusters c
    where c.id = cluster_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "user_expression_cluster_members_update_own" on public.user_expression_cluster_members;
create policy "user_expression_cluster_members_update_own"
on public.user_expression_cluster_members for update
to authenticated
using (
  exists (
    select 1
    from public.user_expression_clusters c
    where c.id = cluster_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_expression_clusters c
    where c.id = cluster_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "user_expression_cluster_members_delete_own" on public.user_expression_cluster_members;
create policy "user_expression_cluster_members_delete_own"
on public.user_expression_cluster_members for delete
to authenticated
using (
  exists (
    select 1
    from public.user_expression_clusters c
    where c.id = cluster_id
      and c.user_id = auth.uid()
  )
);
