import assert from "node:assert/strict";
import test from "node:test";
import { resolveStudyTimeDeltaGuard } from "./service";

const timestamp = "2026-05-09T10:00:00.000Z";

test("resolveStudyTimeDeltaGuard 接受正常 delta 并刷新有效写入时间", () => {
  assert.deepEqual(
    resolveStudyTimeDeltaGuard({
      currentLastStudySecondsAt: null,
      reportedDelta: 30,
      timestamp,
    }),
    {
      studyDelta: 30,
      lastStudySecondsAt: timestamp,
      reason: null,
    },
  );
});

test("resolveStudyTimeDeltaGuard 拒绝单次超过 60 秒的 delta", () => {
  assert.deepEqual(
    resolveStudyTimeDeltaGuard({
      currentLastStudySecondsAt: "2026-05-09T09:59:00.000Z",
      reportedDelta: 61,
      timestamp,
    }),
    {
      studyDelta: 0,
      lastStudySecondsAt: "2026-05-09T09:59:00.000Z",
      reason: "delta_too_large",
    },
  );
});

test("resolveStudyTimeDeltaGuard 拒绝 10 秒内过频上报", () => {
  assert.deepEqual(
    resolveStudyTimeDeltaGuard({
      currentLastStudySecondsAt: "2026-05-09T09:59:55.000Z",
      reportedDelta: 5,
      timestamp,
    }),
    {
      studyDelta: 0,
      lastStudySecondsAt: "2026-05-09T09:59:55.000Z",
      reason: "too_frequent",
    },
  );
});
