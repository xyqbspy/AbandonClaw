import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChunksFocusDetailInteractionPresentation,
  buildChunksFocusDetailSheetPresentation,
} from "./chunks-focus-detail-presenters";

test("buildChunksFocusDetailSheetPresentation 会稳定输出详情面板展示态", () => {
  const savedItem = {
    userPhraseId: "phrase-1",
    text: "Call it a day",
  } as const;

  const presentation = buildChunksFocusDetailSheetPresentation({
    focusDetail: {
      text: "call it a day",
      savedItem: savedItem as never,
    },
    focusExpression: savedItem as never,
    focusAssistData: {
      inputItem: {
        expression: "call it a day",
        translation: "收工",
      },
    } as never,
    savingFocusCandidateKeys: ["similar:wrap it up"],
    focusAssistLoading: true,
    savingQuickAddRelated: true,
    regeneratingDetailAudio: false,
    retryingEnrichmentIds: {
      "phrase-1": true,
    },
    movingIntoCluster: false,
    ensuringMoveTargetCluster: true,
    detachingClusterMember: false,
    canSetCurrentClusterMain: true,
    canMoveIntoCurrentCluster: true,
    canSetStandaloneMain: false,
    primaryActionLabel: "加入复习",
    appleButtonClassName: "apple-btn",
    focusDetailSheetState: {
      trailLength: 2,
      canShowSiblingNav: true,
      canShowFindRelations: true,
      isDetailSpeaking: true,
    },
    focusDetailViewModel: {
      activeAssistItem: {
        expression: "call it a day",
        translation: "收工",
      } as never,
      detailSpeakText: "Call it a day",
      similarRows: [{ key: "1", text: "wrap it up", kind: "library-similar", savedItem: null }],
      contrastRows: [{ key: "2", text: "keep going", kind: "contrast", savedItem: null }],
      isSavedRelatedLoading: false,
      usageHint: "用于收尾",
      typicalScenario: "准备下班",
      semanticFocus: "结束动作",
      reviewHint: "reviewing",
    },
  });

  assert.deepEqual(
    {
      trailLength: presentation.trailLength,
      canShowSiblingNav: presentation.canShowSiblingNav,
      canShowFindRelations: presentation.canShowFindRelations,
      canShowManualAddRelated: presentation.canShowManualAddRelated,
      canShowRegenerateAudio: presentation.canShowRegenerateAudio,
      canShowRetryEnrichment: presentation.canShowRetryEnrichment,
      canCompleteAssist: presentation.canCompleteAssist,
      completeAssistDisabled: presentation.completeAssistDisabled,
      focusAssistLoading: presentation.focusAssistLoading,
      openingManualAddRelated: presentation.openingManualAddRelated,
      retryingEnrichment: presentation.retryingEnrichment,
      ensuringMoveTargetCluster: presentation.ensuringMoveTargetCluster,
      primaryActionLabel: presentation.primaryActionLabel,
      detailSpeakText: presentation.detailSpeakText,
      reviewHint: presentation.reviewHint,
    },
    {
      trailLength: 2,
      canShowSiblingNav: true,
      canShowFindRelations: true,
      canShowManualAddRelated: true,
      canShowRegenerateAudio: true,
      canShowRetryEnrichment: true,
      canCompleteAssist: true,
      completeAssistDisabled: true,
      focusAssistLoading: true,
      openingManualAddRelated: true,
      retryingEnrichment: true,
      ensuringMoveTargetCluster: true,
      primaryActionLabel: "加入复习",
      detailSpeakText: "Call it a day",
      reviewHint: "reviewing",
    },
  );
});

test("buildChunksFocusDetailSheetPresentation 在当前表达不匹配时会收起辅助动作", () => {
  const presentation = buildChunksFocusDetailSheetPresentation({
    focusDetail: {
      text: "wrap it up",
      savedItem: {
        userPhraseId: "phrase-2",
        text: "wrap it up",
      } as never,
    },
    focusExpression: {
      userPhraseId: "phrase-1",
      text: "call it a day",
    } as never,
    focusAssistData: {
      inputItem: null,
    } as never,
    savingFocusCandidateKeys: [],
    focusAssistLoading: false,
    savingQuickAddRelated: false,
    regeneratingDetailAudio: false,
    retryingEnrichmentIds: {},
    movingIntoCluster: false,
    ensuringMoveTargetCluster: false,
    detachingClusterMember: false,
    canSetCurrentClusterMain: false,
    canMoveIntoCurrentCluster: false,
    canSetStandaloneMain: false,
    primaryActionLabel: undefined,
    appleButtonClassName: "apple-btn",
    focusDetailSheetState: {
      trailLength: 1,
      canShowSiblingNav: false,
      canShowFindRelations: false,
      isDetailSpeaking: false,
    },
    focusDetailViewModel: {
      activeAssistItem: null,
      detailSpeakText: "wrap it up",
      similarRows: [],
      contrastRows: [],
      isSavedRelatedLoading: true,
      usageHint: "",
      typicalScenario: "",
      semanticFocus: "",
      reviewHint: "",
    },
  });

  assert.equal(presentation.canShowManualAddRelated, false);
  assert.equal(presentation.canCompleteAssist, false);
  assert.equal(presentation.completeAssistDisabled, false);
  assert.equal(presentation.retryingEnrichment, false);
});

test("buildChunksFocusDetailInteractionPresentation 会稳定返回 tab/open/save 派发参数", () => {
  const focusExpression = {
    userPhraseId: "phrase-1",
    text: "call it a day",
  } as const;

  const interactions = buildChunksFocusDetailInteractionPresentation({
    focusRelationTab: "contrast",
    focusExpression: focusExpression as never,
    defaultDifferenceLabel: "相关说法",
  });

  assert.deepEqual(interactions.buildTabChangeAction("similar"), {
    nextTab: "similar",
    nextRelationTab: "similar",
  });

  assert.deepEqual(
    interactions.buildOpenSimilarRowAction({
      key: "1",
      text: "wrap it up",
      kind: "library-similar",
      savedItem: null,
    }),
    {
      nextRelationTab: "similar",
      detailInput: {
        text: "wrap it up",
        differenceLabel: null,
        kind: "library-similar",
        chainMode: "append",
      },
    },
  );

  assert.deepEqual(
    interactions.buildOpenContrastRowAction({
      key: "2",
      text: "keep going",
      kind: "contrast",
      savedItem: null,
    }),
    {
      nextRelationTab: "contrast",
      detailInput: {
        text: "keep going",
        differenceLabel: null,
        kind: "contrast",
        chainMode: "append",
      },
    },
  );

  assert.deepEqual(
    interactions.buildSaveSimilarRowAction({
      key: "3",
      text: "wrap it up",
      kind: "library-similar",
      savedItem: null,
    }),
    {
      focusExpression,
      candidate: {
        text: "wrap it up",
        differenceLabel: "相关说法",
      },
      relationKind: "similar",
    },
  );

  assert.deepEqual(
    interactions.buildSaveContrastRowAction({
      key: "4",
      text: "keep going",
      differenceLabel: "继续推进",
      kind: "contrast",
      savedItem: null,
    }),
    {
      focusExpression,
      candidate: {
        text: "keep going",
        differenceLabel: "继续推进",
      },
      relationKind: "contrast",
    },
  );
});
