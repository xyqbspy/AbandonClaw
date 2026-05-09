alter table public.profiles
  add column if not exists access_status text not null default 'active'
  check (access_status in ('active', 'disabled', 'generation_limited', 'readonly'));

alter table public.user_scene_progress
  add column if not exists last_study_seconds_at timestamptz;

create table if not exists public.user_daily_high_cost_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  capability text not null,
  reserved_count integer not null default 0 check (reserved_count >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  limit_count integer not null check (limit_count >= 0),
  last_reserved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, usage_date, capability)
);

create index if not exists user_daily_high_cost_usage_date_idx
  on public.user_daily_high_cost_usage (usage_date, capability);

create table if not exists public.learning_study_time_anomalies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  reported_delta integer not null,
  reason text not null check (reason in ('delta_too_large', 'too_frequent')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists learning_study_time_anomalies_user_scene_idx
  on public.learning_study_time_anomalies (user_id, scene_id, created_at desc);

drop trigger if exists set_user_daily_high_cost_usage_updated_at
  on public.user_daily_high_cost_usage;
create trigger set_user_daily_high_cost_usage_updated_at
  before update on public.user_daily_high_cost_usage
  for each row execute function public.set_updated_at();

alter table public.user_daily_high_cost_usage enable row level security;
alter table public.learning_study_time_anomalies enable row level security;

create or replace function public.reserve_daily_high_cost_usage(
  p_user_id uuid,
  p_usage_date date,
  p_capability text,
  p_limit_count integer
)
returns table (
  allowed boolean,
  reserved_count integer,
  limit_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.user_daily_high_cost_usage%rowtype;
begin
  insert into public.user_daily_high_cost_usage (
    user_id,
    usage_date,
    capability,
    reserved_count,
    limit_count,
    last_reserved_at
  )
  values (
    p_user_id,
    p_usage_date,
    p_capability,
    0,
    p_limit_count,
    timezone('utc'::text, now())
  )
  on conflict (user_id, usage_date, capability) do update
    set limit_count = excluded.limit_count
  returning * into current_row;

  select *
  into current_row
  from public.user_daily_high_cost_usage
  where user_id = p_user_id
    and usage_date = p_usage_date
    and capability = p_capability
  for update;

  if current_row.reserved_count >= p_limit_count then
    allowed := false;
    reserved_count := current_row.reserved_count;
    limit_count := p_limit_count;
    return next;
    return;
  end if;

  update public.user_daily_high_cost_usage
  set reserved_count = reserved_count + 1,
      limit_count = p_limit_count,
      last_reserved_at = timezone('utc'::text, now())
  where id = current_row.id
  returning user_daily_high_cost_usage.reserved_count,
            user_daily_high_cost_usage.limit_count
    into reserved_count, limit_count;

  allowed := true;
  return next;
end;
$$;

create or replace function public.mark_daily_high_cost_usage(
  p_user_id uuid,
  p_usage_date date,
  p_capability text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status = 'success' then
    update public.user_daily_high_cost_usage
    set success_count = success_count + 1
    where user_id = p_user_id
      and usage_date = p_usage_date
      and capability = p_capability;
  elsif p_status = 'failed' then
    update public.user_daily_high_cost_usage
    set failed_count = failed_count + 1
    where user_id = p_user_id
      and usage_date = p_usage_date
      and capability = p_capability;
  else
    raise exception 'Invalid high cost usage status: %', p_status;
  end if;
end;
$$;
