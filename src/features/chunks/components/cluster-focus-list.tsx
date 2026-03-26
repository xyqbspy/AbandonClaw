"use client";

import { ChevronDown } from "lucide-react";
import { LoadingState } from "@/components/shared/action-loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { APPLE_BODY_TEXT, APPLE_META_TEXT, APPLE_TITLE_SM } from "@/lib/ui/apple-style";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { FocusPreviewItem, SavedRelationRowsBySourceId } from "./types";

type ClusterFocusListLabels = {
  loading: string;
  title: string;
  expand: string;
  collapse: string;
  noTranslation: string;
  similarTab: string;
  openCurrentDetail: string;
};

type ClusterFocusListProps = {
  ready: boolean;
  rows: UserPhraseItemResponse[];
  currentFocusExpressionId: string | null;
  expandedFocusMainId: string | null;
  clusterMembersByClusterId: Map<string, UserPhraseItemResponse[]>;
  savedRelationRowsBySourceId: SavedRelationRowsBySourceId;
  currentFocusSimilarItems: FocusPreviewItem[];
  labels: ClusterFocusListLabels;
  appleSurfaceClassName: string;
  onToggleMain: (userPhraseId: string) => void;
  onToggleExpanded: (userPhraseId: string) => void;
  onOpenMainDetail: (row: UserPhraseItemResponse) => void;
  onOpenMainSimilarTab: (row: UserPhraseItemResponse) => void;
  onOpenPreviewItem: (row: UserPhraseItemResponse, item: FocusPreviewItem) => void;
};

export function ClusterFocusList({
  ready,
  rows,
  currentFocusExpressionId,
  expandedFocusMainId,
  clusterMembersByClusterId,
  savedRelationRowsBySourceId,
  currentFocusSimilarItems,
  labels,
  appleSurfaceClassName,
  onToggleMain,
  onToggleExpanded,
  onOpenMainDetail,
  onOpenMainSimilarTab,
  onOpenPreviewItem,
}: ClusterFocusListProps) {
  if (!ready) {
    return <LoadingState text={labels.loading} className="py-1" />;
  }

  return (
    <>
      {rows.map((row) => {
        const isCurrentMain = row.userPhraseId === currentFocusExpressionId;
        const isExpanded = expandedFocusMainId === row.userPhraseId;
        const savedSimilarItems = row.expressionClusterId
          ? (clusterMembersByClusterId.get(row.expressionClusterId) ?? [])
              .filter((member) => member.userPhraseId !== row.userPhraseId)
              .map((member) => ({
                key: `cluster:${member.userPhraseId}`,
                text: member.text,
                differenceLabel: undefined,
                kind: "library-similar" as const,
                savedItem: member,
              }))
          : [];
        const relationRows = savedRelationRowsBySourceId[row.userPhraseId] ?? [];
        const persistedSimilarItems = relationRows
          .filter((item) => item.relationType === "similar")
          .map((item) => ({
            key: `relation-similar:${item.item.userPhraseId}`,
            text: item.item.text,
            differenceLabel: undefined,
            kind: "library-similar" as const,
            savedItem: item.item,
          }));
        const similarItems = isCurrentMain
          ? currentFocusSimilarItems
          : [...savedSimilarItems, ...persistedSimilarItems].filter(
              (item, index, array) =>
                array.findIndex(
                  (candidate) => normalizePhraseText(candidate.text) === normalizePhraseText(item.text),
                ) === index,
            );
        const previewSimilarItems = similarItems.slice(0, 6);

        return (
          <Card key={row.userPhraseId} className={`${appleSurfaceClassName} gap-0 overflow-hidden`}>
            <CardHeader className="px-3 pb-3 pt-2.5">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => {
                  onToggleMain(row.userPhraseId);
                  onToggleExpanded(row.userPhraseId);
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? labels.collapse : labels.expand}
              >
                <p className={APPLE_META_TEXT}>{labels.title}</p>
                <ChevronDown
                  className={`size-4 shrink-0 ${APPLE_META_TEXT} transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              <button
                type="button"
                className="mt-0.5 min-w-0 text-left"
                onClick={() => onOpenMainDetail(row)}
              >
                <p className={`leading-snug ${APPLE_TITLE_SM}`}>{row.text}</p>
                <p className={`mt-0.5 line-clamp-1 leading-5 ${APPLE_META_TEXT}`}>
                  {row.translation ?? labels.noTranslation}
                </p>
              </button>
            </CardHeader>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isExpanded ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <CardContent className="px-3 pb-3 pt-0">
                {previewSimilarItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-medium ${APPLE_BODY_TEXT}`}>{labels.similarTab}</p>
                      <button
                        type="button"
                        className={`font-medium ${APPLE_META_TEXT} transition hover:text-foreground`}
                        onClick={() => onOpenMainSimilarTab(row)}
                      >
                        {labels.openCurrentDetail}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {previewSimilarItems.map((item, index) => {
                        const isLast = index === previewSimilarItems.length - 1;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={`block w-full text-left ${isLast ? "" : "border-b border-[var(--app-border-soft)] pb-2"}`}
                            onClick={() => onOpenPreviewItem(row, item)}
                          >
                            <p className={`font-medium ${APPLE_BODY_TEXT}`}>{item.text}</p>
                            {item.savedItem?.translation ? (
                              <p className={`mt-0.5 ${APPLE_META_TEXT}`}>
                                {item.savedItem.translation}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </div>
          </Card>
        );
      })}
    </>
  );
}
