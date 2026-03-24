import { normalizePhraseText } from "@/lib/shared/phrases";
import type { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import type { FocusDetailRelatedItem } from "@/features/chunks/components/focus-detail-selectors";
import {
  buildFocusDetailOpenRowAction,
  buildFocusDetailSaveRowAction,
  buildFocusDetailTabChangeState,
} from "./chunks-page-logic";

type FocusDetailState = {
  text: string;
  savedItem: UserPhraseItemResponse | null;
} | null;

type FocusDetailSheetState = {
  trailLength: number;
  canShowSiblingNav: boolean;
  canShowFindRelations: boolean;
  isDetailSpeaking: boolean;
};

type FocusDetailViewModelState = {
  activeAssistItem: ManualExpressionAssistResponse["inputItem"] | null;
  detailSpeakText: string;
  similarRows: FocusDetailRelatedItem[];
  contrastRows: FocusDetailRelatedItem[];
  isSavedRelatedLoading: boolean;
  usageHint: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewHint: string;
};

export const buildChunksFocusDetailSheetPresentation = ({
  focusDetail,
  focusExpression,
  focusAssistData,
  savingFocusCandidateKeys,
  focusAssistLoading,
  savingQuickAddRelated,
  regeneratingDetailAudio,
  retryingEnrichmentIds,
  movingIntoCluster,
  ensuringMoveTargetCluster,
  detachingClusterMember,
  canSetCurrentClusterMain,
  canMoveIntoCurrentCluster,
  canSetStandaloneMain,
  primaryActionLabel,
  appleButtonClassName,
  focusDetailSheetState,
  focusDetailViewModel,
}: {
  focusDetail: FocusDetailState;
  focusExpression: UserPhraseItemResponse | null;
  focusAssistData: ManualExpressionAssistResponse | null;
  savingFocusCandidateKeys: string[];
  focusAssistLoading: boolean;
  savingQuickAddRelated: boolean;
  regeneratingDetailAudio: boolean;
  retryingEnrichmentIds: Record<string, boolean | undefined>;
  movingIntoCluster: boolean;
  ensuringMoveTargetCluster: boolean;
  detachingClusterMember: boolean;
  canSetCurrentClusterMain: boolean;
  canMoveIntoCurrentCluster: boolean;
  canSetStandaloneMain: boolean;
  primaryActionLabel: string | undefined;
  appleButtonClassName: string;
  focusDetailSheetState: FocusDetailSheetState;
  focusDetailViewModel: FocusDetailViewModelState;
}) => {
  const isCurrentFocusExpression = Boolean(
    focusDetail?.savedItem &&
      focusExpression &&
      normalizePhraseText(focusDetail.text) === normalizePhraseText(focusExpression.text),
  );

  return {
    trailLength: focusDetailSheetState.trailLength,
    canShowSiblingNav: focusDetailSheetState.canShowSiblingNav,
    canShowFindRelations: focusDetailSheetState.canShowFindRelations,
    canShowManualAddRelated: isCurrentFocusExpression,
    canShowRegenerateAudio: Boolean(focusDetail),
    canShowRetryEnrichment: Boolean(focusDetail?.savedItem),
    canCompleteAssist: Boolean(focusAssistData && isCurrentFocusExpression),
    completeAssistDisabled: savingFocusCandidateKeys.length > 0,
    focusAssistLoading,
    openingManualAddRelated: savingQuickAddRelated,
    regeneratingAudio: regeneratingDetailAudio,
    retryingEnrichment: Boolean(
      focusDetail?.savedItem && retryingEnrichmentIds[focusDetail.savedItem.userPhraseId],
    ),
    movingIntoCluster,
    ensuringMoveTargetCluster,
    detachingClusterMember,
    canSetCurrentClusterMain,
    canMoveIntoCurrentCluster,
    canSetStandaloneMain,
    primaryActionLabel,
    appleButtonClassName,
    activeAssistItem: focusDetailViewModel.activeAssistItem,
    isDetailSpeaking: focusDetailSheetState.isDetailSpeaking,
    detailSpeakText: focusDetailViewModel.detailSpeakText,
    similarRows: focusDetailViewModel.similarRows,
    contrastRows: focusDetailViewModel.contrastRows,
    isSavedRelatedLoading: focusDetailViewModel.isSavedRelatedLoading,
    usageHint: focusDetailViewModel.usageHint,
    typicalScenario: focusDetailViewModel.typicalScenario,
    semanticFocus: focusDetailViewModel.semanticFocus,
    reviewHint: focusDetailViewModel.reviewHint,
  };
};

export const buildChunksFocusDetailInteractionPresentation = ({
  focusRelationTab,
  focusExpression,
  defaultDifferenceLabel,
}: {
  focusRelationTab: "similar" | "contrast";
  focusExpression: UserPhraseItemResponse | null;
  defaultDifferenceLabel: string;
}) => ({
  buildTabChangeAction: (nextTab: "info" | "similar" | "contrast") =>
    buildFocusDetailTabChangeState({
      nextTab,
      focusRelationTab,
    }),
  buildOpenSimilarRowAction: (row: FocusDetailRelatedItem) =>
    buildFocusDetailOpenRowAction({
      row,
      kind: row.kind,
    }),
  buildOpenContrastRowAction: (row: FocusDetailRelatedItem) =>
    buildFocusDetailOpenRowAction({
      row,
      kind: "contrast",
    }),
  buildSaveSimilarRowAction: (row: FocusDetailRelatedItem) =>
    buildFocusDetailSaveRowAction({
      focusExpression,
      row,
      relationKind: "similar",
      defaultDifferenceLabel,
    }),
  buildSaveContrastRowAction: (row: FocusDetailRelatedItem) =>
    buildFocusDetailSaveRowAction({
      focusExpression,
      row,
      relationKind: "contrast",
      defaultDifferenceLabel,
    }),
});
