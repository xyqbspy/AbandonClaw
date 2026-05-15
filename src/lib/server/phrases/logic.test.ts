import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveDeleteExpressionClusterResult,
  resolveSavedPhraseReviewState,
} from "./logic";

test("resolveDeleteExpressionClusterResult 在删除主表达后会为剩余成员补位新主表达", () => {
  assert.deepEqual(
    resolveDeleteExpressionClusterResult({
      remainingMemberIds: ["variant-1", "variant-2"],
      currentMainUserPhraseId: "main-1",
    }),
    {
      clusterDeleted: false,
      nextMainUserPhraseId: "variant-1",
    },
  );
});

test("resolveDeleteExpressionClusterResult 在当前主表达仍保留时不会误改主表达", () => {
  assert.deepEqual(
    resolveDeleteExpressionClusterResult({
      remainingMemberIds: ["main-1", "variant-1"],
      currentMainUserPhraseId: "main-1",
    }),
    {
      clusterDeleted: false,
      nextMainUserPhraseId: "main-1",
    },
  );
});

test("resolveDeleteExpressionClusterResult 在删除空簇最后一个表达时会返回删除空簇", () => {
  assert.deepEqual(
    resolveDeleteExpressionClusterResult({
      remainingMemberIds: [],
      currentMainUserPhraseId: "main-1",
    }),
    {
      clusterDeleted: true,
      nextMainUserPhraseId: null,
    },
  );
});

test("resolveSavedPhraseReviewState 会让新 expression 保存后立即进入 due review", () => {
  assert.deepEqual(
    resolveSavedPhraseReviewState({
      learningItemType: "expression",
      now: "2026-05-15T00:00:00.000Z",
    }),
    {
      reviewStatus: "saved",
      nextReviewAt: "2026-05-15T00:00:00.000Z",
    },
  );
});

test("resolveSavedPhraseReviewState 重复保存不会覆盖已有 review 进度", () => {
  assert.deepEqual(
    resolveSavedPhraseReviewState({
      learningItemType: "expression",
      existingReviewStatus: "reviewing",
      existingNextReviewAt: "2026-05-20T00:00:00.000Z",
      now: "2026-05-15T00:00:00.000Z",
    }),
    {
      reviewStatus: "reviewing",
      nextReviewAt: "2026-05-20T00:00:00.000Z",
    },
  );
});

test("resolveSavedPhraseReviewState 重复保存已掌握表达不会重置 mastery", () => {
  assert.deepEqual(
    resolveSavedPhraseReviewState({
      learningItemType: "expression",
      existingReviewStatus: "mastered",
      existingNextReviewAt: null,
      now: "2026-05-15T00:00:00.000Z",
    }),
    {
      reviewStatus: "mastered",
      nextReviewAt: null,
    },
  );
});

test("resolveSavedPhraseReviewState 重新保存 archived 表达会回到可复习状态", () => {
  assert.deepEqual(
    resolveSavedPhraseReviewState({
      learningItemType: "expression",
      existingReviewStatus: "archived",
      existingNextReviewAt: null,
      now: "2026-05-15T00:00:00.000Z",
    }),
    {
      reviewStatus: "saved",
      nextReviewAt: "2026-05-15T00:00:00.000Z",
    },
  );
});

test("resolveSavedPhraseReviewState sentence 保存不进入 expression review", () => {
  assert.deepEqual(
    resolveSavedPhraseReviewState({
      learningItemType: "sentence",
      existingReviewStatus: "saved",
      existingNextReviewAt: "2026-05-20T00:00:00.000Z",
      now: "2026-05-15T00:00:00.000Z",
    }),
    {
      reviewStatus: "archived",
      nextReviewAt: null,
    },
  );
});
