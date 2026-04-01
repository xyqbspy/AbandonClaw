import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFocusDetailConfirmState,
  buildFocusDetailContentLabels,
} from "./focus-detail-sheet-view-model";

const labels = {
  title: "detail",
  backToCurrent: "back",
  findRelations: "find",
  prev: "prev",
  next: "next",
  detailMoreActions: "more",
  detailDeleteExpression: "delete",
  detailOpenAsMain: "set main",
  moveIntoCluster: "move",
  detachClusterMember: "detach",
  addThisExpression: "add",
  addingThisExpression: "adding",
  addedThisExpression: "added",
  confirmCancel: "cancel",
  confirmContinue: "continue",
  detailOpenAsMainConfirmTitle: "set main title",
  detailOpenAsMainConfirmDesc: "set main desc",
  detachClusterMemberConfirmTitle: "detach title",
  detachClusterMemberConfirmDesc: "detach desc",
  detailDeleteExpressionConfirmTitle: "delete title",
  detailDeleteExpressionConfirmDesc: "delete desc",
  detailCandidateBadge: "candidate",
  noTranslation: "no translation",
  detailLoading: "loading",
  detailTabInfo: "info",
  detailTabSavedSimilar: "similar",
  detailTabContrast: "contrast",
  commonUsage: "usage",
  typicalScenarioLabel: "scenario",
  semanticFocusLabel: "focus",
  reviewStage: "review",
  usageHintFallback: "usage fallback",
  typicalScenarioPending: "scenario pending",
  semanticFocusPending: "focus pending",
  sourceSentence: "source",
  noSourceSentence: "no source",
  detailSimilarHint: "similar hint",
  focusEmptySimilar: "empty similar",
  detailContrastHint: "contrast hint",
  noContrastExpressions: "empty contrast",
  speakSentence: "speak",
};

test("buildFocusDetailContentLabels 会生成 content 所需文案", () => {
  const result = buildFocusDetailContentLabels(labels, "review fallback");

  assert.deepEqual(result, {
    speakSentence: "speak",
    candidateBadge: "candidate",
    noTranslation: "no translation",
    loading: "loading",
    enriching: "补全当前 chunk...",
    tabInfo: "info",
    tabSimilar: "similar",
    tabContrast: "contrast",
    commonUsage: "usage",
    typicalScenario: "scenario",
    semanticFocus: "focus",
    reviewStage: "review",
    usageHintFallback: "usage fallback",
    typicalScenarioPending: "scenario pending",
    semanticFocusPending: "focus pending",
    reviewHintFallback: "review fallback",
    sourceSentence: "source",
    noSourceSentence: "no source",
    similarHint: "similar hint",
    emptySimilar: "empty similar",
    contrastHint: "contrast hint",
    emptyContrast: "empty contrast",
    addThisExpression: "add",
    addingThisExpression: "adding",
    addedThisExpression: "added",
  });
});

test("buildFocusDetailConfirmState 会根据 action 切换确认弹层文案", () => {
  const detail = {
    savedItem: {
      text: "burn yourself out",
      translation: "透支自己",
    },
  };

  assert.deepEqual(buildFocusDetailConfirmState(labels, "set-cluster-main", detail), {
    open: true,
    title: "set main title",
    description: "set main desc",
    text: "burn yourself out",
    translation: "透支自己",
  });

  assert.deepEqual(buildFocusDetailConfirmState(labels, "set-standalone-main", detail), {
    open: true,
    title: "detach title",
    description: "detach desc",
    text: "burn yourself out",
    translation: "透支自己",
  });

  assert.deepEqual(buildFocusDetailConfirmState(labels, "delete-expression", detail), {
    open: true,
    title: "delete title",
    description: "delete desc",
    text: "burn yourself out",
    translation: "透支自己",
  });
});

test("buildFocusDetailConfirmState 在缺少 saved item 时会关闭确认弹层", () => {
  assert.deepEqual(buildFocusDetailConfirmState(labels, null, null), {
    open: false,
    title: "delete title",
    description: "delete desc",
    text: "",
    translation: null,
  });
});
