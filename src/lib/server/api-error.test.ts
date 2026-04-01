import assert from "node:assert/strict";
import test from "node:test";
import { toApiErrorResponse } from "./api-error";

test("toApiErrorResponse masks unknown server errors", async () => {
  const response = toApiErrorResponse(new Error("database exploded"), "Fallback failure.");

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Fallback failure.",
    code: "INTERNAL_ERROR",
    details: null,
  });
});
