import assert from "node:assert/strict";
import test from "node:test";
import {
  ANONYMOUS_FUNNEL_EVENT_NAMES,
  isAnonymousFunnelEventName,
  recordAnonymousFunnelEvent,
  type AnonymousFunnelEventName,
} from "./funnel-events";

type EventRow = {
  event_name: string;
  anon_id: string;
  ip_hash: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const makeFakeAdmin = (state: { events: EventRow[]; insertError?: string | null }) => ({
  from: (_table: string) => ({
    insert: (row: EventRow) => {
      if (state.insertError) {
        return Promise.resolve({ error: { message: state.insertError } });
      }
      state.events.push(row);
      return Promise.resolve({ error: null });
    },
  }),
});

test("ANONYMOUS_FUNNEL_EVENT_NAMES 包含 spec 定义的 8 个事件", () => {
  const expected: AnonymousFunnelEventName[] = [
    "anon_session_created",
    "anon_first_scene_viewed",
    "anon_first_scene_completed",
    "anon_ai_explain_used",
    "anon_quota_blocked",
    "anon_register_prompt_shown",
    "anon_register_prompt_clicked",
    "anon_registered",
  ];
  assert.equal(ANONYMOUS_FUNNEL_EVENT_NAMES.length, 8);
  for (const name of expected) {
    assert.ok(
      (ANONYMOUS_FUNNEL_EVENT_NAMES as readonly string[]).includes(name),
      `missing event: ${name}`,
    );
  }
});

test("isAnonymousFunnelEventName 守卫已知与未知事件", () => {
  assert.equal(isAnonymousFunnelEventName("anon_session_created"), true);
  assert.equal(isAnonymousFunnelEventName("anon_registered"), true);
  assert.equal(isAnonymousFunnelEventName("not_a_real_event"), false);
  assert.equal(isAnonymousFunnelEventName(""), false);
});

test("recordAnonymousFunnelEvent 写入完整字段(含 payload + created_at)", async () => {
  const state = { events: [] as EventRow[] };
  await recordAnonymousFunnelEvent(
    {
      eventName: "anon_ai_explain_used",
      anonId: "anon-001",
      ipHash: "hash-a",
      payload: { capability: "explain_selection", remaining: 2 },
      now: new Date("2026-05-28T10:00:00.000Z"),
    },
    { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
  );
  assert.equal(state.events.length, 1);
  const [row] = state.events;
  assert.equal(row.event_name, "anon_ai_explain_used");
  assert.equal(row.anon_id, "anon-001");
  assert.equal(row.ip_hash, "hash-a");
  assert.equal(row.created_at, "2026-05-28T10:00:00.000Z");
  assert.deepEqual(row.payload, {
    capability: "explain_selection",
    remaining: 2,
  });
});

test("recordAnonymousFunnelEvent payload 缺省时写 null", async () => {
  const state = { events: [] as EventRow[] };
  await recordAnonymousFunnelEvent(
    {
      eventName: "anon_session_created",
      anonId: "anon-002",
      ipHash: "hash-b",
    },
    { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
  );
  assert.equal(state.events[0].payload, null);
});

test("recordAnonymousFunnelEvent anon_registered 可以携带 from_anon_id 关联匿名 → 注册转化", async () => {
  const state = { events: [] as EventRow[] };
  await recordAnonymousFunnelEvent(
    {
      eventName: "anon_registered",
      anonId: "anon-003",
      ipHash: "hash-c",
      payload: { from_anon_id: "anon-003", new_user_id: "u_42" },
    },
    { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
  );
  const row = state.events[0];
  assert.equal(row.event_name, "anon_registered");
  assert.equal((row.payload as { from_anon_id?: string })?.from_anon_id, "anon-003");
});

test("recordAnonymousFunnelEvent 未知事件名抛错(防止漏斗失真)", async () => {
  const state = { events: [] as EventRow[] };
  await assert.rejects(
    () =>
      recordAnonymousFunnelEvent(
        {
          eventName: "anon_unknown" as AnonymousFunnelEventName,
          anonId: "anon-004",
          ipHash: "hash-d",
        },
        { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
      ),
    /unknown event_name/,
  );
  assert.equal(state.events.length, 0);
});

test("recordAnonymousFunnelEvent 缺 anonId/ipHash 抛错", async () => {
  const state = { events: [] as EventRow[] };
  await assert.rejects(
    () =>
      recordAnonymousFunnelEvent(
        {
          eventName: "anon_session_created",
          anonId: "",
          ipHash: "hash-e",
        },
        { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
      ),
    /anonId\/ipHash required/,
  );
});

test("recordAnonymousFunnelEvent supabase insert 错误时把消息透传出来", async () => {
  const state = { events: [] as EventRow[], insertError: "RLS denied" };
  await assert.rejects(
    () =>
      recordAnonymousFunnelEvent(
        {
          eventName: "anon_register_prompt_shown",
          anonId: "anon-005",
          ipHash: "hash-f",
        },
        { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
      ),
    /RLS denied/,
  );
});
