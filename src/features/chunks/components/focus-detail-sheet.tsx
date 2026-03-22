"use client";

import { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { FocusDetailRelatedItem } from "./focus-detail-selectors";
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
  canShowManualAddRelated?: boolean;
  canShowRegenerateAudio?: boolean;
  canShowRetryEnrichment?: boolean;
  canCompleteAssist?: boolean;
  completeAssistDisabled?: boolean;
  focusAssistLoading: boolean;
  openingManualAddRelated?: boolean;
  regeneratingAudio?: boolean;
  retryingEnrichment?: boolean;
  movingIntoCluster: boolean;
  ensuringMoveTargetCluster: boolean;
  detachingClusterMember: boolean;
  canSetCurrentClusterMain: boolean;
  canMoveIntoCurrentCluster: boolean;
  canSetStandaloneMain: boolean;
  primaryActionLabel?: string;
  appleButtonClassName: string;
  activeAssistItem: ManualExpressionAssistResponse["inputItem"] | null;
  isDetailSpeaking: boolean;
  detailSpeakText: string;
  similarRows: FocusDetailRelatedItem[];
  contrastRows: FocusDetailRelatedItem[];
  isSavedRelatedLoading: boolean;
  usageHint: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewHint: string;
  exampleCards: React.ReactNode;
  labels: FocusDetailSheetLabels;
  savingFocusCandidateKeys?: string[];
  completedFocusCandidateKeys?: string[];
  onOpenChange: (open: boolean) => void;
  onReopenPrevTrail: () => void;
  onFindRelations: () => void;
  onOpenManualAddRelated?: () => void;
  onRegenerateAudio?: () => void;
  onRetryEnrichment?: () => void;
  onOpenPrevSibling: () => void;
  onOpenNextSibling: () => void;
  onSetDetailActionsOpen: (open: boolean) => void;
  onRequestSetCurrentClusterMain: () => void;
  onRequestMoveIntoCluster: () => void;
  onRequestSetStandaloneMain: () => void;
  onCompleteAssist?: () => void;
  onPrimaryAction: () => void;
  onSpeak: (text: string) => void;
  onTabChange: (tab: FocusDetailTabValue) => void;
  onOpenSimilarRow: (row: FocusDetailRelatedItem) => void;
  onOpenContrastRow: (row: FocusDetailRelatedItem) => void;
  onSaveSimilarRow?: (row: FocusDetailRelatedItem) => void;
  onSaveContrastRow?: (row: FocusDetailRelatedItem) => void;
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
  canShowManualAddRelated = false,
  canShowRegenerateAudio = false,
  canShowRetryEnrichment = false,
  canCompleteAssist = false,
  completeAssistDisabled = false,
  focusAssistLoading,
  openingManualAddRelated = false,
  regeneratingAudio = false,
  retryingEnrichment = false,
  movingIntoCluster,
  ensuringMoveTargetCluster,
  detachingClusterMember,
  canSetCurrentClusterMain,
  canMoveIntoCurrentCluster,
  canSetStandaloneMain,
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
  savingFocusCandidateKeys = [],
  completedFocusCandidateKeys = [],
  onOpenChange,
  onReopenPrevTrail,
  onFindRelations,
  onOpenManualAddRelated = () => undefined,
  onRegenerateAudio = () => undefined,
  onRetryEnrichment = () => undefined,
  onOpenPrevSibling,
  onOpenNextSibling,
  onSetDetailActionsOpen,
  onRequestSetCurrentClusterMain,
  onRequestMoveIntoCluster,
  onRequestSetStandaloneMain,
  onCompleteAssist = () => undefined,
  onPrimaryAction,
  onSpeak,
  onTabChange,
  onOpenSimilarRow,
  onOpenContrastRow,
  onSaveSimilarRow = () => undefined,
  onSaveContrastRow = () => undefined,
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
            canShowSiblingNav={canShowSiblingNav}
            prevLabel={labels.prev}
            nextLabel={labels.next}
            appleButtonClassName={appleButtonClassName}
            onReopenPrevTrail={onReopenPrevTrail}
            onOpenPrevSibling={onOpenPrevSibling}
            onOpenNextSibling={onOpenNextSibling}
          />
        }
        headerClassName="border-b border-[rgb(236,238,240)] bg-[rgb(250,250,250)]"
        footer={
          <FocusDetailSheetFooter
            detail={detail}
            detailActionsOpen={detailActionsOpen}
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
            canCompleteAssist={canCompleteAssist}
            completeAssistDisabled={completeAssistDisabled}
            primaryActionLabel={primaryActionLabel}
            appleButtonClassName={appleButtonClassName}
            onSetDetailActionsOpen={onSetDetailActionsOpen}
            onRequestFindRelations={onFindRelations}
            onRequestManualAddRelated={onOpenManualAddRelated}
            onRequestRegenerateAudio={onRegenerateAudio}
            onRequestRetryEnrichment={onRetryEnrichment}
            onRequestSetCurrentClusterMain={onRequestSetCurrentClusterMain}
            onRequestMoveIntoCluster={onRequestMoveIntoCluster}
            onRequestSetStandaloneMain={onRequestSetStandaloneMain}
            onCompleteAssist={onCompleteAssist}
            onPrimaryAction={onPrimaryAction}
            moreActionsLabel={labels.detailMoreActions}
            findRelationsLabel={labels.findRelations}
            manualAddRelatedLabel={labels.detailManualAddRelated ?? "添加关联表达"}
            regenerateAudioLabel={labels.detailRegenerateAudio ?? "重新生成音频"}
            retryEnrichmentLabel={labels.detailRetryEnrichment ?? "补全当前chunk"}
            openAsMainLabel={labels.detailOpenAsMain}
            moveIntoClusterLabel={labels.moveIntoCluster}
            detachClusterMemberLabel={labels.detachClusterMember}
            completeAssistLabel={labels.completeAssist ?? "完成"}
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
            retryingEnrichment={retryingEnrichment}
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
            savingFocusCandidateKeys={savingFocusCandidateKeys}
            completedFocusCandidateKeys={completedFocusCandidateKeys}
            onSpeak={onSpeak}
            onTabChange={onTabChange}
            onOpenSimilarRow={onOpenSimilarRow}
            onOpenContrastRow={onOpenContrastRow}
            onSaveSimilarRow={onSaveSimilarRow}
            onSaveContrastRow={onSaveContrastRow}
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
