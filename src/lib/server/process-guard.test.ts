import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./process-guard";

const { isKnownMsEdgeTtsWebSocketRace } = __testables;

const buildError = (message: string, stack: string) => {
  const error = new Error(message);
  error.stack = stack;
  return error;
};

test("matches msedge-tts websocket race by message + stack", () => {
  const error = buildError(
    "Cannot read properties of undefined (reading 'audio')",
    "TypeError: Cannot read properties of undefined (reading 'audio')\n" +
      "    at WebSocket.onmessage (/app/node_modules/msedge-tts/dist/MsEdgeTTS.js:142:42)",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), true);
});

test("matches when stack mentions MsEdgeTTS class name", () => {
  const error = buildError(
    'Cannot read properties of undefined (reading "audio")',
    "TypeError: ...\n    at Object.<anonymous> (/x/MsEdgeTTS.js:209:5)",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), true);
});

test("does not match similar-looking errors from our own code", () => {
  const error = buildError(
    "Cannot read properties of undefined (reading 'audio')",
    "TypeError: ...\n    at /app/src/features/lesson/audio/use-learning-audio-controller.ts:10:5",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), false);
});

test("does not match unrelated TypeError from msedge-tts", () => {
  const error = buildError(
    "Cannot read properties of undefined (reading 'metadata')",
    "    at /app/node_modules/msedge-tts/dist/MsEdgeTTS.js:153:5",
  );
  assert.equal(isKnownMsEdgeTtsWebSocketRace(error), false);
});

test("does not match non-Error rejection reasons", () => {
  assert.equal(isKnownMsEdgeTtsWebSocketRace("audio"), false);
  assert.equal(isKnownMsEdgeTtsWebSocketRace(null), false);
  assert.equal(isKnownMsEdgeTtsWebSocketRace(undefined), false);
});
