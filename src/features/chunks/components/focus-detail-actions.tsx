"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type FocusDetailActionsLabels = {
  moreActions: string;
  findRelations: string;
  manualAddRelated?: string;
  regenerateAudio?: string;
  retryEnrichment?: string;
  openAsMain: string;
  moveIntoCluster: string;
  detachClusterMember: string;
};

type FocusDetailActionsProps = {
  open: boolean;
  show: boolean;
  canShowFindRelations: boolean;
  canShowManualAddRelated: boolean;
  canShowRegenerateAudio: boolean;
  canShowRetryEnrichment: boolean;
  canSetCurrentClusterMain: boolean;
  canMoveIntoCurrentCluster: boolean;
  canSetStandaloneMain: boolean;
  focusAssistLoading: boolean;
  openingManualAddRelated: boolean;
  regeneratingAudio: boolean;
  retryingEnrichment: boolean;
  movingIntoCluster: boolean;
  ensuringMoveTargetCluster: boolean;
  detachingClusterMember: boolean;
  hasFocusDetailText: boolean;
  appleButtonClassName: string;
  labels: FocusDetailActionsLabels;
  onToggleOpen: () => void;
  onRequestFindRelations: () => void;
  onRequestManualAddRelated: () => void;
  onRequestRegenerateAudio: () => void;
  onRequestRetryEnrichment: () => void;
  onRequestSetCurrentClusterMain: () => void;
  onRequestMoveIntoCluster: () => void;
  onRequestSetStandaloneMain: () => void;
};

export function FocusDetailActions({
  open,
  show,
  canShowFindRelations,
  canShowManualAddRelated,
  canShowRegenerateAudio,
  canShowRetryEnrichment,
  canSetCurrentClusterMain,
  canMoveIntoCurrentCluster,
  canSetStandaloneMain,
  focusAssistLoading,
  openingManualAddRelated,
  regeneratingAudio,
  retryingEnrichment,
  movingIntoCluster,
  ensuringMoveTargetCluster,
  detachingClusterMember,
  hasFocusDetailText,
  appleButtonClassName,
  labels,
  onToggleOpen,
  onRequestFindRelations,
  onRequestManualAddRelated,
  onRequestRegenerateAudio,
  onRequestRetryEnrichment,
  onRequestSetCurrentClusterMain,
  onRequestMoveIntoCluster,
  onRequestSetStandaloneMain,
}: FocusDetailActionsProps) {
  if (!show) return <div />;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className={appleButtonClassName}
        onClick={onToggleOpen}
        aria-expanded={open}
      >
        {labels.moreActions}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open ? (
        <div className="absolute bottom-full left-0 z-10 mb-2 min-w-[200px] overflow-hidden rounded-2xl border border-[rgb(228,232,236)] bg-white p-1 shadow-lg">
          {canShowFindRelations ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)] disabled:text-muted-foreground"
              disabled={focusAssistLoading}
              onClick={onRequestFindRelations}
            >
              {focusAssistLoading ? `${labels.findRelations}...` : labels.findRelations}
            </button>
          ) : null}
          {canShowManualAddRelated ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)] disabled:text-muted-foreground"
              disabled={openingManualAddRelated}
              onClick={onRequestManualAddRelated}
            >
              {openingManualAddRelated
                ? `${labels.manualAddRelated ?? "添加关联表达"}...`
                : labels.manualAddRelated ?? "添加关联表达"}
            </button>
          ) : null}
          {canShowRegenerateAudio ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)] disabled:text-muted-foreground"
              disabled={regeneratingAudio}
              onClick={onRequestRegenerateAudio}
            >
              {regeneratingAudio
                ? `${labels.regenerateAudio ?? "重新生成音频"}...`
                : labels.regenerateAudio ?? "重新生成音频"}
            </button>
          ) : null}
          {canShowRetryEnrichment ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)] disabled:text-muted-foreground"
              disabled={retryingEnrichment}
              onClick={onRequestRetryEnrichment}
            >
              {retryingEnrichment
                ? `${labels.retryEnrichment ?? "补全当前chunk"}...`
                : labels.retryEnrichment ?? "补全当前chunk"}
            </button>
          ) : null}
          {canSetCurrentClusterMain ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)]"
              disabled={!hasFocusDetailText}
              onClick={onRequestSetCurrentClusterMain}
            >
              {labels.openAsMain}
            </button>
          ) : null}
          {canMoveIntoCurrentCluster ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)] disabled:text-muted-foreground"
              disabled={movingIntoCluster || ensuringMoveTargetCluster}
              onClick={onRequestMoveIntoCluster}
            >
              {movingIntoCluster || ensuringMoveTargetCluster
                ? `${labels.moveIntoCluster}...`
                : labels.moveIntoCluster}
            </button>
          ) : null}
          {canSetStandaloneMain ? (
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(246,246,246)] disabled:text-muted-foreground"
              disabled={detachingClusterMember}
              onClick={onRequestSetStandaloneMain}
            >
              {detachingClusterMember
                ? `${labels.detachClusterMember}...`
                : labels.detachClusterMember}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
