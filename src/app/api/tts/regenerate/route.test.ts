import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, ForbiddenError } from "@/lib/server/errors";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { handleTtsRegeneratePost } from "./route";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/tts/regenerate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("tts regenerate handler 会拒绝未登录请求", async () => {
  clearRateLimitStore();
  const response = await handleTtsRegeneratePost(createJsonRequest({ items: [{ text: "hello" }] }), {
    requireAdmin: async () => {
      throw new AuthError();
    },
    regenerateChunkTtsAudioBatch: async () => ({ regeneratedCount: 0 }),
  });

  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_UNAUTHORIZED");
  assert.equal(typeof body.requestId, "string");
});

test("tts regenerate handler 会拒绝非管理员请求", async () => {
  clearRateLimitStore();
  const response = await handleTtsRegeneratePost(createJsonRequest({ items: [{ text: "hello" }] }), {
    requireAdmin: async () => {
      throw new ForbiddenError();
    },
    regenerateChunkTtsAudioBatch: async () => ({ regeneratedCount: 0 }),
  });

  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "Only admins can regenerate tts audio.");
  assert.equal(body.code, "AUTH_FORBIDDEN");
  assert.equal(typeof body.requestId, "string");
});

test("tts regenerate handler 会拒绝空批量", async () => {
  clearRateLimitStore();
  const response = await handleTtsRegeneratePost(createJsonRequest({ items: [] }), {
    requireAdmin: async () => ({ id: "admin-1" } as never),
    regenerateChunkTtsAudioBatch: async () => ({ regeneratedCount: 0 }),
  });

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("tts regenerate handler 会拒绝超限批量", async () => {
  clearRateLimitStore();
  const response = await handleTtsRegeneratePost(
    createJsonRequest({
      items: Array.from({ length: 13 }, (_, index) => ({ text: `line-${index + 1}` })),
    }),
    {
      requireAdmin: async () => ({ id: "admin-1" } as never),
      regenerateChunkTtsAudioBatch: async () => ({ regeneratedCount: 0 }),
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("tts regenerate handler 会透传规范化后的批量请求", async () => {
  clearRateLimitStore();
  let receivedItems: unknown = null;
  const response = await handleTtsRegeneratePost(
    createJsonRequest({
      items: [{ text: "  hello world  ", chunkKey: "  key-1  " }],
    }),
    {
      requireAdmin: async () => ({ id: "admin-1" } as never),
      regenerateChunkTtsAudioBatch: async (items) => {
        receivedItems = items;
        return { regeneratedCount: items.length };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { regeneratedCount: 1 });
  assert.deepEqual(receivedItems, [{ text: "hello world", chunkKey: "key-1" }]);
});
