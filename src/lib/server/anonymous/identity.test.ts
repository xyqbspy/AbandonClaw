import assert from "node:assert/strict";
import test from "node:test";
import { AnonIdRequiredError } from "@/lib/server/errors";
import {
  isSearchEngineBotRequest,
  readAnonymousIdHeader,
  resolveAnonymousContext,
} from "./identity";

const VALID_ANON_ID = "11111111-2222-4333-8444-555555555555";

const makeRequest = (init?: { anonId?: string; ua?: string; ip?: string }) =>
  new Request("http://localhost/api/test", {
    headers: {
      ...(init?.anonId === undefined ? {} : { "x-anonymous-id": init.anonId }),
      ...(init?.ua === undefined ? {} : { "user-agent": init.ua }),
      ...(init?.ip === undefined ? {} : { "x-forwarded-for": init.ip }),
    },
  });

const makeFakeAdminClient = (state: { sessions: Array<{ anon_id: string; ip_hash: string; created_at: string }> }) => ({
  from: (table: string) => {
    assert.equal(table, "anonymous_sessions");
    return {
      select: (_fields: string, opts?: { count?: string; head?: boolean }) => {
        const builder = {
          eq: (field: string, value: string) => {
            if (opts?.head) {
              const filtered = state.sessions.filter((s) => s.ip_hash === value);
              return {
                gte: () => Promise.resolve({ count: filtered.length, error: null }),
              };
            }
            const found = state.sessions.find((s) => s[field as keyof typeof s] === value);
            return {
              maybeSingle: () => Promise.resolve({ data: found ?? null, error: null }),
            };
          },
        };
        return builder;
      },
      insert: (row: { anon_id: string; ip_hash: string; created_at: string }) => {
        state.sessions.push({
          anon_id: row.anon_id,
          ip_hash: row.ip_hash,
          created_at: row.created_at,
        });
        return Promise.resolve({ error: null });
      },
      update: (_payload: unknown) => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    };
  },
});

test("readAnonymousIdHeader 返回合法 UUID v4", () => {
  const request = makeRequest({ anonId: VALID_ANON_ID });
  assert.equal(readAnonymousIdHeader(request), VALID_ANON_ID);
});

test("readAnonymousIdHeader 拒绝非法格式", () => {
  assert.equal(readAnonymousIdHeader(makeRequest({ anonId: "not-a-uuid" })), null);
  assert.equal(readAnonymousIdHeader(makeRequest({ anonId: "" })), null);
  assert.equal(readAnonymousIdHeader(makeRequest()), null);
});

test("isSearchEngineBotRequest 识别 Googlebot/Bingbot/Baiduspider", () => {
  assert.equal(isSearchEngineBotRequest(makeRequest({ ua: "Mozilla/5.0 (compatible; Googlebot/2.1)" })), true);
  assert.equal(isSearchEngineBotRequest(makeRequest({ ua: "Mozilla/5.0 (compatible; bingbot/2.0)" })), true);
  assert.equal(isSearchEngineBotRequest(makeRequest({ ua: "Baiduspider/2.0" })), true);
  assert.equal(isSearchEngineBotRequest(makeRequest({ ua: "Mozilla/5.0 Chrome/120" })), false);
});

test("resolveAnonymousContext 缺失 anon_id 头时抛 AnonIdRequiredError", async () => {
  const state = { sessions: [] as Array<{ anon_id: string; ip_hash: string; created_at: string }> };
  await assert.rejects(
    () =>
      resolveAnonymousContext(makeRequest(), {
        createSupabaseAdminClient: () => makeFakeAdminClient(state) as never,
      }),
    AnonIdRequiredError,
  );
});

test("resolveAnonymousContext bot UA 直接返 isSearchEngineBot 不查表", async () => {
  const state = { sessions: [] as Array<{ anon_id: string; ip_hash: string; created_at: string }> };
  const ctx = await resolveAnonymousContext(makeRequest({ ua: "Googlebot/2.1" }), {
    createSupabaseAdminClient: () => makeFakeAdminClient(state) as never,
  });
  assert.deepEqual(ctx, { anonId: null, ipHash: null, isSearchEngineBot: true });
  assert.equal(state.sessions.length, 0);
});

test("resolveAnonymousContext 正常路径返回身份并落表", async () => {
  const state = { sessions: [] as Array<{ anon_id: string; ip_hash: string; created_at: string }> };
  const ctx = await resolveAnonymousContext(
    makeRequest({ anonId: VALID_ANON_ID, ip: "203.0.113.10" }),
    { createSupabaseAdminClient: () => makeFakeAdminClient(state) as never },
  );
  if (ctx.isSearchEngineBot) throw new Error("expected anonymous identity");
  assert.equal(ctx.anonId, VALID_ANON_ID);
  assert.match(ctx.ipHash, /^[0-9a-f]{64}$/);
  assert.equal(state.sessions.length, 1);
});
