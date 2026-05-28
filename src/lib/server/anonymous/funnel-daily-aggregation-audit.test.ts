import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "..", "..", "..", "..");
const phase27Sql = readFileSync(
  path.join(
    projectRoot,
    "supabase",
    "sql",
    "20260528_phase27_anonymous_funnel_daily_aggregation.sql",
  ),
  "utf8",
);

const normalize = (sql: string) => sql.replace(/\s+/g, " ").toLowerCase();
const sqlText = normalize(phase27Sql);

test("phase27 创建 aggregate_daily_anon_cost_report 函数,签名接收 date 参数", () => {
  assert.match(
    sqlText,
    /create or replace function public\.aggregate_daily_anon_cost_report\(p_date date/,
  );
});

test("phase27 函数 security definer + search_path = public 防止 schema 漂移", () => {
  assert.match(sqlText, /security definer/);
  assert.match(sqlText, /set search_path = public/);
});

test("phase27 聚合 anon_session_created / anon_ai_explain_used / anon_registered 三个事件", () => {
  assert.match(sqlText, /event_name = 'anon_session_created'/);
  assert.match(sqlText, /event_name = 'anon_ai_explain_used'/);
  assert.match(sqlText, /event_name = 'anon_registered'/);
});

test("phase27 用 payload->>'capability' = 'tts_play' 统计 TTS 调用量", () => {
  assert.match(sqlText, /payload->>'capability' = 'tts_play'/);
});

test("phase27 估算成本 = explain * c_explain + tts * c_tts(单价以常量定义,便于审计)", () => {
  assert.match(sqlText, /c_explain_unit_usd constant numeric/);
  assert.match(sqlText, /c_tts_unit_usd constant numeric/);
  assert.match(
    sqlText,
    /v_ai_explain_calls \* c_explain_unit_usd\) \+ \(v_tts_play_count \* c_tts_unit_usd/,
  );
});

test("phase27 conversion_rate 仅在 sessions>0 时计算,避免除零", () => {
  assert.match(sqlText, /if v_total_sessions > 0 then/);
  assert.match(sqlText, /v_conversion_rate := round\(v_anon_registered::numeric \/ v_total_sessions::numeric/);
});

test("phase27 cost_per_conversion 仅在 anon_registered>0 时计算", () => {
  assert.match(sqlText, /if v_anon_registered > 0 then/);
  assert.match(sqlText, /v_cost_per_conversion := round\(v_estimated_cost \/ v_anon_registered::numeric/);
});

test("phase27 upsert 到 daily_anon_cost_report 使用 on conflict (report_date)", () => {
  assert.match(sqlText, /insert into public\.daily_anon_cost_report/);
  assert.match(sqlText, /on conflict \(report_date\) do update/);
});

test("phase27 grant/revoke 仅 service_role 可执行,anon/authenticated 一律 revoke", () => {
  assert.match(
    sqlText,
    /grant execute on function public\.aggregate_daily_anon_cost_report\(date\) to service_role/,
  );
  assert.match(
    sqlText,
    /revoke execute on function public\.aggregate_daily_anon_cost_report\(date\) from anon, authenticated/,
  );
});
