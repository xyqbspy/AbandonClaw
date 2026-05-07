import { useCallback, useState } from "react";

import { normalizePhraseText } from "@/lib/shared/phrases";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

import {
  buildFocusDetailState,
  createFocusDetailTrailItem,
  FocusDetailCandidateLike,
  FocusDetailKind,
  FocusDetailStateLike,
  FocusDetailTabValue,
  FocusDetailTrailItem,
  resolveFocusDetailInitialTab,
  resolveFocusDetailItemFromCollections,
  resolveFocusDetailSiblingCollection,
  resolveReopenFocusTrail,
  updateFocusDetailTrail,
} from "./chunks-focus-detail-logic";

type FocusDetailCandidate = {
  key: string;
  text: string;
  differenceLabel?: string;
  kind: FocusDetailKind;
  savedItem: UserPhraseItemResponse | null;
};

const toLogicCandidates = (items: FocusDetailCandidate[]): FocusDetailCandidateLike[] => items;

export const useFocusDetailController = ({
  phraseByNormalized,
  expressionRows,
  focusSimilarItems,
  focusContrastItems,
  focusRelationTab,
  resolveFocusMainExpressionIdForRow,
  onSetFocusExpressionId,
}: {
  phraseByNormalized: Map<string, UserPhraseItemResponse>;
  expressionRows: UserPhraseItemResponse[];
  focusSimilarItems: FocusDetailCandidate[];
  focusContrastItems: FocusDetailCandidate[];
  focusRelationTab: "similar" | "contrast";
  resolveFocusMainExpressionIdForRow: (userPhraseId: string) => string;
  onSetFocusExpressionId: (userPhraseId: string) => void;
  onLoadFailed?: (message: string) => void;
}) => {
  const [focusDetailOpen, setFocusDetailOpen] = useState(false);
  const [focusDetailLoading, setFocusDetailLoading] = useState(false);
  const [focusDetail, setFocusDetail] = useState<FocusDetailStateLike | null>(null);
  const [focusDetailTab, setFocusDetailTab] = useState<FocusDetailTabValue>("info");
  const [focusDetailTrail, setFocusDetailTrail] = useState<FocusDetailTrailItem[]>([]);

  const openFocusDetail = useCallback(
    ({
      text,
      differenceLabel,
      kind,
      initialTab,
      chainMode,
    }: {
      text: string;
      differenceLabel?: string | null;
      kind: FocusDetailKind;
      initialTab?: FocusDetailTabValue;
      chainMode?: "reset" | "append";
    }) => {
      const { matched, savedItem } = resolveFocusDetailItemFromCollections({
        text,
        kind,
        phraseByNormalized,
        focusSimilarItems: toLogicCandidates(focusSimilarItems),
        focusContrastItems: toLogicCandidates(focusContrastItems),
      });
      const nextDetail = buildFocusDetailState({
        text,
        differenceLabel: differenceLabel ?? matched?.differenceLabel ?? null,
        kind,
        savedItem,
      });
      const nextTab = resolveFocusDetailInitialTab({ kind, initialTab });

      if (savedItem?.userPhraseId) {
        onSetFocusExpressionId(resolveFocusMainExpressionIdForRow(savedItem.userPhraseId));
      }

      setFocusDetail(nextDetail);
      setFocusDetailTab(nextTab);
      setFocusDetailTrail((current) =>
        updateFocusDetailTrail({
          current,
          nextItem: createFocusDetailTrailItem({
            userPhraseId: savedItem?.userPhraseId ?? null,
            text,
            differenceLabel: nextDetail.differenceLabel,
            kind,
            tab: nextTab,
          }),
          chainMode,
        }),
      );
      setFocusDetailOpen(true);
      setFocusDetailLoading(false);

      return nextDetail;
    },
    [
      focusContrastItems,
      focusSimilarItems,
      onSetFocusExpressionId,
      phraseByNormalized,
      resolveFocusMainExpressionIdForRow,
    ],
  );

  const openFocusSiblingDetail = useCallback(
    (direction: -1 | 1) => {
      const siblings = resolveFocusDetailSiblingCollection({
        focusDetail,
        focusRelationTab,
        focusSimilarItems: toLogicCandidates(focusSimilarItems),
        focusContrastItems: toLogicCandidates(focusContrastItems),
      });
      if (!focusDetail || siblings.length <= 1) return;

      const currentIndex = siblings.findIndex(
        (item) => normalizePhraseText(item.text) === normalizePhraseText(focusDetail.text),
      );
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (baseIndex + direction + siblings.length) % siblings.length;
      const nextItem = siblings[nextIndex];
      if (!nextItem) return;

      void openFocusDetail({
        text: nextItem.text,
        differenceLabel: nextItem.differenceLabel,
        kind: nextItem.kind,
        chainMode: "append",
        initialTab: nextItem.kind === "contrast" ? "contrast" : "similar",
      });
    },
    [focusContrastItems, focusDetail, focusRelationTab, focusSimilarItems, openFocusDetail],
  );

  const reopenFocusTrailItem = useCallback(
    (index: number) => {
      const resolved = resolveReopenFocusTrail({
        trail: focusDetailTrail,
        index,
      });
      if (!resolved) return;

      const savedItem =
        (resolved.target.userPhraseId
          ? expressionRows.find((row) => row.userPhraseId === resolved.target.userPhraseId) ?? null
          : null) ?? phraseByNormalized.get(normalizePhraseText(resolved.target.text)) ?? null;

      if (savedItem?.userPhraseId) {
        onSetFocusExpressionId(resolveFocusMainExpressionIdForRow(savedItem.userPhraseId));
      }

      setFocusDetail({
        text: resolved.target.text,
        differenceLabel: resolved.target.differenceLabel ?? null,
        kind: resolved.target.kind,
        savedItem,
        assistItem: null,
      });
      setFocusDetailTab(resolved.nextTab);
      setFocusDetailTrail(resolved.nextTrail);
      setFocusDetailOpen(true);
      setFocusDetailLoading(false);
    },
    [expressionRows, focusDetailTrail, onSetFocusExpressionId, phraseByNormalized, resolveFocusMainExpressionIdForRow],
  );

  return {
    focusDetailOpen,
    setFocusDetailOpen,
    focusDetailLoading,
    setFocusDetailLoading,
    focusDetail,
    setFocusDetail,
    focusDetailTab,
    setFocusDetailTab,
    focusDetailTrail,
    setFocusDetailTrail,
    openFocusDetail,
    openFocusSiblingDetail,
    reopenFocusTrailItem,
  };
};
