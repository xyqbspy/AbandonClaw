import assert from "node:assert/strict";
import test from "node:test";
import { toApiErrorResponse } from "./api-error";

test("toApiErrorResponse masks unknown server errors", async () => {
  const response = toApiErrorResponse(new Error("database exploded"), "Fallback failure.");
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error, "Fallback failure.");
  assert.equal(body.code, "INTERNAL_ERROR");
  assert.equal(body.details, null);
  assert.equal(typeof body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), body.requestId);
});
