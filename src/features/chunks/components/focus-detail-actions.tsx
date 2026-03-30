"use client";

import { ChevronDown, MoreHorizontal } from "lucide-react";
import { LoadingContent } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { APPLE_PANEL_RAISED } from "@/lib/ui/apple-style";

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
  compactTrigger?: boolean;
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
  compactTrigger = false,
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

  const menuItemClassName =
    "flex w-full items-center rounded-[var(--mobile-adapt-overlay-card-radius)] px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-sm)] text-left text-[length:var(--mobile-adapt-font-body-sm)] text-[var(--app-chunks-sheet-body)] transition hover:bg-[var(--app-chunks-sheet-info-soft)] disabled:text-muted-foreground";

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className={
          compactTrigger
            ? `${appleButtonClassName} h-[var(--mobile-adapt-button-height)] w-[var(--mobile-adapt-button-height)] rounded-[var(--mobile-adapt-overlay-card-radius)] border-0 bg-[var(--app-chunks-sheet-secondary-bg)] px-0 text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-[var(--app-chunks-sheet-secondary-hover)]`
            : `${appleButtonClassName} h-[var(--mobile-adapt-control-height)] rounded-full border border-[var(--app-chunks-sheet-secondary-border)] bg-[var(--app-chunks-sheet-info-soft)] px-[var(--mobile-adapt-space-lg)] text-[length:var(--mobile-adapt-font-body-sm)] text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-[var(--app-chunks-sheet-secondary-hover)]`
        }
        onClick={onToggleOpen}
        aria-expanded={open}
        aria-label={labels.moreActions}
      >
        {compactTrigger ? (
          <>
            <MoreHorizontal className="size-[clamp(18px,4.8vw,20px)]" />
            <span className="sr-only">{labels.moreActions}</span>
          </>
        ) : (
          <>
            {labels.moreActions}
            <ChevronDown
              className={`size-[clamp(14px,3.8vw,16px)] transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </Button>

      {open ? (
        <div className={`absolute bottom-full left-0 z-10 mb-[var(--mobile-adapt-space-sm)] min-w-[clamp(208px,56vw,240px)] overflow-hidden rounded-[var(--mobile-adapt-overlay-radius)] p-[var(--mobile-adapt-space-sm)] ${APPLE_PANEL_RAISED}`}>
          {canShowFindRelations ? (
            <button
              type="button"
              className={menuItemClassName}
              disabled={focusAssistLoading}
              onClick={onRequestFindRelations}
            >
              <LoadingContent loading={focusAssistLoading} loadingText={`${labels.findRelations}...`}>
                {labels.findRelations}
              </LoadingContent>
            </button>
          ) : null}
          {canShowManualAddRelated ? (
            <button
              type="button"
              className={menuItemClassName}
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
              className={menuItemClassName}
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
              className={menuItemClassName}
              disabled={retryingEnrichment}
              onClick={onRequestRetryEnrichment}
            >
              {retryingEnrichment
                ? `${labels.retryEnrichment ?? "补全当前 chunk"}...`
                : labels.retryEnrichment ?? "补全当前 chunk"}
            </button>
          ) : null}
          {canSetCurrentClusterMain ? (
            <button
              type="button"
              className={menuItemClassName}
              disabled={!hasFocusDetailText}
              onClick={onRequestSetCurrentClusterMain}
            >
              {labels.openAsMain}
            </button>
          ) : null}
          {canMoveIntoCurrentCluster ? (
            <button
              type="button"
              className={menuItemClassName}
              disabled={movingIntoCluster || ensuringMoveTargetCluster}
              onClick={onRequestMoveIntoCluster}
            >
              <LoadingContent
                loading={movingIntoCluster || ensuringMoveTargetCluster}
                loadingText={`${labels.moveIntoCluster}...`}
              >
                {labels.moveIntoCluster}
              </LoadingContent>
            </button>
          ) : null}
          {canSetStandaloneMain ? (
            <button
              type="button"
              className={menuItemClassName}
              disabled={detachingClusterMember}
              onClick={onRequestSetStandaloneMain}
            >
              <LoadingContent
                loading={detachingClusterMember}
                loadingText={`${labels.detachClusterMember}...`}
              >
                {labels.detachClusterMember}
              </LoadingContent>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
