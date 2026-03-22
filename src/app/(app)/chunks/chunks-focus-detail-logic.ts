import { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { normalizePhraseText } from "@/lib/shared/phrases";

export type FocusDetailKind =
  | "current"
  | "library-similar"
  | "suggested-similar"
  | "contrast";

export type FocusDetailTabValue = "info" | "similar" | "contrast";

export type FocusDetailTrailItem = {
  userPhraseId: string | null;
  text: string;
  differenceLabel?: string | null;
  kind: FocusDetailKind;
  tab: FocusDetailTabValue;
};

export type FocusDetailStateLike = {
  text: string;
  differenceLabel?: string | null;
  kind: FocusDetailKind;
  savedItem: UserPhraseItemResponse | null;
  assistItem: ManualExpressionAssistResponse["inputItem"] | null;
};

export type FocusDetailCandidateLike = {
  text: string;
  differenceLabel?: string | null;
  kind: FocusDetailKind;
  savedItem: UserPhraseItemResponse | null;
};

export const createFocusDetailTrailItem = ({
  userPhraseId,
  text,
  differenceLabel,
  kind,
  tab,
}: {
  userPhraseId: string | null;
  text: string;
  differenceLabel?: string | null;
  kind: FocusDetailKind;
  tab: FocusDetailTabValue;
}): FocusDetailTrailItem => ({
  userPhraseId,
  text,
  differenceLabel: differenceLabel ?? null,
  kind,
  tab,
});

export const buildFocusDetailState = ({
  text,
  differenceLabel,
  kind,
  savedItem,
}: {
  text: string;
  differenceLabel?: string | null;
  kind: FocusDetailKind;
  savedItem: UserPhraseItemResponse | null;
}): FocusDetailStateLike => ({
  text,
  differenceLabel: differenceLabel ?? null,
  kind,
  savedItem,
  assistItem: null,
});

export const resolveFocusDetailInitialTab = ({
  kind,
  initialTab,
}: {
  kind: FocusDetailKind;
  initialTab?: FocusDetailTabValue;
}) => {
  if (initialTab) return initialTab;
  if (kind === "contrast") return "contrast";
  if (kind === "library-similar" || kind === "suggested-similar") return "similar";
  return "info";
};

export const resolveFocusDetailItemFromCollections = ({
  text,
  kind,
  phraseByNormalized,
  focusSimilarItems,
  focusContrastItems,
}: {
  text: string;
  kind: FocusDetailKind;
  phraseByNormalized: Map<string, UserPhraseItemResponse>;
  focusSimilarItems: FocusDetailCandidateLike[];
  focusContrastItems: FocusDetailCandidateLike[];
}) => {
  const normalized = normalizePhraseText(text);
  const collection =
    kind === "contrast"
      ? focusContrastItems
      : kind === "library-similar" || kind === "suggested-similar"
        ? focusSimilarItems
        : [];
  const matched = collection.find((item) => normalizePhraseText(item.text) === normalized) ?? null;

  return {
    matched,
    savedItem: matched?.savedItem ?? phraseByNormalized.get(normalized) ?? null,
  };
};

export const resolveFocusDetailSiblingCollection = ({
  focusDetail,
  focusRelationTab,
  focusSimilarItems,
  focusContrastItems,
}: {
  focusDetail: FocusDetailStateLike | null;
  focusRelationTab: "similar" | "contrast";
  focusSimilarItems: FocusDetailCandidateLike[];
  focusContrastItems: FocusDetailCandidateLike[];
}) => {
  if (!focusDetail || focusDetail.kind === "current") return [] as FocusDetailCandidateLike[];
  return focusRelationTab === "contrast" ? focusContrastItems : focusSimilarItems;
};

const normalizeTrailKey = (item: Pick<FocusDetailTrailItem, "text" | "kind">) =>
  `${item.kind}:${item.text.trim().toLowerCase()}`;

export const updateFocusDetailTrail = ({
  current,
  nextItem,
  chainMode,
}: {
  current: FocusDetailTrailItem[];
  nextItem: FocusDetailTrailItem;
  chainMode?: "reset" | "append";
}) => {
  if (chainMode !== "append") {
    return [nextItem];
  }

  const duplicateIndex = current.findIndex(
    (item) => normalizeTrailKey(item) === normalizeTrailKey(nextItem),
  );
  if (duplicateIndex >= 0) {
    return current.slice(0, duplicateIndex + 1).map((item, index) =>
      index === duplicateIndex ? nextItem : item,
    );
  }

  return [...current, nextItem];
};

export const resolveReopenFocusTrail = ({
  trail,
  index,
}: {
  trail: FocusDetailTrailItem[];
  index: number;
}) => {
  const target = trail[index];
  if (!target) return null;

  return {
    target,
    nextTrail: trail.slice(0, index + 1),
    nextTab: target.tab,
  };
};

export const buildFocusDetailCloseState = () => ({
  open: false,
  actionsOpen: false,
  trail: [] as FocusDetailTrailItem[],
  tab: "info" as FocusDetailTabValue,
});

export const resolveFocusRelationTabOnDetailTabChange = (
  nextTab: FocusDetailTabValue,
  currentRelationTab: "similar" | "contrast",
) => {
  if (nextTab === "similar" || nextTab === "contrast") {
    return nextTab;
  }
  return currentRelationTab;
};
