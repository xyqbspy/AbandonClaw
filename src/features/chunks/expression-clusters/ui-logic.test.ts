import assert from "node:assert/strict";
import test from "node:test";
import {
  getFocusMainExpressionRows,
  getMoveIntoGroupSelected,
  resolveFocusMainExpressionId,
  toggleMoveIntoClusterCandidateSelection,
  toggleMoveIntoClusterGroupSelection,
} from "./ui-logic";
import { MoveIntoClusterCandidate, MoveIntoClusterGroup } from "@/features/chunks/components/types";

const createRow = (overrides: Partial<{
  userPhraseId: string;
  text: string;
  expressionClusterId: string | null;
  expressionClusterMainUserPhraseId: string | null;
  sourceNote: string | null;
}> = {}) => ({
  userPhraseId: overrides.userPhraseId ?? "row-1",
  text: overrides.text ?? "example",
  expressionClusterId: overrides.expressionClusterId ?? null,
  expressionClusterMainUserPhraseId: overrides.expressionClusterMainUserPhraseId ?? null,
  sourceNote: overrides.sourceNote ?? null,
});

const createCandidate = (
  overrides: Partial<MoveIntoClusterCandidate> = {},
): MoveIntoClusterCandidate => ({
  row: {
    userPhraseId: overrides.row?.userPhraseId ?? "row-1",
    text: overrides.row?.text ?? "example",
    translation: overrides.row?.translation ?? null,
  } as MoveIntoClusterCandidate["row"],
  sourceClusterId: overrides.sourceClusterId ?? "cluster-1",
  sourceClusterMainText: overrides.sourceClusterMainText ?? "main",
  sourceClusterMemberCount: overrides.sourceClusterMemberCount ?? 2,
  isSourceMain: overrides.isSourceMain ?? false,
});

test("getFocusMainExpressionRows 只保留真实主表达，并隐藏非当前焦点的派生表达", () => {
  const rows = [
    createRow({
      userPhraseId: "main-1",
      expressionClusterId: "cluster-1",
      expressionClusterMainUserPhraseId: "main-1",
    }),
    createRow({
      userPhraseId: "child-1",
      expressionClusterId: "cluster-1",
      expressionClusterMainUserPhraseId: "main-1",
    }),
    createRow({
      userPhraseId: "derived-1",
      sourceNote: "focus-similar-ai",
    }),
    createRow({
      userPhraseId: "plain-1",
    }),
  ];

  assert.deepEqual(
    getFocusMainExpressionRows(rows, "plain-1").map((row) => row.userPhraseId),
    ["main-1", "plain-1"],
  );
  assert.deepEqual(
    getFocusMainExpressionRows(rows, "derived-1").map((row) => row.userPhraseId),
    ["main-1", "derived-1", "plain-1"],
  );
});

test("resolveFocusMainExpressionId 子表达会回到真实主表达", () => {
  const rows = [
    createRow({
      userPhraseId: "main-1",
      expressionClusterId: "cluster-1",
      expressionClusterMainUserPhraseId: "main-1",
    }),
    createRow({
      userPhraseId: "child-1",
      expressionClusterId: "cluster-1",
      expressionClusterMainUserPhraseId: "main-1",
    }),
    createRow({
      userPhraseId: "plain-1",
    }),
  ];

  assert.equal(resolveFocusMainExpressionId(rows, "child-1"), "main-1");
  assert.equal(resolveFocusMainExpressionId(rows, "plain-1"), "plain-1");
});

test("getMoveIntoGroupSelected 主表达被选中时，整组视为已全选", () => {
  const main = createCandidate({
    isSourceMain: true,
    row: { userPhraseId: "main-1", text: "figures" } as MoveIntoClusterCandidate["row"],
  });
  const child = createCandidate({
    isSourceMain: false,
    row: { userPhraseId: "child-1", text: "that figures" } as MoveIntoClusterCandidate["row"],
  });
  const group: MoveIntoClusterGroup = {
    key: "cluster-1",
    title: "figures",
    description: "",
    candidates: [main, child],
    isCluster: true,
  };

  assert.equal(getMoveIntoGroupSelected(group, { "main-1": true }), true);
  assert.equal(getMoveIntoGroupSelected(group, { "child-1": true }), false);
});

test("toggleMoveIntoClusterCandidateSelection 选中主表达时会清掉子表达单选", () => {
  const main = createCandidate({
    isSourceMain: true,
    row: { userPhraseId: "main-1", text: "figures" } as MoveIntoClusterCandidate["row"],
  });
  const child = createCandidate({
    isSourceMain: false,
    row: { userPhraseId: "child-1", text: "that figures" } as MoveIntoClusterCandidate["row"],
  });
  const group: MoveIntoClusterGroup = {
    key: "cluster-1",
    title: "figures",
    description: "",
    candidates: [main, child],
    isCluster: true,
  };

  const next = toggleMoveIntoClusterCandidateSelection({ "child-1": true }, group, main, false);
  assert.deepEqual(next, { "main-1": true });
});

test("toggleMoveIntoClusterGroupSelection 支持整组全选和取消全选", () => {
  const main = createCandidate({
    isSourceMain: true,
    row: { userPhraseId: "main-1", text: "figures" } as MoveIntoClusterCandidate["row"],
  });
  const child = createCandidate({
    isSourceMain: false,
    row: { userPhraseId: "child-1", text: "that figures" } as MoveIntoClusterCandidate["row"],
  });
  const group: MoveIntoClusterGroup = {
    key: "cluster-1",
    title: "figures",
    description: "",
    candidates: [main, child],
    isCluster: true,
  };

  const selected = toggleMoveIntoClusterGroupSelection({}, group, false);
  assert.deepEqual(selected, { "main-1": true, "child-1": true });

  const cleared = toggleMoveIntoClusterGroupSelection(selected, group, true);
  assert.deepEqual(cleared, {});
});
