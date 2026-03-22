import { normalizePhraseText } from "@/lib/shared/phrases";
import { PhraseReviewStatus, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { MoveIntoClusterGroup } from "@/features/chunks/components/types";
import {
  buildFocusDetailCloseState,
  FocusDetailStateLike,
  FocusDetailTabValue,
  resolveFocusRelationTabOnDetailTabChange,
} from "./chunks-focus-detail-logic";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

export type ChunksContentFilter = "expression" | "sentence";
export type ChunksReviewFilter = PhraseReviewStatus | "all";

const isChunksReviewFilter = (value: string): value is ChunksReviewFilter =>
  value === "all" ||
  value === "saved" ||
  value === "reviewing" ||
  value === "mastered" ||
  value === "archived";

const isChunksContentFilter = (value: string): value is ChunksContentFilter =>
  value === "expression" || value === "sentence";

export const getClusterIdFromSearchParams = (searchParams: SearchParamsLike) =>
  searchParams.get("cluster")?.trim() ?? "";

export const parseChunksRouteState = (searchParams: SearchParamsLike) => {
  const routeQuery = searchParams.get("query")?.trim() ?? "";
  const reviewParam = searchParams.get("review")?.trim() ?? "";
  const contentParam = searchParams.get("content")?.trim() ?? "";

  return {
    query: routeQuery,
    reviewFilter: isChunksReviewFilter(reviewParam) ? reviewParam : ("all" as ChunksReviewFilter),
    contentFilter: isChunksContentFilter(contentParam)
      ? contentParam
      : ("expression" as ChunksContentFilter),
    clusterId: getClusterIdFromSearchParams(searchParams),
  };
};

export const buildChunksRouteHref = ({
  searchParams,
  query,
  reviewFilter,
  contentFilter,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  query: string;
  reviewFilter: ChunksReviewFilter;
  contentFilter: ChunksContentFilter;
  clusterId: string;
}) => {
  const nextParams = new URLSearchParams(searchParams.toString());
  const normalizedQuery = query.trim();
  const normalizedClusterId = clusterId.trim();

  if (normalizedQuery) nextParams.set("query", normalizedQuery);
  else nextParams.delete("query");

  if (reviewFilter !== "all") nextParams.set("review", reviewFilter);
  else nextParams.delete("review");

  if (contentFilter !== "expression") nextParams.set("content", contentFilter);
  else nextParams.delete("content");

  if (normalizedClusterId) nextParams.set("cluster", normalizedClusterId);
  else nextParams.delete("cluster");

  const suffix = nextParams.toString();
  return `/chunks${suffix ? `?${suffix}` : ""}`;
};

export const shouldReplaceChunksRoute = ({
  searchParams,
  query,
  reviewFilter,
  contentFilter,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  query: string;
  reviewFilter: ChunksReviewFilter;
  contentFilter: ChunksContentFilter;
  clusterId: string;
}) => {
  const nextHref = buildChunksRouteHref({
    searchParams,
    query,
    reviewFilter,
    contentFilter,
    clusterId,
  });
  const currentQuery = searchParams.toString();
  const currentHref = `/chunks${currentQuery ? `?${currentQuery}` : ""}`;
  return {
    nextHref,
    shouldReplace: nextHref !== currentHref,
  };
};

export const buildChunksHref = ({
  searchParams,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  clusterId: string;
}) => {
  return buildChunksRouteHref({
    searchParams,
    query: searchParams.get("query")?.trim() ?? "",
    reviewFilter: isChunksReviewFilter(searchParams.get("review")?.trim() ?? "")
      ? (searchParams.get("review")?.trim() as ChunksReviewFilter)
      : "all",
    contentFilter: isChunksContentFilter(searchParams.get("content")?.trim() ?? "")
      ? (searchParams.get("content")?.trim() as ChunksContentFilter)
      : "expression",
    clusterId,
  });
};

export const buildClusterFilterChange = ({
  searchParams,
  clusterId,
}: {
  searchParams: SearchParamsLike;
  clusterId: string;
}) => {
  const nextClusterId = clusterId.trim();
  return {
    nextClusterId,
    nextHref: buildChunksHref({
      searchParams,
      clusterId: nextClusterId,
    }),
    shouldResetFilters: nextClusterId.length > 0,
  };
};

export const buildChunksSummary = ({
  loading,
  total,
  labels,
}: {
  loading: boolean;
  total: number;
  labels: {
    loading: string;
    total: string;
    items: string;
  };
}) => {
  if (loading) return labels.loading;
  return `${labels.total} ${total} ${labels.items}`;
};

export const resolveClusterFilterExpressionLabel = ({
  expressionClusterFilterId,
  phrases,
}: {
  expressionClusterFilterId: string;
  phrases: UserPhraseItemResponse[];
}) => {
  if (!expressionClusterFilterId) return "";
  const row = phrases.find(
    (item) =>
      item.learningItemType === "expression" &&
      item.expressionClusterId === expressionClusterFilterId,
  );
  return row?.text ?? "";
};

export const resolveFocusExpressionId = ({
  contentFilter,
  focusExpressionId,
  focusMainExpressionIds,
  resolveFocusMainExpressionId,
}: {
  contentFilter: ChunksContentFilter;
  focusExpressionId: string;
  focusMainExpressionIds: string[];
  resolveFocusMainExpressionId: (userPhraseId: string) => string;
}) => {
  if (contentFilter !== "expression" || focusMainExpressionIds.length === 0) {
    return "";
  }

  const resolvedId = focusExpressionId
    ? resolveFocusMainExpressionId(focusExpressionId)
    : "";

  if (!resolvedId || !focusMainExpressionIds.includes(resolvedId)) {
    return focusMainExpressionIds[0] ?? "";
  }

  return resolvedId;
};

export const buildFocusDetailSheetState = ({
  focusDetail,
  focusDetailTrailLength,
  focusRelationTab,
  focusSimilarCount,
  focusContrastCount,
  canShowFindRelations,
  focusExpression,
  savingFocusCandidateKey,
  playingText,
  ttsPlaybackText,
  detailSpeakText,
}: {
  focusDetail: FocusDetailStateLike | null;
  focusDetailTrailLength: number;
  focusRelationTab: "similar" | "contrast";
  focusSimilarCount: number;
  focusContrastCount: number;
  canShowFindRelations: boolean;
  focusExpression: UserPhraseItemResponse | null;
  savingFocusCandidateKey: string | null | undefined;
  playingText: string | null;
  ttsPlaybackText: string | null | undefined;
  detailSpeakText: string;
}) => ({
  trailLength: focusDetailTrailLength,
  canShowSiblingNav: Boolean(
    focusDetail &&
      focusDetail.kind !== "current" &&
      (focusRelationTab === "contrast" ? focusContrastCount : focusSimilarCount) > 1,
  ),
  canShowFindRelations,
  savingFocusCandidate: Boolean(
    !focusExpression ||
      !focusDetail ||
      savingFocusCandidateKey ===
        `${focusDetail.kind === "contrast" ? "contrast" : "similar"}:${normalizePhraseText(focusDetail.text)}`,
  ),
  isDetailSpeaking: Boolean(
    detailSpeakText && (playingText === detailSpeakText || ttsPlaybackText === detailSpeakText),
  ),
});

export const buildFocusDetailClosePayload = () => {
  const nextState = buildFocusDetailCloseState();
  return {
    open: nextState.open,
    actionsOpen: nextState.actionsOpen,
    trail: nextState.trail,
    tab: nextState.tab,
  };
};

export const buildFocusDetailTabChangeState = ({
  nextTab,
  focusRelationTab,
}: {
  nextTab: FocusDetailTabValue;
  focusRelationTab: "similar" | "contrast";
}): {
  nextTab: FocusDetailTabValue;
  nextRelationTab: "similar" | "contrast";
} => ({
  nextTab,
  nextRelationTab: resolveFocusRelationTabOnDetailTabChange(nextTab, focusRelationTab),
});

export const buildFocusDetailOpenRowAction = ({
  row,
  kind,
}: {
  row: Pick<UserPhraseItemResponse, "text"> & { differenceLabel?: string | null };
  kind: "library-similar" | "suggested-similar" | "contrast";
}): {
  nextRelationTab: "similar" | "contrast";
  detailInput: {
    text: string;
    differenceLabel?: string | null;
    kind: "library-similar" | "suggested-similar" | "contrast";
    chainMode: "append";
  };
} => ({
  nextRelationTab: kind === "contrast" ? "contrast" : "similar",
  detailInput: {
    text: row.text,
    differenceLabel: row.differenceLabel ?? null,
    kind,
    chainMode: "append" as const,
  },
});

export const buildFocusDetailSecondaryActionInput = ({
  focusExpression,
  focusDetail,
  defaultDifferenceLabel,
}: {
  focusExpression: UserPhraseItemResponse | null;
  focusDetail: FocusDetailStateLike | null;
  defaultDifferenceLabel: string;
}): {
  focusExpression: UserPhraseItemResponse;
  candidate: {
    text: string;
    differenceLabel: string;
  };
  relationKind: "similar" | "contrast";
} | null => {
  if (!focusExpression || !focusDetail) return null;

  return {
    focusExpression,
    candidate: {
      text: focusDetail.text,
      differenceLabel: focusDetail.differenceLabel ?? defaultDifferenceLabel,
    },
    relationKind: focusDetail.kind === "contrast" ? "contrast" : ("similar" as const),
  };
};

export const buildSavedFocusDetailState = ({
  focusDetail,
  matchedSavedItem,
}: {
  focusDetail: FocusDetailStateLike | null;
  matchedSavedItem: UserPhraseItemResponse | null;
}): FocusDetailStateLike | null => {
  if (!focusDetail || !matchedSavedItem) {
    return focusDetail;
  }

  if (normalizePhraseText(focusDetail.text) !== normalizePhraseText(matchedSavedItem.text)) {
    return focusDetail;
  }

  const nextKind =
    focusDetail.kind === "contrast"
      ? "contrast"
      : focusDetail.kind === "current"
        ? "current"
        : "library-similar";

  if (focusDetail.savedItem === matchedSavedItem && focusDetail.kind === nextKind) {
    return focusDetail;
  }

  return {
    ...focusDetail,
    savedItem: matchedSavedItem,
    kind: nextKind,
  };
};

export const buildMoveIntoClusterSheetState = ({
  focusExpression,
  groups,
  expandedGroups,
  selectedMap,
  submitting,
  appleButtonClassName,
  labels,
}: {
  focusExpression: UserPhraseItemResponse | null;
  groups: MoveIntoClusterGroup[];
  expandedGroups: Record<string, boolean>;
  selectedMap: Record<string, boolean>;
  submitting: boolean;
  appleButtonClassName: string;
  labels: {
    close: string;
    title: string;
    description: string;
    currentMain: string;
    empty: string;
    selectGroup: string;
    selectedGroup: string;
    coveredByMain: string;
    submit: string;
    mainExpression: string;
    subExpression: string;
  };
}) => ({
  focusExpression,
  groups,
  expandedGroups,
  selectedMap,
  submitting,
  appleButtonClassName,
  labels: {
    close: labels.close,
    title: labels.title,
    description: labels.description,
    currentMain: labels.currentMain,
    empty: labels.empty,
    selectGroup: labels.selectGroup,
    selectedGroup: labels.selectedGroup,
    coveredByMain: labels.coveredByMain,
    submit: labels.submit,
    mainExpression: labels.mainExpression,
    subExpression: labels.subExpression,
    selected: "已选",
    unselected: "未选",
    covered: "已覆盖",
  },
});

export const buildMoveIntoClusterOpenChangeState = (open: boolean) => ({
  open,
  shouldResetSelection: !open,
});

export const buildManualSheetState = ({
  manualItemType,
  manualExpressionAssist,
  savingManual,
  savingManualSentence,
  labels,
}: {
  manualItemType: "expression" | "sentence";
  manualExpressionAssist: unknown | null;
  savingManual: boolean;
  savingManualSentence: boolean;
  labels: {
    title: string;
    description: string;
    itemTypeLabel: string;
    saveSentence: string;
    saveSelectedExpressions: string;
    saveToLibrary: string;
    saveAndReview: string;
  };
}) => {
  const isSaving = savingManual || savingManualSentence;
  const primaryIdleLabel =
    manualItemType === "sentence"
      ? labels.saveSentence
      : manualExpressionAssist
        ? labels.saveSelectedExpressions
        : labels.saveToLibrary;

  return {
    title: labels.title,
    description: labels.description,
    itemTypeLabel: labels.itemTypeLabel,
    isSaving,
    footerGridClassName: manualItemType === "sentence" ? "grid-cols-1" : "grid-cols-2",
    primaryActionLabel: isSaving ? `${primaryIdleLabel}...` : primaryIdleLabel,
    secondaryActionLabel: isSaving ? `${labels.saveAndReview}...` : labels.saveAndReview,
    showSecondaryAction: manualItemType === "expression",
  };
};

export const buildGeneratedSimilarSheetState = ({
  similarSeedExpression,
  generatingSimilarForId,
  generatedSimilarCandidates,
  savingSelectedSimilar,
  labels,
}: {
  similarSeedExpression: Pick<UserPhraseItemResponse, "text"> | null;
  generatingSimilarForId: string | null;
  generatedSimilarCandidates: unknown[];
  savingSelectedSimilar: boolean;
  labels: {
    title: string;
    description: string;
    centerExpression: string;
    generating: string;
    empty: string;
    close: string;
    submit: string;
  };
}) => ({
  title: labels.title,
  description: labels.description,
  centerExpressionLabel: labels.centerExpression,
  generatingLabel: `${labels.generating}...`,
  emptyLabel: labels.empty,
  closeLabel: labels.close,
  submitLabel: savingSelectedSimilar ? `${labels.submit}...` : labels.submit,
  showSeedExpression: Boolean(similarSeedExpression),
  showGenerating: Boolean(generatingSimilarForId),
  showEmpty: !generatingSimilarForId && generatedSimilarCandidates.length === 0,
  showCandidates: !generatingSimilarForId && generatedSimilarCandidates.length > 0,
  submitDisabled: savingSelectedSimilar || generatingSimilarForId !== null,
});
