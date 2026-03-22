import test from "node:test";
import assert from "node:assert/strict";
import { ValidationError } from "@/lib/server/errors";
import {
  parseJsonBody,
  parseRequiredStringArray,
} from "@/lib/server/validation";

test("parseJsonBody returns parsed object body", async () => {
  const request = new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify({ userPhraseIds: ["a", "b"] }),
    headers: {
      "content-type": "application/json",
    },
  });

  const payload = await parseJsonBody<{ userPhraseIds: string[] }>(request);
  assert.deepEqual(payload, { userPhraseIds: ["a", "b"] });
});

test("parseJsonBody rejects non-object json body", async () => {
  const request = new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(["a"]),
    headers: {
      "content-type": "application/json",
    },
  });

  await assert.rejects(
    () => parseJsonBody(request),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === "Request body must be a JSON object.",
  );
});

test("parseRequiredStringArray trims, dedupes and limits values", () => {
  const values = parseRequiredStringArray([" a ", "b", "a", "", null], "userPhraseIds", {
    maxItems: 2,
  });

  assert.deepEqual(values, ["a", "b"]);
});

test("parseRequiredStringArray rejects empty arrays after normalization", () => {
  assert.throws(
    () => parseRequiredStringArray([" ", null], "userPhraseIds"),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === "userPhraseIds is required.",
  );
});
