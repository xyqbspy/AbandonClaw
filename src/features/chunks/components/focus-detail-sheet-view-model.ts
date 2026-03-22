import { FocusDetailSheetLabels } from "./focus-detail-labels";

type FocusDetailConfirmAction = "set-cluster-main" | "set-standalone-main";

type FocusDetailState = {
  savedItem: {
    text: string;
    translation?: string | null;
  } | null;
};

export function buildFocusDetailContentLabels(labels: FocusDetailSheetLabels, reviewHint: string) {
  return {
    speakSentence: labels.speakSentence,
    candidateBadge: labels.detailCandidateBadge,
    noTranslation: labels.noTranslation,
    loading: labels.detailLoading,
    tabInfo: labels.detailTabInfo,
    tabSimilar: labels.detailTabSavedSimilar,
    tabContrast: labels.detailTabContrast,
    commonUsage: labels.commonUsage,
    typicalScenario: labels.typicalScenarioLabel,
    semanticFocus: labels.semanticFocusLabel,
    reviewStage: labels.reviewStage,
    usageHintFallback: labels.usageHintFallback,
    typicalScenarioPending: labels.typicalScenarioPending,
    semanticFocusPending: labels.semanticFocusPending,
    reviewHintFallback: reviewHint,
    sourceSentence: labels.sourceSentence,
    noSourceSentence: labels.noSourceSentence,
    similarHint: labels.detailSimilarHint,
    emptySimilar: labels.focusEmptySimilar,
    contrastHint: labels.detailContrastHint,
    emptyContrast: labels.noContrastExpressions,
  };
}

export function buildFocusDetailConfirmState(
  labels: FocusDetailSheetLabels,
  detailConfirmAction: FocusDetailConfirmAction | null,
  detail: FocusDetailState | null,
) {
  return {
    open: Boolean(detailConfirmAction && detail?.savedItem),
    title:
      detailConfirmAction === "set-cluster-main"
        ? labels.detailOpenAsMainConfirmTitle
        : labels.detachClusterMemberConfirmTitle,
    description:
      detailConfirmAction === "set-cluster-main"
        ? labels.detailOpenAsMainConfirmDesc
        : labels.detachClusterMemberConfirmDesc,
    text: detail?.savedItem?.text ?? "",
    translation: detail?.savedItem?.translation ?? null,
  };
}
