import { normalizePhraseText } from "@/lib/shared/phrases";
import { ManualExpressionAssistResponse, UserPhraseItemResponse, UserPhraseRelationItemResponse } from "@/lib/utils/phrases-api";

type FocusDetailStateLike = {
  text: string;
  differenceLabel?: string | null;
  kind: "current" | "library-similar" | "suggested-similar" | "contrast";
  savedItem: UserPhraseItemResponse | null;
  assistItem: ManualExpressionAssistResponse["inputItem"] | null;
};

type SavedRelatedExpressionItem = {
  row: UserPhraseItemResponse;
  relationType: "similar" | "contrast";
};

type BuildFocusDetailViewModelParams = {
  focusDetail: FocusDetailStateLike | null;
  focusExpression: UserPhraseItemResponse | null;
  focusAssistData: ManualExpressionAssistResponse | null;
  savedRelationCache: Record<string, { loaded: boolean; rows: UserPhraseRelationItemResponse[] }>;
  clusterMembersByClusterId: Map<string, UserPhraseItemResponse[]>;
  phraseByNormalized: Map<string, UserPhraseItemResponse>;
  savedRelationLoadingKey: string | null;
  isContrastDerivedExpression: (sourceNote: string | null | undefined) => boolean;
  getUsageHint: (item: UserPhraseItemResponse) => string;
  getReviewActionHint: (status: UserPhraseItemResponse["reviewStatus"]) => string;
  defaults: {
    usageHintFallback: string;
    typicalScenarioPending: string;
    semanticFocusPending: string;
    reviewHintFallback: string;
  };
};

export const buildFocusDetailViewModel = ({
  focusDetail,
  focusExpression,
  focusAssistData,
  savedRelationCache,
  clusterMembersByClusterId,
  phraseByNormalized,
  savedRelationLoadingKey,
  isContrastDerivedExpression,
  getUsageHint,
  getReviewActionHint,
  defaults,
}: BuildFocusDetailViewModelParams) => {
  if (!focusDetail) {
    return {
      activeAssistItem: null,
      detailSpeakText: "",
      similarRows: [] as UserPhraseItemResponse[],
      contrastRows: [] as UserPhraseItemResponse[],
      isSavedRelatedLoading: false,
      usageHint: defaults.usageHintFallback,
      typicalScenario: defaults.typicalScenarioPending,
      semanticFocus: defaults.semanticFocusPending,
      reviewHint: defaults.reviewHintFallback,
      canShowFindRelations: false,
    };
  }

  const isCurrentFocusMainDetail =
    focusDetail.kind === "current" &&
    focusExpression &&
    normalizePhraseText(focusDetail.text) === normalizePhraseText(focusExpression.text);

  const activeAssistItem = isCurrentFocusMainDetail
    ? focusAssistData?.inputItem ?? focusDetail.assistItem
    : focusDetail.assistItem;

  const generatedContrastRows = isCurrentFocusMainDetail
    ? focusAssistData?.contrastExpressions ?? []
    : [];

  const persistedRelations = focusDetail.savedItem
    ? savedRelationCache[focusDetail.savedItem.userPhraseId]?.rows ?? []
    : [];

  const savedRelatedRows = (() => {
    const items: SavedRelatedExpressionItem[] = [];
    const seen = new Set<string>();

    const pushItem = (row: UserPhraseItemResponse, relationType: "similar" | "contrast") => {
      const normalized = normalizePhraseText(row.text);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      items.push({ row, relationType });
    };

    for (const relation of persistedRelations) {
      pushItem(relation.item, relation.relationType);
    }

    if (focusDetail.savedItem?.expressionClusterId) {
      for (const row of clusterMembersByClusterId.get(focusDetail.savedItem.expressionClusterId) ?? []) {
        if (row.userPhraseId === focusDetail.savedItem.userPhraseId) continue;
        if (isContrastDerivedExpression(row.sourceNote)) continue;
        pushItem(row, "similar");
      }
    }

    return items;
  })();

  const similarRows = savedRelatedRows
    .filter(({ relationType }) => relationType === "similar")
    .map(({ row }) => row);

  const contrastRows = [
    ...savedRelatedRows.filter(({ relationType }) => relationType === "contrast"),
    ...generatedContrastRows
      .map((candidate) => {
        const saved = phraseByNormalized.get(normalizePhraseText(candidate.text)) ?? null;
        return saved ? { row: saved, relationType: "contrast" as const } : null;
      })
      .filter(
        (
          item,
        ): item is { row: UserPhraseItemResponse; relationType: "contrast" } => Boolean(item),
      ),
  ]
    .filter(
      ({ row }, index, array) =>
        array.findIndex(
          (candidate) =>
            normalizePhraseText(candidate.row.text) === normalizePhraseText(row.text),
        ) === index,
    )
    .map(({ row }) => row);

  return {
    activeAssistItem,
    detailSpeakText: focusDetail.text.trim(),
    similarRows,
    contrastRows,
    isSavedRelatedLoading:
      Boolean(focusDetail.savedItem?.userPhraseId) &&
      savedRelationLoadingKey === focusDetail.savedItem?.userPhraseId,
    usageHint: focusDetail.savedItem
      ? getUsageHint(focusDetail.savedItem)
      : activeAssistItem?.usageNote || defaults.usageHintFallback,
    typicalScenario:
      focusDetail.savedItem?.typicalScenario ??
      activeAssistItem?.typicalScenario ??
      defaults.typicalScenarioPending,
    semanticFocus:
      focusDetail.savedItem?.semanticFocus ??
      activeAssistItem?.semanticFocus ??
      defaults.semanticFocusPending,
    reviewHint: focusDetail.savedItem
      ? getReviewActionHint(focusDetail.savedItem.reviewStatus)
      : defaults.reviewHintFallback,
    canShowFindRelations: Boolean(
      focusDetail.savedItem &&
        isCurrentFocusMainDetail &&
        focusAssistData === null,
    ),
  };
};
