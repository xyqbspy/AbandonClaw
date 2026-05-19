import assert from "node:assert/strict";
import test from "node:test";
import { buildHighCostUsageSnapshotLines } from "./high-cost-usage-snapshot-lib";

test("buildHighCostUsageSnapshotLines 输出稳定 header / detail / json", () => {
  const lines = buildHighCostUsageSnapshotLines({
    date: "2026-05-19",
    items: [
      {
        capability: "practice_generate",
        reservedCount: 3,
        successCount: 2,
        failedCount: 1,
        limitCount: 20,
      },
      {
        capability: "tts_generate",
        reservedCount: 0,
        successCount: 0,
        failedCount: 0,
        limitCount: 80,
      },
    ],
  });

  assert.deepEqual(lines, [
    "[usage:snapshot] date=2026-05-19 reserved=3 success=2 failed=1 nonZero=1",
    "- practice_generate reserved=3 success=2 failed=1 limit=20",
    "- tts_generate reserved=0 success=0 failed=0 limit=80",
    '[usage:snapshot:json] {"date":"2026-05-19","totals":{"reserved":3,"success":2,"failed":1},"nonZeroCapabilityCount":1,"items":[{"capability":"practice_generate","reservedCount":3,"successCount":2,"failedCount":1,"limitCount":20},{"capability":"tts_generate","reservedCount":0,"successCount":0,"failedCount":0,"limitCount":80}]}',
  ]);
});
