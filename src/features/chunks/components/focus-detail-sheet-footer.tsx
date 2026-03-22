"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FocusDetailActions } from "./focus-detail-actions";

export function FocusDetailSheetFooter({
  detail,
  detailActionsOpen,
  canSetCurrentClusterMain,
  canMoveIntoCurrentCluster,
  canSetStandaloneMain,
  movingIntoCluster,
  ensuringMoveTargetCluster,
  detachingClusterMember,
  savingFocusCandidate,
  primaryActionLabel,
  addThisExpressionLabel,
  appleButtonClassName,
  onSetDetailActionsOpen,
  onRequestSetCurrentClusterMain,
  onRequestMoveIntoCluster,
  onRequestSetStandaloneMain,
  onPrimaryAction,
  onSecondaryAction,
  moreActionsLabel,
  openAsMainLabel,
  moveIntoClusterLabel,
  detachClusterMemberLabel,
}: {
  detail: { text?: string; savedItem?: unknown | null } | null;
  detailActionsOpen: boolean;
  canSetCurrentClusterMain: boolean;
  canMoveIntoCurrentCluster: boolean;
  canSetStandaloneMain: boolean;
  movingIntoCluster: boolean;
  ensuringMoveTargetCluster: boolean;
  detachingClusterMember: boolean;
  savingFocusCandidate: boolean;
  primaryActionLabel?: ReactNode;
  addThisExpressionLabel: string;
  appleButtonClassName: string;
  onSetDetailActionsOpen: (open: boolean) => void;
  onRequestSetCurrentClusterMain: () => void;
  onRequestMoveIntoCluster: () => void;
  onRequestSetStandaloneMain: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  moreActionsLabel: string;
  openAsMainLabel: string;
  moveIntoClusterLabel: string;
  detachClusterMemberLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <FocusDetailActions
        open={detailActionsOpen}
        show={Boolean(detail) && (canSetCurrentClusterMain || canMoveIntoCurrentCluster || canSetStandaloneMain)}
        canSetCurrentClusterMain={canSetCurrentClusterMain}
        canMoveIntoCurrentCluster={canMoveIntoCurrentCluster}
        canSetStandaloneMain={canSetStandaloneMain}
        movingIntoCluster={movingIntoCluster}
        ensuringMoveTargetCluster={ensuringMoveTargetCluster}
        detachingClusterMember={detachingClusterMember}
        hasFocusDetailText={Boolean(detail?.text)}
        appleButtonClassName={appleButtonClassName}
        labels={{
          moreActions: moreActionsLabel,
          openAsMain: openAsMainLabel,
          moveIntoCluster: moveIntoClusterLabel,
          detachClusterMember: detachClusterMemberLabel,
        }}
        onToggleOpen={() => onSetDetailActionsOpen(!detailActionsOpen)}
        onRequestSetCurrentClusterMain={onRequestSetCurrentClusterMain}
        onRequestMoveIntoCluster={onRequestMoveIntoCluster}
        onRequestSetStandaloneMain={onRequestSetStandaloneMain}
      />

      {detail?.savedItem ? (
        <Button
          type="button"
          variant="ghost"
          className={appleButtonClassName}
          onClick={onPrimaryAction}
        >
          {primaryActionLabel}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className={appleButtonClassName}
          disabled={savingFocusCandidate || !detail}
          onClick={onSecondaryAction}
        >
          {addThisExpressionLabel}
        </Button>
      )}
    </div>
  );
}
