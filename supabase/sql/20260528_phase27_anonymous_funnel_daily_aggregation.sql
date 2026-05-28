-- Phase 27: anonymous funnel daily aggregation (enable-anonymous-trial-mode 8.3)
-- 生成 daily_anon_cost_report 行,供成本看板与告警阈值比对。

create or replace function public.aggregate_daily_anon_cost_report(p_date date default current_date - 1)
returns public.daily_anon_cost_report
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 估算单价:explain ~ Anthropic Sonnet 短输入约 0.0009 USD,tts ~ OpenAI tts-1 单段约 0.0003 USD。
  c_explain_unit_usd constant numeric := 0.0009;
  c_tts_unit_usd constant numeric := 0.0003;

  v_day_start timestamptz := (p_date::timestamptz at time zone 'UTC');
  v_day_end timestamptz := v_day_start + interval '1 day';

  v_total_sessions integer := 0;
  v_ai_explain_calls integer := 0;
  v_tts_play_count integer := 0;
  v_anon_registered integer := 0;
  v_estimated_cost numeric := 0;
  v_conversion_rate numeric := null;
  v_cost_per_conversion numeric := null;

  v_result public.daily_anon_cost_report;
begin
  select count(*) into v_total_sessions
    from public.anonymous_funnel_events
   where event_name = 'anon_session_created'
     and created_at >= v_day_start
     and created_at < v_day_end;

  select count(*) into v_ai_explain_calls
    from public.anonymous_funnel_events
   where event_name = 'anon_ai_explain_used'
     and created_at >= v_day_start
     and created_at < v_day_end;

  -- tts 播放通过 payload->>'capability' = 'tts_play' 的 quota_blocked / 自定义事件区分较繁琐,
  -- 改用专用 payload 标签:event_name = 'anon_ai_explain_used' 时 payload->>'capability' = 'tts_play' 也聚合。
  select count(*) into v_tts_play_count
    from public.anonymous_funnel_events
   where created_at >= v_day_start
     and created_at < v_day_end
     and (
       payload->>'capability' = 'tts_play'
       or event_name = 'anon_tts_play_used'
     );

  select count(*) into v_anon_registered
    from public.anonymous_funnel_events
   where event_name = 'anon_registered'
     and created_at >= v_day_start
     and created_at < v_day_end;

  v_estimated_cost := round(
    (v_ai_explain_calls * c_explain_unit_usd) + (v_tts_play_count * c_tts_unit_usd),
    4
  );

  if v_total_sessions > 0 then
    v_conversion_rate := round(v_anon_registered::numeric / v_total_sessions::numeric, 4);
  end if;

  if v_anon_registered > 0 then
    v_cost_per_conversion := round(v_estimated_cost / v_anon_registered::numeric, 4);
  end if;

  insert into public.daily_anon_cost_report (
    report_date,
    total_sessions,
    ai_explain_calls,
    tts_play_count,
    estimated_cost_usd,
    anon_registered,
    conversion_rate,
    cost_per_conversion,
    generated_at
  )
  values (
    p_date,
    v_total_sessions,
    v_ai_explain_calls,
    v_tts_play_count,
    v_estimated_cost,
    v_anon_registered,
    v_conversion_rate,
    v_cost_per_conversion,
    now()
  )
  on conflict (report_date) do update set
    total_sessions = excluded.total_sessions,
    ai_explain_calls = excluded.ai_explain_calls,
    tts_play_count = excluded.tts_play_count,
    estimated_cost_usd = excluded.estimated_cost_usd,
    anon_registered = excluded.anon_registered,
    conversion_rate = excluded.conversion_rate,
    cost_per_conversion = excluded.cost_per_conversion,
    generated_at = excluded.generated_at
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.aggregate_daily_anon_cost_report(date) to service_role;
revoke execute on function public.aggregate_daily_anon_cost_report(date) from anon, authenticated;
