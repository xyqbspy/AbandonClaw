-- Phase 25: Anonymous trial mode (enable-anonymous-trial-mode)
-- 仅创建匿名身份与漏斗事件两张支撑表;不持久化任何业务学习态。

-- Anonymous sessions: 仅供后端配额判定与 IP 防绕过,不含业务字段。
create table if not exists public.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null unique,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index if not exists anonymous_sessions_ip_hash_idx
  on public.anonymous_sessions (ip_hash);
create index if not exists anonymous_sessions_last_active_at_idx
  on public.anonymous_sessions (last_active_at);

alter table public.anonymous_sessions enable row level security;

-- anon role 不允许直读匿名会话(身份判定走 service role)
drop policy if exists anonymous_sessions_no_read on public.anonymous_sessions;
create policy anonymous_sessions_no_read
  on public.anonymous_sessions
  for select
  to anon, authenticated
  using (false);

drop policy if exists anonymous_sessions_no_write on public.anonymous_sessions;
create policy anonymous_sessions_no_write
  on public.anonymous_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Anonymous funnel events: 漏斗 8 事件 + 隐私最小化(无 IP 明文 / 无 anon_id 明文 PII)。
create table if not exists public.anonymous_funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  anon_id text not null,
  ip_hash text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists anonymous_funnel_events_anon_id_idx
  on public.anonymous_funnel_events (anon_id);
create index if not exists anonymous_funnel_events_event_name_created_at_idx
  on public.anonymous_funnel_events (event_name, created_at desc);

alter table public.anonymous_funnel_events enable row level security;

drop policy if exists anonymous_funnel_events_no_read on public.anonymous_funnel_events;
create policy anonymous_funnel_events_no_read
  on public.anonymous_funnel_events
  for select
  to anon, authenticated
  using (false);

drop policy if exists anonymous_funnel_events_no_write on public.anonymous_funnel_events;
create policy anonymous_funnel_events_no_write
  on public.anonymous_funnel_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Anonymous daily cost report: 每日聚合输出,供成本看板与告警阈值比对。
create table if not exists public.daily_anon_cost_report (
  report_date date primary key,
  total_sessions integer not null default 0,
  ai_explain_calls integer not null default 0,
  tts_play_count integer not null default 0,
  estimated_cost_usd numeric(10, 4) not null default 0,
  anon_registered integer not null default 0,
  conversion_rate numeric(6, 4),
  cost_per_conversion numeric(10, 4),
  generated_at timestamptz not null default now()
);

alter table public.daily_anon_cost_report enable row level security;

drop policy if exists daily_anon_cost_report_no_access on public.daily_anon_cost_report;
create policy daily_anon_cost_report_no_access
  on public.daily_anon_cost_report
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- 清理过期匿名会话:RPC 入口,由后端 cron 调用。
create or replace function public.cleanup_anonymous_sessions(p_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  delete from public.anonymous_sessions
   where last_active_at < now() - make_interval(days => p_days);
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

grant execute on function public.cleanup_anonymous_sessions(integer) to service_role;
revoke execute on function public.cleanup_anonymous_sessions(integer) from anon, authenticated;
