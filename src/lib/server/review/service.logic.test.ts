import assert from "node:assert/strict";
import test from "node:test";

import {
  getReviewSchedulingUrgencyRank,
  resolveFullOutputCoverage,
  resolveNextReviewAt,
  resolveReviewSchedulingFocus,
} from "./service";

test("resolveReviewSchedulingFocus 按主动输出风险确定优先级", () => {
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "recognized",
      outputConfidence: "low",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      fullOutputCoverage: "contains_target",
    }),
    "low_output_confidence",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      fullOutputCoverage: "missing_target",
    }),
    "missing_target_coverage",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "not_started",
      variantRewriteStatus: "completed",
      fullOutputCoverage: "not_started",
    }),
    "missing_full_output",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "not_started",
      fullOutputCoverage: "contains_target",
    }),
    "missing_variant_rewrite",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: "unknown",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      fullOutputCoverage: "contains_target",
    }),
    "recognition_only",
  );
  assert.equal(
    resolveReviewSchedulingFocus({
      recognitionState: null,
      outputConfidence: null,
      fullOutputStatus: null,
      variantRewriteStatus: null,
      fullOutputCoverage: null,
    }),
    null,
  );
});

test("getReviewSchedulingUrgencyRank 会把高风险条目排在前面", () => {
  const focuses = [
    "low_output_confidence",
    "missing_target_coverage",
    "missing_full_output",
    "missing_variant_rewrite",
    "recognition_only",
    null,
  ] as const;
  assert.deepEqual(
    focuses.map((focus) => getReviewSchedulingUrgencyRank(focus)),
    [0, 1, 2, 3, 4, 5],
  );
});

test("resolveFullOutputCoverage 只做确定性目标表达覆盖判断", () => {
  assert.equal(
    resolveFullOutputCoverage({
      targetText: "Call it a day",
      fullOutputText: "We should call it a day now.",
      fullOutputStatus: "completed",
    }),
    "contains_target",
  );
  assert.equal(
    resolveFullOutputCoverage({
      targetText: "call it a day",
      fullOutputText: "We should finish here.",
      fullOutputStatus: "completed",
    }),
    "missing_target",
  );
  assert.equal(
    resolveFullOutputCoverage({
      targetText: "call it a day",
      fullOutputText: "",
      fullOutputStatus: "not_started",
    }),
    "not_started",
  );
  assert.equal(
    resolveFullOutputCoverage({
      targetText: null,
      fullOutputText: "We should call it a day now.",
      fullOutputStatus: "completed",
    }),
    "not_started",
  );
});

test("resolveNextReviewAt 在 good 结果下会根据正式信号细调间隔", () => {
  const completedHigh = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "completed",
    variantRewriteStatus: "completed",
    fullOutputCoverage: "contains_target",
    reachesMastered: false,
  });
  const lowConfidence = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "low",
    fullOutputStatus: "completed",
    variantRewriteStatus: "completed",
    fullOutputCoverage: "contains_target",
    reachesMastered: false,
  });
  const missingFull = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "not_started",
    variantRewriteStatus: "completed",
    fullOutputCoverage: "not_started",
    reachesMastered: false,
  });
  const missingTarget = resolveNextReviewAt({
    reviewResult: "good",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "completed",
    variantRewriteStatus: "completed",
    fullOutputCoverage: "missing_target",
    reachesMastered: false,
  });

  assert.ok(completedHigh);
  assert.ok(lowConfidence);
  assert.ok(missingFull);
  assert.ok(missingTarget);
  assert.ok(new Date(completedHigh).getTime() > new Date(missingFull).getTime());
  assert.ok(new Date(completedHigh).getTime() > new Date(missingTarget).getTime());
  assert.ok(new Date(missingFull).getTime() > new Date(lowConfidence).getTime());
});

test("resolveNextReviewAt 在 mastered 时不会再安排下次复习", () => {
  assert.equal(
    resolveNextReviewAt({
      reviewResult: "good",
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      fullOutputCoverage: "contains_target",
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
    variantRewriteStatus: "not_started",
    fullOutputCoverage: "not_started",
    reachesMastered: false,
  });
  const hard = resolveNextReviewAt({
    reviewResult: "hard",
    recognitionState: "recognized",
    outputConfidence: "low",
    fullOutputStatus: "completed",
    variantRewriteStatus: "completed",
    fullOutputCoverage: "contains_target",
    reachesMastered: false,
  });

  assert.ok(again);
  assert.ok(hard);
  assert.ok(new Date(again).getTime() < new Date(hard).getTime());
});
