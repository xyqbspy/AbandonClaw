import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { AuthError } from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { clearAnonymousCounterStore } from "@/lib/server/anonymous/counter";
import { handleExplainSelectionPost } from "./route";

const VALID_ANON_ID = "11111111-2222-4333-8444-555555555555";

const ORIGINAL_TRIAL = process.env.ALLOW_ANONYMOUS_TRIAL;
const restoreEnv = () => {
  if (ORIGINAL_TRIAL === undefined) delete process.env.ALLOW_ANONYMOUS_TRIAL;
  else process.env.ALLOW_ANONYMOUS_TRIAL = ORIGINAL_TRIAL;
};

afterEach(() => {
  clearRateLimitStore();
  clearAnonymousCounterStore();
  restoreEnv();
});

type SessionRow = { anon_id: string; ip_hash: string; created_at: string };

const makeFakeAdmin = (state: { sessions: SessionRow[] }) =>
  ({
    from: () => ({
      select: (_fields: string, opts?: { count?: string; head?: boolean }) => ({
        eq: (field: string, value: string) => {
          if (opts?.head) {
            const filtered = state.sessions.filter((s) => s[field as keyof SessionRow] === value);
            return { gte: () => Promise.resolve({ count: filtered.length, error: null }) };
          }
          const found = state.sessions.find((s) => s[field as keyof SessionRow] === value);
          return { maybeSingle: () => Promise.resolve({ data: found ?? null, error: null }) };
        },
      }),
      insert: (row: SessionRow) => {
        state.sessions.push(row);
        return Promise.resolve({ error: null });
      },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }) as never;

const buildAnonDeps = () => {
  const state = { sessions: [] as SessionRow[] };
  return {
    sessionStore: { createSupabaseAdminClient: () => makeFakeAdmin(state) },
    quota: { listDisabledHighCostCapabilities: async () => [] },
  };
};

const createJsonRequest = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/explain-selection", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const quotaOk = {
  reserveHighCostUsage: async () =>
    ({
      userId: "user-1",
      usageDate: "2026-05-09",
      capability: "explain_selection",
      limitCount: 30,
    }) as never,
  markHighCostUsage: async () => {},
};

test("explain selection handler 会拒绝未登录请求", async () => {
  clearRateLimitStore();
  const response = await handleExplainSelectionPost(createJsonRequest({ selectedText: "hi" }), {
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    explainSelection: async () => ({}) as never,
    ...quotaOk,
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});

test("explain selection handler 会透传合法 payload 并标记 success", async () => {
  clearRateLimitStore();
  let receivedPayload: unknown = null;
  const marks: string[] = [];
  const response = await handleExplainSelectionPost(
    createJsonRequest({
      selectedText: "running on empty",
      sourceSentence: "I am running on empty.",
      sourceChunks: ["running on empty", "worn out"],
      lessonId: "lesson-1",
      lessonTitle: "Lesson 1",
      lessonDifficulty: "easy",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      explainSelection: async (payload) => {
        receivedPayload = payload;
        return { chunk: { text: payload.selectedText } } as never;
      },
      reserveHighCostUsage: quotaOk.reserveHighCostUsage,
      markHighCostUsage: async (_reservation, status) => {
        marks.push(status);
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    chunk: { text: "running on empty" },
  });
  assert.deepEqual(receivedPayload, {
    selectedText: "running on empty",
    sourceSentence: "I am running on empty.",
    sourceTranslation: undefined,
    sourceChunks: ["running on empty", "worn out"],
    lessonId: "lesson-1",
    lessonTitle: "Lesson 1",
    lessonDifficulty: "easy",
  });
  assert.deepEqual(marks, ["success"]);
});

test("explain selection handler 会拒绝超长输入且不预占 quota", async () => {
  clearRateLimitStore();
  let reserveCalled = false;
  const response = await handleExplainSelectionPost(
    createJsonRequest({
      selectedText: "x".repeat(241),
      sourceSentence: "I am running on empty.",
      lessonId: "lesson-1",
      lessonTitle: "Lesson 1",
      lessonDifficulty: "easy",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" }, profile: {} } as never),
      explainSelection: async () => ({}) as never,
      reserveHighCostUsage: async () => {
        reserveCalled = true;
        return quotaOk.reserveHighCostUsage();
      },
      markHighCostUsage: async () => {},
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
  assert.equal(reserveCalled, false);
});

test("explain selection handler 匿名分支允许调用并挂载配额响应头", async () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
  const anonDeps = buildAnonDeps();
  let reserveCalled = false;

  const response = await handleExplainSelectionPost(
    createJsonRequest(
      {
        selectedText: "running on empty",
        sourceSentence: "I am running on empty.",
        lessonId: "lesson-1",
        lessonTitle: "Lesson 1",
        lessonDifficulty: "easy",
      },
      { "x-anonymous-id": VALID_ANON_ID },
    ),
    {
      requireCurrentProfile: async () => {
        throw new AuthError();
      },
      explainSelection: async (payload) => ({ chunk: { text: payload.selectedText } }) as never,
      reserveHighCostUsage: async () => {
        reserveCalled = true;
        return quotaOk.reserveHighCostUsage();
      },
      markHighCostUsage: async () => {},
      anonymous: anonDeps,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(reserveCalled, false, "匿名分支不应进入 reserveHighCostUsage");
  assert.equal(response.headers.get("X-Quota-Type"), "explain_selection");
  assert.equal(response.headers.get("X-Quota-Session-Limit"), "3");
  assert.equal(response.headers.get("X-Quota-Session-Remaining"), "2");
  assert.equal(response.headers.get("X-Quota-Daily-Limit"), "200");
  assert.match(response.headers.get("X-Quota-Reset-At") ?? "", /\d{4}-\d{2}-\d{2}T00:00:00/);
});

test("explain selection handler 匿名 session 配额耗尽返 429 ANON_QUOTA_EXCEEDED_SESSION 并附 reset 头", async () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
  const anonDeps = buildAnonDeps();
  let explainCallCount = 0;

  const buildDeps = () => ({
    requireCurrentProfile: async () => {
      throw new AuthError();
    },
    explainSelection: async () => {
      explainCallCount += 1;
      return ({ chunk: { text: "ok" } }) as never;
    },
    reserveHighCostUsage: quotaOk.reserveHighCostUsage,
    markHighCostUsage: async () => {},
    anonymous: anonDeps,
  });

  for (let i = 0; i < 3; i += 1) {
    const ok = await handleExplainSelectionPost(
      createJsonRequest(
        {
          selectedText: "running on empty",
          sourceSentence: "I am running on empty.",
          lessonId: "lesson-1",
          lessonTitle: "Lesson 1",
          lessonDifficulty: "easy",
        },
        { "x-anonymous-id": VALID_ANON_ID },
      ),
      buildDeps(),
    );
    assert.equal(ok.status, 200);
  }

  const response = await handleExplainSelectionPost(
    createJsonRequest(
      {
        selectedText: "running on empty",
        sourceSentence: "I am running on empty.",
        lessonId: "lesson-1",
        lessonTitle: "Lesson 1",
        lessonDifficulty: "easy",
      },
      { "x-anonymous-id": VALID_ANON_ID },
    ),
    buildDeps(),
  );

  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, "ANON_QUOTA_EXCEEDED_SESSION");
  assert.equal(body.details.capability, "explain_selection");
  assert.equal(explainCallCount, 3, "第 4 次不应进入 explain 服务");
});
