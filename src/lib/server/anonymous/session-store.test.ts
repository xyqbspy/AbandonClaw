import assert from "node:assert/strict";
import test from "node:test";
import { AnonIpRateLimitedError } from "@/lib/server/errors";
import { upsertAnonymousSession } from "./session-store";

const ORIGINAL_LIMIT = process.env.ANON_IP_SESSION_DAILY_LIMIT;

const restore = () => {
  if (ORIGINAL_LIMIT === undefined) {
    delete process.env.ANON_IP_SESSION_DAILY_LIMIT;
  } else {
    process.env.ANON_IP_SESSION_DAILY_LIMIT = ORIGINAL_LIMIT;
  }
};

type SessionRow = { anon_id: string; ip_hash: string; created_at: string };

const makeFakeAdmin = (state: { sessions: SessionRow[] }) => ({
  from: (_table: string) => ({
    select: (_fields: string, opts?: { count?: string; head?: boolean }) => ({
      eq: (field: string, value: string) => {
        if (opts?.head) {
          const filtered = state.sessions.filter((s) => s[field as keyof SessionRow] === value);
          return {
            gte: () => Promise.resolve({ count: filtered.length, error: null }),
          };
        }
        const found = state.sessions.find((s) => s[field as keyof SessionRow] === value);
        return {
          maybeSingle: () => Promise.resolve({ data: found ?? null, error: null }),
        };
      },
    }),
    insert: (row: SessionRow) => {
      state.sessions.push({
        anon_id: row.anon_id,
        ip_hash: row.ip_hash,
        created_at: row.created_at,
      });
      return Promise.resolve({ error: null });
    },
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  }),
});

const newAnonId = (suffix: string) =>
  `00000000-0000-4000-8000-00000000${suffix.padStart(4, "0")}`;

test("upsertAnonymousSession 新 anon_id 触发 insert", async () => {
  const state = { sessions: [] as SessionRow[] };
  const result = await upsertAnonymousSession(
    { anonId: newAnonId("0001"), ipHash: "hash-a" },
    { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
  );
  assert.equal(result.isNewAnonId, true);
  assert.equal(state.sessions.length, 1);
});

test("upsertAnonymousSession 已存在 anon_id 只更新 last_active_at,不增 IP 计数", async () => {
  const state = {
    sessions: [
      { anon_id: newAnonId("0001"), ip_hash: "hash-a", created_at: new Date().toISOString() },
    ] as SessionRow[],
  };
  const result = await upsertAnonymousSession(
    { anonId: newAnonId("0001"), ipHash: "hash-a" },
    { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
  );
  assert.equal(result.isNewAnonId, false);
  assert.equal(state.sessions.length, 1);
});

test("upsertAnonymousSession 同 ip_hash 当日超过上限(默认 5)时抛 AnonIpRateLimitedError", async () => {
  delete process.env.ANON_IP_SESSION_DAILY_LIMIT;
  const today = new Date().toISOString();
  const state = {
    sessions: Array.from({ length: 5 }, (_, i) => ({
      anon_id: newAnonId(String(i)),
      ip_hash: "hash-a",
      created_at: today,
    })) as SessionRow[],
  };

  await assert.rejects(
    () =>
      upsertAnonymousSession(
        { anonId: newAnonId("9999"), ipHash: "hash-a" },
        { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
      ),
    AnonIpRateLimitedError,
  );
  assert.equal(state.sessions.length, 5);
  restore();
});

test("upsertAnonymousSession env ANON_IP_SESSION_DAILY_LIMIT 覆盖默认值", async () => {
  process.env.ANON_IP_SESSION_DAILY_LIMIT = "2";
  const today = new Date().toISOString();
  const state = {
    sessions: [
      { anon_id: newAnonId("0001"), ip_hash: "hash-a", created_at: today },
      { anon_id: newAnonId("0002"), ip_hash: "hash-a", created_at: today },
    ] as SessionRow[],
  };

  await assert.rejects(
    () =>
      upsertAnonymousSession(
        { anonId: newAnonId("0003"), ipHash: "hash-a" },
        { createSupabaseAdminClient: () => makeFakeAdmin(state) as never },
      ),
    AnonIpRateLimitedError,
  );
  restore();
});
