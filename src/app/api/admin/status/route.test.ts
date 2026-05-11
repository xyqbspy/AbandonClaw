import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenError } from "@/lib/server/errors";
import { handleAdminStatusGet } from "./route";

test("admin status handler 会拒绝非管理员请求", async () => {
  const response = await handleAdminStatusGet({
    requireAdmin: async () => {
      throw new ForbiddenError();
    },
    getAdminOverviewStats: async () => ({
      totalScenes: 0,
      importedScenes: 0,
      totalVariants: 0,
      totalCacheRows: 0,
      latestCacheCreatedAt: null,
      totalUsersWithProgress: 0,
      scenesInProgressCount: 0,
      scenesCompletedCount: 0,
      latestLearningActivityAt: null,
    }),
    getTodayHighCostUsageSummary: async () => ({
      date: "2026-05-09",
      items: [],
    }),
    getRateLimitBackendStatus: () => ({
      kind: "memory" as const,
      upstashConfigured: false,
    }),
  });

  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "Forbidden");
  assert.equal(body.code, "AUTH_FORBIDDEN");
  assert.equal(typeof body.requestId, "string");
});

test("admin status handler 会返回管理员状态摘要", async () => {
  const response = await handleAdminStatusGet({
    requireAdmin: async () => ({ email: "admin@example.com" } as never),
    getAdminOverviewStats: async () => ({
      totalScenes: 12,
      importedScenes: 3,
      totalVariants: 8,
      totalCacheRows: 20,
      latestCacheCreatedAt: "2026-05-09T00:00:00.000Z",
      totalUsersWithProgress: 5,
      scenesInProgressCount: 2,
      scenesCompletedCount: 7,
      latestLearningActivityAt: "2026-05-09T01:00:00.000Z",
    }),
    getTodayHighCostUsageSummary: async () => ({
      date: "2026-05-09",
      items: [
        {
          capability: "practice_generate",
          reservedCount: 2,
          successCount: 1,
          failedCount: 1,
          limitCount: 10,
        },
      ],
    }),
    getRateLimitBackendStatus: () => ({
      kind: "upstash" as const,
      upstashConfigured: true,
    }),
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.adminEmail, "admin@example.com");
  assert.equal(body.rateLimitBackend.kind, "upstash");
  assert.equal(body.todayHighCostUsage.items[0].capability, "practice_generate");
  assert.equal(body.totalScenes, 12);
});
