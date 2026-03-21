import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMergedClusterMainUserPhraseId,
  resolveMoveExpressionClusterAction,
  resolveRemainingClusterMainUserPhraseId,
  resolveTargetClusterMainUserPhraseId,
} from "./logic";

test("resolveMergedClusterMainUserPhraseId 优先级：请求值 > target main > source main > 第一个成员", () => {
  assert.equal(
    resolveMergedClusterMainUserPhraseId({
      mergedMemberIds: ["a", "b", "c"],
      requestedMainUserPhraseId: "c",
      targetClusterMainUserPhraseId: "a",
      sourceClusterMainUserPhraseId: "b",
    }),
    "c",
  );

  assert.equal(
    resolveMergedClusterMainUserPhraseId({
      mergedMemberIds: ["a", "b", "c"],
      requestedMainUserPhraseId: "x",
      targetClusterMainUserPhraseId: "a",
      sourceClusterMainUserPhraseId: "b",
    }),
    "a",
  );

  assert.equal(
    resolveMergedClusterMainUserPhraseId({
      mergedMemberIds: ["a", "b", "c"],
      requestedMainUserPhraseId: "x",
      targetClusterMainUserPhraseId: "x",
      sourceClusterMainUserPhraseId: "b",
    }),
    "b",
  );
});

test("resolveRemainingClusterMainUserPhraseId 优先级：请求值 > 当前 main > 第一个剩余成员", () => {
  assert.equal(
    resolveRemainingClusterMainUserPhraseId({
      remainingMemberIds: ["a", "b"],
      requestedMainUserPhraseId: "b",
      currentMainUserPhraseId: "a",
    }),
    "b",
  );

  assert.equal(
    resolveRemainingClusterMainUserPhraseId({
      remainingMemberIds: ["a", "b"],
      requestedMainUserPhraseId: "x",
      currentMainUserPhraseId: "a",
    }),
    "a",
  );

  assert.equal(
    resolveRemainingClusterMainUserPhraseId({
      remainingMemberIds: ["a", "b"],
      requestedMainUserPhraseId: "x",
      currentMainUserPhraseId: "x",
    }),
    "a",
  );
});

test("resolveTargetClusterMainUserPhraseId 优先级：请求值 > 当前 target main > 第一个 target 成员 > 移入表达", () => {
  assert.equal(
    resolveTargetClusterMainUserPhraseId({
      targetMemberIds: ["a", "b"],
      requestedMainUserPhraseId: "b",
      targetClusterMainUserPhraseId: "a",
      movedUserPhraseId: "moved-1",
    }),
    "b",
  );

  assert.equal(
    resolveTargetClusterMainUserPhraseId({
      targetMemberIds: ["a", "b"],
      requestedMainUserPhraseId: "x",
      targetClusterMainUserPhraseId: "a",
      movedUserPhraseId: "moved-1",
    }),
    "a",
  );

  assert.equal(
    resolveTargetClusterMainUserPhraseId({
      targetMemberIds: [],
      requestedMainUserPhraseId: "x",
      targetClusterMainUserPhraseId: "x",
      movedUserPhraseId: "moved-1",
    }),
    "moved-1",
  );
});

test("resolveMoveExpressionClusterAction 能区分整簇并入、子表达移动和独立表达加入", () => {
  assert.equal(
    resolveMoveExpressionClusterAction({
      sourceClusterId: "cluster-1",
      sourceRole: "main",
    }),
    "merged_cluster",
  );
  assert.equal(
    resolveMoveExpressionClusterAction({
      sourceClusterId: "cluster-1",
      sourceRole: "variant",
    }),
    "moved_member",
  );
  assert.equal(
    resolveMoveExpressionClusterAction({
      sourceClusterId: null,
      sourceRole: null,
    }),
    "attached_member",
  );
});
