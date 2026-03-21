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
  savedItem: unknown | null;
  assistItem: unknown | null;
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
  savedItem: unknown | null;
}): FocusDetailStateLike => ({
  text,
  differenceLabel: differenceLabel ?? null,
  kind,
  savedItem,
  assistItem: null,
});

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
