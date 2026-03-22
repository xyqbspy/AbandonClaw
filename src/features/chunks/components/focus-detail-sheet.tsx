"use client";

import { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { FocusDetailConfirm } from "./focus-detail-confirm";
import { FocusDetailContent } from "./focus-detail-content";
import { FocusDetailSheetFooter } from "./focus-detail-sheet-footer";
import { FocusDetailSheetHeader } from "./focus-detail-sheet-header";
import { FocusDetailSheetLabels } from "./focus-detail-labels";
import {
  buildFocusDetailConfirmState,
  buildFocusDetailContentLabels,
} from "./focus-detail-sheet-view-model";
import { DetailSheetShell } from "@/components/shared/detail-sheet-shell";

type FocusDetailTabValue = "info" | "similar" | "contrast";
type FocusDetailConfirmAction = "set-cluster-main" | "set-standalone-main";

type FocusDetailState = {
  text: string;
  differenceLabel?: string | null;
  kind: "current" | "library-similar" | "suggested-similar" | "contrast";
  savedItem: UserPhraseItemResponse | null;
};

type FocusDetailSheetProps = {
  open: boolean;
  detail: FocusDetailState | null;
  detailTab: FocusDetailTabValue;
  detailLoading: boolean;
  detailActionsOpen: boolean;
  detailConfirmAction: FocusDetailConfirmAction | null;
  trailLength: number;
  canShowSiblingNav: boolean;
  canShowFindRelations: boolean;
  focusAssistLoading: boolean;
  movingIntoCluster: boolean;
  ensuringMoveTargetCluster: boolean;
  detachingClusterMember: boolean;
  canSetCurrentClusterMain: boolean;
  canMoveIntoCurrentCluster: boolean;
  canSetStandaloneMain: boolean;
  savingFocusCandidate: boolean;
  primaryActionLabel?: string;
  appleButtonClassName: string;
  activeAssistItem: ManualExpressionAssistResponse["inputItem"] | null;
  isDetailSpeaking: boolean;
  detailSpeakText: string;
  similarRows: UserPhraseItemResponse[];
  contrastRows: UserPhraseItemResponse[];
  isSavedRelatedLoading: boolean;
  usageHint: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewHint: string;
  exampleCards: React.ReactNode;
  labels: FocusDetailSheetLabels;
  onOpenChange: (open: boolean) => void;
  onReopenPrevTrail: () => void;
  onFindRelations: () => void;
  onOpenPrevSibling: () => void;
  onOpenNextSibling: () => void;
  onSetDetailActionsOpen: (open: boolean) => void;
  onRequestSetCurrentClusterMain: () => void;
  onRequestMoveIntoCluster: () => void;
  onRequestSetStandaloneMain: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onSpeak: (text: string) => void;
  onTabChange: (tab: FocusDetailTabValue) => void;
  onOpenSimilarRow: (row: UserPhraseItemResponse) => void;
  onOpenContrastRow: (row: UserPhraseItemResponse) => void;
  onCloseConfirm: () => void;
  onConfirm: () => void;
};

export function FocusDetailSheet({
  open,
  detail,
  detailTab,
  detailLoading,
  detailActionsOpen,
  detailConfirmAction,
  trailLength,
  canShowSiblingNav,
  canShowFindRelations,
  focusAssistLoading,
  movingIntoCluster,
  ensuringMoveTargetCluster,
  detachingClusterMember,
  canSetCurrentClusterMain,
  canMoveIntoCurrentCluster,
  canSetStandaloneMain,
  savingFocusCandidate,
  primaryActionLabel,
  appleButtonClassName,
  activeAssistItem,
  isDetailSpeaking,
  detailSpeakText,
  similarRows,
  contrastRows,
  isSavedRelatedLoading,
  usageHint,
  typicalScenario,
  semanticFocus,
  reviewHint,
  exampleCards,
  labels,
  onOpenChange,
  onReopenPrevTrail,
  onFindRelations,
  onOpenPrevSibling,
  onOpenNextSibling,
  onSetDetailActionsOpen,
  onRequestSetCurrentClusterMain,
  onRequestMoveIntoCluster,
  onRequestSetStandaloneMain,
  onPrimaryAction,
  onSecondaryAction,
  onSpeak,
  onTabChange,
  onOpenSimilarRow,
  onOpenContrastRow,
  onCloseConfirm,
  onConfirm,
}: FocusDetailSheetProps) {
  const contentLabels = buildFocusDetailContentLabels(labels, reviewHint);
  const confirmState = buildFocusDetailConfirmState(labels, detailConfirmAction, detail);

  return (
    <>
      <DetailSheetShell
        open={open}
        onOpenChange={onOpenChange}
        ariaLabel={labels.title}
        closeLabel="关闭详情"
        panelClassName="!h-[88dvh] !min-h-[88dvh] !max-h-[88dvh] md:!h-[88vh] md:!min-h-[88vh] md:!max-h-[88vh]"
        bodyClassName="min-h-0 min-w-0 flex-1 overflow-hidden px-4 pb-4 pt-4"
        header={
          <FocusDetailSheetHeader
            title={labels.title}
            trailLength={trailLength}
            backToCurrentLabel={labels.backToCurrent}
            canShowFindRelations={canShowFindRelations}
            findRelationsLabel={labels.findRelations}
            detailLoading={detailLoading}
            focusAssistLoading={focusAssistLoading}
            canShowSiblingNav={canShowSiblingNav}
            prevLabel={labels.prev}
            nextLabel={labels.next}
            appleButtonClassName={appleButtonClassName}
            onReopenPrevTrail={onReopenPrevTrail}
            onFindRelations={onFindRelations}
            onOpenPrevSibling={onOpenPrevSibling}
            onOpenNextSibling={onOpenNextSibling}
          />
        }
        headerClassName="border-b border-[rgb(236,238,240)] bg-[rgb(250,250,250)]"
        footer={
          <FocusDetailSheetFooter
            detail={detail}
            detailActionsOpen={detailActionsOpen}
            canSetCurrentClusterMain={canSetCurrentClusterMain}
            canMoveIntoCurrentCluster={canMoveIntoCurrentCluster}
            canSetStandaloneMain={canSetStandaloneMain}
            movingIntoCluster={movingIntoCluster}
            ensuringMoveTargetCluster={ensuringMoveTargetCluster}
            detachingClusterMember={detachingClusterMember}
            savingFocusCandidate={savingFocusCandidate}
            primaryActionLabel={primaryActionLabel}
            addThisExpressionLabel={labels.addThisExpression}
            appleButtonClassName={appleButtonClassName}
            onSetDetailActionsOpen={onSetDetailActionsOpen}
            onRequestSetCurrentClusterMain={onRequestSetCurrentClusterMain}
            onRequestMoveIntoCluster={onRequestMoveIntoCluster}
            onRequestSetStandaloneMain={onRequestSetStandaloneMain}
            onPrimaryAction={onPrimaryAction}
            onSecondaryAction={onSecondaryAction}
            moreActionsLabel={labels.detailMoreActions}
            openAsMainLabel={labels.detailOpenAsMain}
            moveIntoClusterLabel={labels.moveIntoCluster}
            detachClusterMemberLabel={labels.detachClusterMember}
          />
        }
        footerClassName="border-t border-[rgb(236,238,240)] bg-[rgb(250,250,250)]"
      >
        {detail ? (
          <FocusDetailContent
            detail={detail}
            activeAssistItem={activeAssistItem}
            focusDetailTab={detailTab}
            focusDetailLoading={detailLoading}
            isDetailSpeaking={isDetailSpeaking}
            detailSpeakText={detailSpeakText}
            similarRows={similarRows}
            contrastRows={contrastRows}
            isSavedRelatedLoading={isSavedRelatedLoading}
            usageHint={usageHint}
            typicalScenario={typicalScenario}
            semanticFocus={semanticFocus}
            reviewHint={reviewHint}
            exampleCards={exampleCards}
            labels={contentLabels}
            onSpeak={onSpeak}
            onTabChange={onTabChange}
            onOpenSimilarRow={onOpenSimilarRow}
            onOpenContrastRow={onOpenContrastRow}
          />
        ) : null}
      </DetailSheetShell>

      <FocusDetailConfirm
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        text={confirmState.text}
        translation={confirmState.translation}
        confirmLabel={labels.confirmContinue}
        cancelLabel={labels.confirmCancel}
        submitting={detachingClusterMember}
        appleButtonClassName={appleButtonClassName}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
      />
    </>
  );
}
