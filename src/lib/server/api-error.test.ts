import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, ForbiddenError, ValidationError } from "./errors";
import { toApiErrorResponse } from "./api-error";

test("toApiErrorResponse masks unknown server errors", async () => {
  const captured: Array<{ error: unknown; requestId: string }> = [];
  const response = toApiErrorResponse(new Error("database exploded"), "Fallback failure.", {
    captureUnknownServerError: (error, requestId) => {
      captured.push({ error, requestId });
    },
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error, "Fallback failure.");
  assert.equal(body.code, "INTERNAL_ERROR");
  assert.equal(body.details, null);
  assert.equal(typeof body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), body.requestId);
  assert.equal(captured.length, 1);
  assert.equal((captured[0].error as Error).message, "database exploded");
  assert.equal(captured[0].requestId, body.requestId);
});

test("toApiErrorResponse 不上报 AppError 子类", async () => {
  const captured: unknown[] = [];
  const captureUnknownServerError = (error: unknown) => captured.push(error);

  const validationResponse = toApiErrorResponse(
    new ValidationError("limit must be positive."),
    "fallback",
    { captureUnknownServerError },
  );
  assert.equal(validationResponse.status, 400);
  assert.equal(captured.length, 0);

  const authResponse = toApiErrorResponse(new AuthError(), "fallback", {
    captureUnknownServerError,
  });
  assert.equal(authResponse.status, 401);
  assert.equal(captured.length, 0);

  const forbiddenResponse = toApiErrorResponse(new ForbiddenError("nope"), "fallback", {
    captureUnknownServerError,
  });
  assert.equal(forbiddenResponse.status, 403);
  assert.equal(captured.length, 0);
});

test("toApiErrorResponse 不上报 legacy Unauthorized/Forbidden 字符串错误", async () => {
  const captured: unknown[] = [];
  const captureUnknownServerError = (error: unknown) => captured.push(error);

  const unauthorizedResponse = toApiErrorResponse(new Error("Unauthorized"), "fallback", {
    captureUnknownServerError,
  });
  assert.equal(unauthorizedResponse.status, 401);

  const forbiddenResponse = toApiErrorResponse(new Error("Forbidden"), "fallback", {
    captureUnknownServerError,
  });
  assert.equal(forbiddenResponse.status, 403);

  assert.equal(captured.length, 0);
});

test("toApiErrorResponse 上报非 Error 类型未知异常", async () => {
  const captured: unknown[] = [];
  const captureUnknownServerError = (error: unknown) => captured.push(error);

  const response = toApiErrorResponse("string thrown", "fallback", {
    captureUnknownServerError,
  });
  assert.equal(response.status, 500);
  assert.equal(captured.length, 1);
  assert.equal(captured[0], "string thrown");
});
