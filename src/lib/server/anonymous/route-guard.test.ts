import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  AnonFeatureDisabledError,
  AnonIpRateLimitedError,
  AnonQuotaExceededSessionError,
  AuthError,
  ForbiddenError,
  HighCostCapabilityDisabledError,
} from "@/lib/server/errors";
import { clearAnonymousCounterStore } from "./counter";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import {
  ensureProfileOrAnonymousQuota,
  ensureProfileOrRejectAnonymous,
  isAnonymousAccessError,
} from "./route-guard";

const VALID_ANON_ID = "11111111-2222-4333-8444-555555555555";

const ORIGINAL_ENABLED = process.env.ALLOW_ANONYMOUS_TRIAL;
const ORIGINAL_GLOBAL = process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
const ORIGINAL_SESSION = process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;

const enableTrial = () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "true";
};
const disableTrial = () => {
  process.env.ALLOW_ANONYMOUS_TRIAL = "false";
};

const restoreEnv = () => {
  if (ORIGINAL_ENABLED === undefined) delete process.env.ALLOW_ANONYMOUS_TRIAL;
  else process.env.ALLOW_ANONYMOUS_TRIAL = ORIGINAL_ENABLED;
  if (ORIGINAL_GLOBAL === undefined) delete process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION;
  else process.env.ANON_QUOTA_GLOBAL_EXPLAIN_SELECTION = ORIGINAL_GLOBAL;
  if (ORIGINAL_SESSION === undefined) delete process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION;
  else process.env.ANON_QUOTA_SESSION_EXPLAIN_SELECTION = ORIGINAL_SESSION;
};

const buildRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/explain-selection", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-anonymous-id": VALID_ANON_ID,
      ...headers,
    },
  });

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

const fakeSessionStoreDeps = () => {
  const state = { sessions: [] as SessionRow[] };
  return {
    createSupabaseAdminClient: () => makeFakeAdmin(state) as never,
  };
};

const fakeQuotaDeps = {
  listDisabledHighCostCapabilities: async () => [],
};

beforeEach(() => {
  clearAnonymousCounterStore();
  clearRateLimitStore();
});

afterEach(() => {
  restoreEnv();
  clearAnonymousCounterStore();
  clearRateLimitStore();
});

test("ensureProfileOrRejectAnonymous 已登录时透传 getProfile 结果", async () => {
  enableTrial();
  const result = await ensureProfileOrRejectAnonymous("save_phrase", async () => ({
    user: { id: "user-1" },
    profile: { id: "user-1" },
  }));
  assert.deepEqual(result, { user: { id: "user-1" }, profile: { id: "user-1" } });
});

test("ensureProfileOrRejectAnonymous 试用关闭时透传 AuthError", async () => {
  disableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrRejectAnonymous("save_phrase", async () => {
        throw new AuthError();
      }),
    AuthError,
  );
});

test("ensureProfileOrRejectAnonymous 试用打开时把 AuthError 转成 AnonFeatureDisabledError", async () => {
  enableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrRejectAnonymous("save_phrase", async () => {
        throw new AuthError();
      }),
    (error) => {
      assert.ok(error instanceof AnonFeatureDisabledError);
      assert.equal(error.code, "ANON_FEATURE_DISABLED");
      assert.deepEqual(error.details, { capability: "save_phrase" });
      return true;
    },
  );
});

test("ensureProfileOrRejectAnonymous 不吞 ForbiddenError(已登录但无权限)", async () => {
  enableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrRejectAnonymous("save_phrase", async () => {
        throw new ForbiddenError("Account disabled.");
      }),
    ForbiddenError,
  );
});

test("ensureProfileOrAnonymousQuota 已登录走 registered 分支", async () => {
  enableTrial();
  const result = await ensureProfileOrAnonymousQuota(
    "explain_selection",
    buildRequest(),
    async () => ({ user: { id: "user-1" } as never, profile: {} as never }),
    { sessionStore: fakeSessionStoreDeps(), quota: fakeQuotaDeps },
  );
  assert.equal(result.mode, "registered");
  assert.equal(result.quotaResult, null);
  assert.equal(result.anonContext, null);
});

