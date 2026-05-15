import assert from "node:assert/strict";
import test from "node:test";
import {
  clientErrorMessages,
  createClientApiError,
  normalizeClientError,
} from "./api-error";
import { getAuthRedirectTargetFromSearchParams } from "@/lib/shared/auth-redirect";

test("client api error 会把邀请码错误映射为中文提示", async () => {
  const response = new Response(
    JSON.stringify({ error: "Invite code is invalid or expired.", requestId: "req-1" }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );

  const error = await createClientApiError(response, {
    context: "signup",
    fallbackMessage: "注册失败，请稍后再试",
  });

  assert.equal(error.message, clientErrorMessages.invalidInvite);
  assert.equal(error.requestId, "req-1");
});

test("client api error 会把 429 映射为中文提示", async () => {
  const response = new Response(
    JSON.stringify({ error: "Too many requests.", requestId: "req-2" }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );

  const error = await createClientApiError(response, {
    context: "send-email-code",
    fallbackMessage: "验证码发送失败，请稍后再试",
  });

  assert.equal(error.message, clientErrorMessages.rateLimited);
});

test("client api error 会把 failed fetch 归一化为网络错误", () => {
  const error = normalizeClientError(new Error("Failed to fetch"), {
    context: "review-submit",
    fallbackMessage: "提交复习结果失败，请稍后再试",
  });

  assert.equal(error.message, clientErrorMessages.network);
});

test("client api error 会读取 redirectTo / redirect / next", () => {
  assert.equal(
    getAuthRedirectTargetFromSearchParams(new URLSearchParams("redirectTo=%2Freview")),
    "/review",
  );
  assert.equal(
    getAuthRedirectTargetFromSearchParams(new URLSearchParams("redirect=%2Ftoday")),
    "/today",
  );
  assert.equal(
    getAuthRedirectTargetFromSearchParams(new URLSearchParams("next=%2Fscene%2Fdaily-greeting")),
    "/scene/daily-greeting",
  );
});
