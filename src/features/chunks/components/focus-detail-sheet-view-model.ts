import { FocusDetailSheetLabels } from "./focus-detail-labels";

type FocusDetailConfirmAction =
  | "set-cluster-main"
  | "set-standalone-main"
  | "delete-expression";

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
    enriching: `${labels.detailRetryEnrichment ?? "补全当前 chunk"}...`,
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
    addThisExpression: labels.addThisExpression,
    addingThisExpression: labels.addingThisExpression ?? labels.addThisExpression,
    addedThisExpression: labels.addedThisExpression ?? labels.addThisExpression,
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
        : detailConfirmAction === "set-standalone-main"
          ? labels.detachClusterMemberConfirmTitle
          : labels.detailDeleteExpressionConfirmTitle ?? "删除当前表达？",
    description:
      detailConfirmAction === "set-cluster-main"
        ? labels.detailOpenAsMainConfirmDesc
        : detailConfirmAction === "set-standalone-main"
          ? labels.detachClusterMemberConfirmDesc
          : labels.detailDeleteExpressionConfirmDesc ??
            "这会从你的表达库中移除当前表达，删除后无法恢复。",
    text: detail?.savedItem?.text ?? "",
    translation: detail?.savedItem?.translation ?? null,
  };
}
