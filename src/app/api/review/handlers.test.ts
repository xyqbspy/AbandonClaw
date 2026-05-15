import assert from "node:assert/strict";
import test from "node:test";
import { clearIdempotencyStore } from "@/lib/server/idempotency";
import { handleReviewDueGet, handleReviewSubmitPost } from "./handlers";

const createJsonRequest = (
  url: string,
  body?: unknown,
  method = "POST",
  headers?: Record<string, string>,
) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test.beforeEach(() => {
  clearIdempotencyStore();
});

test("review due handler 会规范 limit 并透传给两类 service", async () => {
  let dueArgs: Record<string, unknown> | null = null;
  let sceneArgs: Record<string, unknown> | null = null;
  const response = await handleReviewDueGet(
    createJsonRequest("http://localhost/api/review/due?limit=999", undefined, "GET"),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      getDueReviewItems: async (userId, options) => {
        dueArgs = { userId, ...options };
        return [{ id: "phrase-1" }] as never;
      },
      getDueScenePracticeReviewItems: async (userId, options) => {
        sceneArgs = { userId, ...options };
        return [{ id: "scene-1" }] as never;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    rows: [{ id: "phrase-1" }],
    total: 1,
    scenePracticeRows: [{ id: "scene-1" }],
  });
  assert.deepEqual(dueArgs, { userId: "user-1", limit: 100 });
  assert.deepEqual(sceneArgs, { userId: "user-1", limit: 6 });
});

test("review due handler 在 limit 非法时返回 400", async () => {
  const response = await handleReviewDueGet(
    createJsonRequest("http://localhost/api/review/due?limit=0", undefined, "GET"),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      getDueReviewItems: async () => [] as never,
      getDueScenePracticeReviewItems: async () => [] as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("review submit handler 对相同幂等 key 只执行一次提交", async () => {
  let submitCount = 0;
  let summaryCount = 0;
  const request = createJsonRequest(
    "http://localhost/api/review/submit",
    {
      userPhraseId: "phrase-1",
      reviewResult: "good",
    },
    "POST",
    { "x-idempotency-key": "same-review-key" },
  );

  const dependencies = {
    requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
    submitPhraseReview: async () => {
      submitCount += 1;
      return { id: "phrase-1", reviewResult: "good" } as never;
    },
    getReviewSummary: async () => {
      summaryCount += 1;
      return { dueCount: 2 } as never;
    },
  };

  const first = await handleReviewSubmitPost(request.clone(), dependencies);
  const second = await handleReviewSubmitPost(request.clone(), dependencies);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(submitCount, 1);
  assert.equal(summaryCount, 1);
  assert.deepEqual(await first.json(), await second.json());
});

test("review submit handler 无显式幂等 key 时会按用户与 payload 去重", async () => {
  let submitCount = 0;
  let summaryCount = 0;
  const dependencies = {
    requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
    submitPhraseReview: async () => {
      submitCount += 1;
      return { id: "phrase-1", reviewResult: "good" } as never;
    },
    getReviewSummary: async () => {
      summaryCount += 1;
      return { dueCount: 2 } as never;
    },
  };

  const first = await handleReviewSubmitPost(
    createJsonRequest("http://localhost/api/review/submit", {
      userPhraseId: "phrase-1",
      reviewResult: "good",
    }),
    dependencies,
  );
  const second = await handleReviewSubmitPost(
    createJsonRequest("http://localhost/api/review/submit", {
      userPhraseId: " phrase-1 ",
      reviewResult: "good",
    }),
    dependencies,
  );

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(submitCount, 1);
  assert.equal(summaryCount, 1);
  assert.deepEqual(await first.json(), await second.json());
});

test("review submit handler 会裁剪 payload 并返回 item 与 summary", async () => {
  let submitArgs: Record<string, unknown> | null = null;
  let summaryUserId: string | null = null;
  const response = await handleReviewSubmitPost(
    createJsonRequest("http://localhost/api/review/submit", {
      userPhraseId: " phrase-1 ",
      reviewResult: "good",
      source: " lesson ",
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      variantRewritePromptId: "self",
      fullOutputText: " We should call it a day now. ",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      submitPhraseReview: async (userId, payload) => {
        submitArgs = { userId, ...payload };
        return { id: "phrase-1", reviewResult: "good" } as never;
      },
      getReviewSummary: async (userId) => {
        summaryUserId = userId;
        return { dueCount: 3 } as never;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    item: { id: "phrase-1", reviewResult: "good" },
    summary: { dueCount: 3 },
  });
  assert.deepEqual(submitArgs, {
    userId: "user-1",
    userPhraseId: "phrase-1",
    reviewResult: "good",
    source: "lesson",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "completed",
    variantRewriteStatus: "completed",
    variantRewritePromptId: "self",
    fullOutputCoverage: undefined,
    fullOutputText: "We should call it a day now.",
  });
  assert.equal(summaryUserId, "user-1");
});

test("review submit handler 在新增正式信号非法时返回 400", async () => {
  const response = await handleReviewSubmitPost(
    createJsonRequest("http://localhost/api/review/submit", {
      userPhraseId: "phrase-1",
      reviewResult: "good",
      variantRewriteStatus: "done",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      submitPhraseReview: async () => ({}) as never,
      getReviewSummary: async () => ({}) as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});

test("review submit handler 在 reviewResult 非法时返回 400 与 requestId", async () => {
  const response = await handleReviewSubmitPost(
    createJsonRequest("http://localhost/api/review/submit", {
      userPhraseId: "phrase-1",
      reviewResult: "bad",
    }),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
      submitPhraseReview: async () => ({}) as never,
      getReviewSummary: async () => ({}) as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(typeof body.requestId, "string");
});
