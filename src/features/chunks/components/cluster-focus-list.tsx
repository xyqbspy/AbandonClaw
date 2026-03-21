"use client";

import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { normalizePhraseText } from "@/lib/shared/phrases";
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
    return <p className="text-sm text-muted-foreground">{labels.loading}</p>;
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
                <p className="text-[11px] text-muted-foreground">{labels.title}</p>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              <button
                type="button"
                className="mt-0.5 min-w-0 text-left"
                onClick={() => onOpenMainDetail(row)}
              >
                <p className="text-[15px] font-semibold leading-snug">{row.text}</p>
                <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
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
                      <p className="text-sm font-medium text-foreground/85">{labels.similarTab}</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
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
                            className={`block w-full text-left ${isLast ? "" : "border-b border-[rgb(236,238,240)] pb-2"}`}
                            onClick={() => onOpenPreviewItem(row, item)}
                          >
                            <p className="text-sm font-medium text-foreground">{item.text}</p>
                            {item.savedItem?.translation ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
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
