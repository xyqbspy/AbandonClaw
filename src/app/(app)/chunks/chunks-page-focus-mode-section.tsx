"use client";

import { ClusterFocusList } from "@/features/chunks/components/cluster-focus-list";
import type {
  FocusPreviewItem,
  SavedRelationRowsBySourceId,
} from "@/features/chunks/components/types";
import type { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { chunksPageMessages as zh } from "./chunks-page-messages";

const FOCUS_MODE_SECTION_SURFACE_CLASSNAME =
  "rounded-2xl border-0 bg-white shadow-sm ring-0";

export type ChunksPageFocusModeSectionProps = {
  ready: boolean;
  rows: UserPhraseItemResponse[];
  currentFocusExpressionId: string | null;
  expandedFocusMainId: string | null;
  clusterMembersByClusterId: Map<string, UserPhraseItemResponse[]>;
  savedRelationRowsBySourceId: SavedRelationRowsBySourceId;
  currentFocusSimilarItems: FocusPreviewItem[];
  onSwitchMain: (userPhraseId: string) => void;
  onToggleExpandedMain: (userPhraseId: string) => void;
  onOpenMainDetail: (row: UserPhraseItemResponse) => void;
  onOpenMainSimilarTab: (row: UserPhraseItemResponse) => void;
  onOpenPreviewItem: (row: UserPhraseItemResponse, item: FocusPreviewItem) => void;
};

export function ChunksPageFocusModeSection({
  ready,
  rows,
  currentFocusExpressionId,
  expandedFocusMainId,
  clusterMembersByClusterId,
  savedRelationRowsBySourceId,
  currentFocusSimilarItems,
  onSwitchMain,
  onToggleExpandedMain,
  onOpenMainDetail,
  onOpenMainSimilarTab,
  onOpenPreviewItem,
}: ChunksPageFocusModeSectionProps) {
  return (
    <div className="space-y-4">
      <ClusterFocusList
        ready={ready}
        rows={rows}
        currentFocusExpressionId={currentFocusExpressionId}
        expandedFocusMainId={expandedFocusMainId}
        clusterMembersByClusterId={clusterMembersByClusterId}
        savedRelationRowsBySourceId={savedRelationRowsBySourceId}
        currentFocusSimilarItems={currentFocusSimilarItems}
        labels={{
          loading: zh.detailLoading,
          title: zh.focusModeTitle,
          expand: zh.focusExpand,
          collapse: zh.focusCollapse,
          noTranslation: zh.noTranslation,
          similarTab: zh.focusTabSimilar,
          openCurrentDetail: zh.openCurrentDetail,
        }}
        appleSurfaceClassName={FOCUS_MODE_SECTION_SURFACE_CLASSNAME}
        onToggleMain={onSwitchMain}
        onToggleExpanded={onToggleExpandedMain}
        onOpenMainDetail={onOpenMainDetail}
        onOpenMainSimilarTab={onOpenMainSimilarTab}
        onOpenPreviewItem={onOpenPreviewItem}
      />
    </div>
  );
}
