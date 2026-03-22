"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center justify-between gap-2">
      <FocusDetailActions
        open={detailActionsOpen}
        show={Boolean(detail) && (canShowFindRelations || canShowManualAddRelated || canShowRegenerateAudio || canShowRetryEnrichment || canSetCurrentClusterMain || canMoveIntoCurrentCluster || canSetStandaloneMain)}
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

      <div className="flex items-center gap-2">
        {canCompleteAssist ? (
          <Button
            type="button"
            variant="ghost"
            className={appleButtonClassName}
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
            className={appleButtonClassName}
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
