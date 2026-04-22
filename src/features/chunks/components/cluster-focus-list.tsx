"use client";

import { ChevronDown } from "lucide-react";
import { LoadingState } from "@/components/shared/action-loading";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import {
  ExpressionSummaryCard,
  ExpressionSummaryGroup,
  ExpressionSummaryRelatedItem,
} from "./expression-summary-card";
import { FocusPreviewItem, SavedRelationRowsBySourceId } from "./types";

const ACTION_ICON_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--app-chunks-sheet-secondary-border)] bg-[var(--app-chunks-sheet-info-soft)] text-[var(--app-chunks-sheet-info-text)]";

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
  void appleSurfaceClassName;

  if (!ready) {
    return <LoadingState text={labels.loading} className="py-1" />;
  }

  return (
    <div className="flex flex-col gap-4 [@media(max-height:760px)]:gap-3">
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
                  (candidate) =>
                    normalizePhraseText(candidate.text) === normalizePhraseText(item.text),
                ) === index,
            );
        const previewSimilarItems = similarItems.slice(0, 6);

        return (
          <ExpressionSummaryCard
            key={row.userPhraseId}
            title={row.text}
            translation={row.translation ?? labels.noTranslation}
            onTitleClick={() => onOpenMainDetail(row)}
            className="active:scale-[0.98]"
            action={
              <button
                type="button"
                className={ACTION_ICON_CLASS}
                onClick={() => {
                  onToggleMain(row.userPhraseId);
                  onToggleExpanded(row.userPhraseId);
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? labels.collapse : labels.expand}
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            }
          >
            <ExpressionSummaryGroup
              label={`🔆 ${labels.similarTab}${previewSimilarItems.length > 0 ? ` · ${previewSimilarItems.length}` : ""}`}
              actionLabel={labels.openCurrentDetail}
              onAction={() => onOpenMainSimilarTab(row)}
              collapsed={!isExpanded}
            >
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  isExpanded ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {previewSimilarItems.length > 0 ? (
                  <div className="space-y-0">
                    {previewSimilarItems.map((item) => (
                      <ExpressionSummaryRelatedItem
                        key={item.key}
                        primary={item.text}
                        secondary={
                          item.differenceLabel ?? item.savedItem?.translation ?? labels.openCurrentDetail
                        }
                        onClick={() => onOpenPreviewItem(row, item)}
                      />
                    ))}
                  </div>
                ) : isExpanded ? (
                  <p className="px-1 py-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body-sm)] text-[var(--app-chunks-sheet-muted)]">{labels.noTranslation}</p>
                ) : null}
              </div>
            </ExpressionSummaryGroup>
          </ExpressionSummaryCard>
        );
      })}
    </div>
  );
}
