import assert from "node:assert/strict";
import test from "node:test";

import {
  getReviewSchedulingUrgencyRank,
  resolveNextReviewAt,
  resolveReviewSchedulingFocus,
} from "./service";

test("resolveReviewSchedulingFocus 按主动输出风险确定优先级", () => {
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "recognized",
      outputConfidence: "low",
      fullOutputStatus: "completed",
    }),
    "low_output_confidence",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "not_started",
    }),
    "missing_full_output",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "unknown",
      outputConfidence: "high",
      fullOutputStatus: "completed",
    }),
    "recognition_only",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: null,
      outputConfidence: null,
      fullOutputStatus: null,
    }),
    null,
  );
});

test("getReviewSchedulingUrgencyRank 会把高风险条目排在前面", () => {
  const focuses = [
    "low_output_confidence",
    "missing_full_output",
    "recognition_only",
    null,
  ] as const;
  assert.deepEqual(
    focuses.map((focus) => getReviewSchedulingUrgencyRank(focus)),
    [0, 1, 2, 3],
  );
});

test("resolveNextReviewAt 在 good 结果下会根据正式信号细调间隔", () => {
  const completedHigh = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "completed",
    reachesMastered: false,
  });
  const lowConfidence = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "low",
    fullOutputStatus: "completed",
    reachesMastered: false,
  });
  const missingFull = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "not_started",
    reachesMastered: false,
  });

  assert.ok(completedHigh);
  assert.ok(lowConfidence);
  assert.ok(missingFull);
  assert.ok(new Date(completedHigh).getTime() > new Date(missingFull).getTime());
  assert.ok(new Date(missingFull).getTime() > new Date(lowConfidence).getTime());
});

test("resolveNextReviewAt 在 mastered 时不会再安排下次复习", () => {
  assert.equal(
    resolveNextReviewAt({
      reviewResult: "good",
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      reachesMastered: true,
    }),
    null,
  );
});

test("resolveNextReviewAt 会在 again 和 hard 下收紧节奏", () => {
  const again = resolveNextReviewAt({
    reviewResult: "again",
    recognitionState: "unknown",
    outputConfidence: "low",
    fullOutputStatus: "not_started",
    reachesMastered: false,
  });
  const hard = resolveNextReviewAt({
    reviewResult: "hard",
    recognitionState: "recognized",
    outputConfidence: "low",
    fullOutputStatus: "completed",
    reachesMastered: false,
  });

  assert.ok(again);
  assert.ok(hard);
  assert.ok(new Date(again).getTime() < new Date(hard).getTime());
});
