"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DetailActionBar } from "./detail-action-bar";
import { FocusDetailActions } from "./focus-detail-actions";

export function FocusDetailSheetFooter({
  detail,
  detailActionsOpen,
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
  canCompleteAssist,
  completeAssistDisabled,
  primaryActionLabel,
  appleButtonClassName,
  onSetDetailActionsOpen,
  onRequestFindRelations,
  onRequestManualAddRelated,
  onRequestRegenerateAudio,
  onRequestRetryEnrichment,
  onRequestSetCurrentClusterMain,
  onRequestMoveIntoCluster,
  onRequestSetStandaloneMain,
  onCompleteAssist,
  onPrimaryAction,
  moreActionsLabel,
  findRelationsLabel,
  manualAddRelatedLabel,
  regenerateAudioLabel,
  retryEnrichmentLabel,
  openAsMainLabel,
  moveIntoClusterLabel,
  detachClusterMemberLabel,
  completeAssistLabel,
}: {
  detail: { text?: string; savedItem?: unknown | null } | null;
  detailActionsOpen: boolean;
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
  canCompleteAssist: boolean;
  completeAssistDisabled: boolean;
  primaryActionLabel?: ReactNode;
  appleButtonClassName: string;
  onSetDetailActionsOpen: (open: boolean) => void;
  onRequestFindRelations: () => void;
  onRequestManualAddRelated: () => void;
  onRequestRegenerateAudio: () => void;
  onRequestRetryEnrichment: () => void;
  onRequestSetCurrentClusterMain: () => void;
  onRequestMoveIntoCluster: () => void;
  onRequestSetStandaloneMain: () => void;
  onCompleteAssist: () => void;
  onPrimaryAction: () => void;
  moreActionsLabel: string;
  findRelationsLabel: string;
  manualAddRelatedLabel: string;
  regenerateAudioLabel: string;
  retryEnrichmentLabel: string;
  openAsMainLabel: string;
  moveIntoClusterLabel: string;
  detachClusterMemberLabel: string;
  completeAssistLabel: string;
}) {
  return (
    <DetailActionBar
      leading={
        <FocusDetailActions
          open={detailActionsOpen}
          show={
            Boolean(detail) &&
            (canShowFindRelations ||
              canShowManualAddRelated ||
              canShowRegenerateAudio ||
              canShowRetryEnrichment ||
              canSetCurrentClusterMain ||
              canMoveIntoCurrentCluster ||
              canSetStandaloneMain)
          }
          canShowFindRelations={canShowFindRelations}
          canShowManualAddRelated={canShowManualAddRelated}
          canShowRegenerateAudio={canShowRegenerateAudio}
          canShowRetryEnrichment={canShowRetryEnrichment}
          canSetCurrentClusterMain={canSetCurrentClusterMain}
          canMoveIntoCurrentCluster={canMoveIntoCurrentCluster}
          canSetStandaloneMain={canSetStandaloneMain}
          focusAssistLoading={focusAssistLoading}
          openingManualAddRelated={openingManualAddRelated}
          regeneratingAudio={regeneratingAudio}
          retryingEnrichment={retryingEnrichment}
          movingIntoCluster={movingIntoCluster}
          ensuringMoveTargetCluster={ensuringMoveTargetCluster}
          detachingClusterMember={detachingClusterMember}
          hasFocusDetailText={Boolean(detail?.text)}
          appleButtonClassName={appleButtonClassName}
          compactTrigger
          labels={{
            moreActions: moreActionsLabel,
            findRelations: findRelationsLabel,
            manualAddRelated: manualAddRelatedLabel,
            regenerateAudio: regenerateAudioLabel,
            retryEnrichment: retryEnrichmentLabel,
            openAsMain: openAsMainLabel,
            moveIntoCluster: moveIntoClusterLabel,
            detachClusterMember: detachClusterMemberLabel,
          }}
          onToggleOpen={() => onSetDetailActionsOpen(!detailActionsOpen)}
          onRequestFindRelations={onRequestFindRelations}
          onRequestManualAddRelated={onRequestManualAddRelated}
          onRequestRegenerateAudio={onRequestRegenerateAudio}
          onRequestRetryEnrichment={onRequestRetryEnrichment}
          onRequestSetCurrentClusterMain={onRequestSetCurrentClusterMain}
          onRequestMoveIntoCluster={onRequestMoveIntoCluster}
          onRequestSetStandaloneMain={onRequestSetStandaloneMain}
        />
      }
      trailing={
        <>
          {canCompleteAssist ? (
            <Button
              type="button"
              variant="ghost"
              className={`${appleButtonClassName} h-[var(--mobile-adapt-overlay-footer-button-height)] rounded-[var(--mobile-adapt-overlay-footer-button-radius)] border-0 bg-[#EDF2F7] px-[var(--mobile-space-sheet)] text-[#2C5A7A] shadow-none hover:bg-[#E4ECF6] [@media(max-height:760px)]:h-[var(--mobile-control-height)] [@media(max-height:760px)]:px-[var(--mobile-space-lg)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]`}
              disabled={completeAssistDisabled}
              onClick={onCompleteAssist}
            >
              {completeAssistLabel}
            </Button>
          ) : null}
          {detail?.savedItem ? (
            <Button
              type="button"
              variant="ghost"
              className={`${appleButtonClassName} h-[var(--mobile-adapt-overlay-footer-button-height)] min-w-0 flex-1 rounded-[var(--mobile-adapt-overlay-footer-button-radius)] bg-[#1A365D] px-[clamp(16px,4vw,28px)] text-[length:var(--mobile-font-sheet-body)] font-semibold text-white shadow-[0_10px_25px_rgba(26,54,93,0.2)] hover:bg-[#132A46] [@media(max-height:760px)]:h-[var(--mobile-control-height)] [@media(max-height:760px)]:px-[var(--mobile-space-xl)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body-sm)]`}
              aria-label={typeof primaryActionLabel === "string" ? primaryActionLabel : undefined}
              onClick={onPrimaryAction}
            >
              <span aria-hidden="true">📝</span>
              <span>{primaryActionLabel}</span>
            </Button>
          ) : null}
        </>
      }
    />
  );
}