test("ensureProfileOrAnonymousQuota 试用关闭 + 未登录:透传 AuthError", async () => {
  disableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrAnonymousQuota(
        "explain_selection",
        buildRequest(),
        async () => {
          throw new AuthError();
        },
      ),
    AuthError,
  );
});

test("ensureProfileOrAnonymousQuota 试用打开 + 匿名 + anonAllowed=false:抛 AnonFeatureDisabledError", async () => {
  enableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrAnonymousQuota(
        "scene_generate",
        buildRequest(),
        async () => {
          throw new AuthError();
        },
        { sessionStore: fakeSessionStoreDeps(), quota: fakeQuotaDeps },
      ),
    (error) => {
      assert.ok(error instanceof AnonFeatureDisabledError);
      assert.deepEqual(error.details, { capability: "scene_generate" });
      return true;
    },
  );
});

test("ensureProfileOrAnonymousQuota 试用打开 + 匿名 + 允许:返回 quotaResult,sessionRemaining 递减", async () => {
  enableTrial();
  const result = await ensureProfileOrAnonymousQuota(
    "explain_selection",
    buildRequest(),
    async () => {
      throw new AuthError();
    },
    { sessionStore: fakeSessionStoreDeps(), quota: fakeQuotaDeps },
  );

  assert.equal(result.mode, "anonymous");
  if (result.mode !== "anonymous") return;
  assert.equal(result.anonContext.isSearchEngineBot, false);
  assert.equal(result.quotaResult.capability, "explain_selection");
  assert.equal(result.quotaResult.sessionDailyLimit, 3);
  assert.equal(result.quotaResult.sessionDailyRemaining, 2);
});

test("ensureProfileOrAnonymousQuota 试用打开 + 匿名 + session 配额耗尽:抛 AnonQuotaExceededSessionError", async () => {
  enableTrial();
  for (let i = 0; i < 3; i += 1) {
    await ensureProfileOrAnonymousQuota(
      "explain_selection",
      buildRequest(),
      async () => {
        throw new AuthError();
      },
      { sessionStore: fakeSessionStoreDeps(), quota: fakeQuotaDeps },
    );
  }

  await assert.rejects(
    () =>
      ensureProfileOrAnonymousQuota(
        "explain_selection",
        buildRequest(),
        async () => {
          throw new AuthError();
        },
        { sessionStore: fakeSessionStoreDeps(), quota: fakeQuotaDeps },
      ),
    AnonQuotaExceededSessionError,
  );
});

test("ensureProfileOrAnonymousQuota 试用打开 + 紧急关闭:抛 HighCostCapabilityDisabledError", async () => {
  enableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrAnonymousQuota(
        "explain_selection",
        buildRequest(),
        async () => {
          throw new AuthError();
        },
        {
          sessionStore: fakeSessionStoreDeps(),
          quota: { listDisabledHighCostCapabilities: async () => ["explain_selection"] },
        },
      ),
    HighCostCapabilityDisabledError,
  );
});

test("ensureProfileOrAnonymousQuota 搜索引擎爬虫不能触发付费 AI,透传原 AuthError", async () => {
  enableTrial();
  await assert.rejects(
    () =>
      ensureProfileOrAnonymousQuota(
        "explain_selection",
        buildRequest({ "user-agent": "Googlebot/2.1" }),
        async () => {
          throw new AuthError();
        },
        { sessionStore: fakeSessionStoreDeps(), quota: fakeQuotaDeps },
      ),
    AuthError,
  );
});

test("isAnonymousAccessError 识别 5 个匿名受控错误码", () => {
  assert.equal(isAnonymousAccessError(new AnonFeatureDisabledError("explain_selection")), true);
  assert.equal(isAnonymousAccessError(new AnonIpRateLimitedError()), true);
  assert.equal(isAnonymousAccessError(new AnonQuotaExceededSessionError("explain_selection")), true);
  assert.equal(isAnonymousAccessError(new AuthError()), false);
  assert.equal(isAnonymousAccessError(new Error("plain")), false);
});
