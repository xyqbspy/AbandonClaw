import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./process-guard";

const { isKnownMsEdgeTtsWebSocketRace } = __testables;

const buildTypeError = (message: string, stack?: string) => {
  const error = new TypeError(message);
  if (stack !== undefined) error.stack = stack;
  return error;
};

test("matches with full msedge-tts stack (dev mode)", () => {
  const error = buildTypeError(
    "Cannot read properties of undefined (reading 'audio')",
    "TypeError: Cannot read properties of undefined (reading 'audio')\n" +
      "    at WebSocket.onmessage (/app/node_modules/msedge-tts/dist/MsEdgeTTS.js:142:42)",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), true);
});

test("matches with Next.js production ignore-listed stack", () => {
  const error = buildTypeError(
    "Cannot read properties of undefined (reading 'audio')",
    "TypeError: Cannot read properties of undefined (reading 'audio')\n" +
      "    at ignore-listed frames",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), true);
});

test("matches double-quoted variant", () => {
  const error = buildTypeError(
    'Cannot read properties of undefined (reading "audio")',
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), true);
});

test("does not match different property name TypeError", () => {
  const error = buildTypeError(
    "Cannot read properties of undefined (reading 'metadata')",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), false);
});

test("does not match similar message on non-TypeError", () => {
  const error = new Error(
    "Cannot read properties of undefined (reading 'audio')",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), false);
});

test("does not match non-Error rejection reasons", () => {
  assert.equal(isKnownMsEdgeTtsWebSocketRace("audio"), false);
  assert.equal(isKnownMsEdgeTtsWebSocketRace(null), false);
  assert.equal(isKnownMsEdgeTtsWebSocketRace(undefined), false);
});
