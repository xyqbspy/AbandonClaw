"use client";

import { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { DetailSheetShell } from "@/components/shared/detail-sheet-shell";
import { FocusDetailConfirm } from "./focus-detail-confirm";
import { FocusDetailContent } from "./focus-detail-content";
import { FocusDetailSheetFooter } from "./focus-detail-sheet-footer";
import { FocusDetailSheetHeader } from "./focus-detail-sheet-header";
import { FocusDetailSheetLabels } from "./focus-detail-labels";
import {
  buildFocusDetailConfirmState,
  buildFocusDetailContentLabels,
} from "./focus-detail-sheet-view-model";
import { FocusDetailRelatedItem } from "./focus-detail-selectors";

type FocusDetailTabValue = "info" | "similar" | "contrast";
type FocusDetailConfirmAction =
  | "set-cluster-main"
  | "set-standalone-main"
  | "delete-expression";

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
  canDeleteCurrentExpression?: boolean;
  canCompleteAssist?: boolean;
  completeAssistDisabled?: boolean;
  focusAssistLoading: boolean;
  openingManualAddRelated?: boolean;
  regeneratingAudio?: boolean;
  retryingEnrichment?: boolean;
  deletingCurrentExpression?: boolean;
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
  onRequestDeleteCurrentExpression?: () => void;
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
  canDeleteCurrentExpression = false,
  canCompleteAssist = false,
  completeAssistDisabled = false,
  focusAssistLoading,
  openingManualAddRelated = false,
  regeneratingAudio = false,
  retryingEnrichment = false,
  deletingCurrentExpression = false,
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
  onRequestDeleteCurrentExpression = () => undefined,
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
        closeOnBackdropClick={false}
        showCloseButton={false}
        panelClassName="!h-[100dvh] !min-h-[100dvh] !max-h-[100dvh] rounded-none md:!h-[100vh] md:!min-h-[100vh] md:!max-h-[100vh] md:!rounded-t-[28px]"
        bodyClassName="min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden px-[var(--mobile-adapt-space-overlay)] pb-[var(--mobile-adapt-space-overlay-gap)] pt-[var(--mobile-adapt-space-sm)] [@media(max-height:760px)]:px-[var(--mobile-adapt-space-sheet)] [@media(max-height:760px)]:pb-[var(--mobile-adapt-space-sm)] [@media(max-height:760px)]:pt-[var(--mobile-adapt-space-2xs)]"
        header={
          <FocusDetailSheetHeader
            title={labels.title}
            detailText={detail?.text ?? ""}
            trailLength={trailLength}
            backToCurrentLabel={labels.backToCurrent}
            canShowSiblingNav={canShowSiblingNav}
            prevLabel={labels.prev}
            nextLabel={labels.next}
            appleButtonClassName={appleButtonClassName}
            onClose={() => onOpenChange(false)}
            onReopenPrevTrail={onReopenPrevTrail}
            onOpenPrevSibling={onOpenPrevSibling}
            onOpenNextSibling={onOpenNextSibling}
          />
        }
        headerClassName="border-b-0 bg-transparent px-[var(--mobile-adapt-space-overlay)] pb-[var(--mobile-adapt-space-sm)] pt-[var(--mobile-adapt-space-overlay)] [@media(max-height:760px)]:px-[var(--mobile-adapt-space-sheet)] [@media(max-height:760px)]:pb-[var(--mobile-adapt-space-2xs)] [@media(max-height:760px)]:pt-[var(--mobile-adapt-space-lg)]"
        footer={
          <FocusDetailSheetFooter
            detail={detail}
            detailActionsOpen={detailActionsOpen}
            canShowFindRelations={canShowFindRelations}
            canShowManualAddRelated={canShowManualAddRelated}
            canShowRegenerateAudio={canShowRegenerateAudio}
            canShowRetryEnrichment={canShowRetryEnrichment}
            canDeleteCurrentExpression={canDeleteCurrentExpression}
            canSetCurrentClusterMain={canSetCurrentClusterMain}
            canMoveIntoCurrentCluster={canMoveIntoCurrentCluster}
            canSetStandaloneMain={canSetStandaloneMain}
            focusAssistLoading={focusAssistLoading}
            openingManualAddRelated={openingManualAddRelated}
            regeneratingAudio={regeneratingAudio}
            retryingEnrichment={retryingEnrichment}
            deletingCurrentExpression={deletingCurrentExpression}
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
            onRequestDeleteCurrentExpression={onRequestDeleteCurrentExpression}
            onCompleteAssist={onCompleteAssist}
            onPrimaryAction={onPrimaryAction}
            moreActionsLabel={labels.detailMoreActions}
            findRelationsLabel={labels.findRelations}
            manualAddRelatedLabel={labels.detailManualAddRelated ?? "添加关联表达"}
            regenerateAudioLabel={labels.detailRegenerateAudio ?? "重新生成音频"}
            retryEnrichmentLabel={labels.detailRetryEnrichment ?? "补全当前 chunk"}
            deleteExpressionLabel={labels.detailDeleteExpression ?? "删除当前表达"}
            openAsMainLabel={labels.detailOpenAsMain}
            moveIntoClusterLabel={labels.moveIntoCluster}
            detachClusterMemberLabel={labels.detachClusterMember}
            completeAssistLabel={labels.completeAssist ?? "完成"}
          />
        }
        footerClassName="border-t border-[var(--app-border-soft)] !bg-white p-4"
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
        submitting={detachingClusterMember || deletingCurrentExpression}
        appleButtonClassName={appleButtonClassName}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
      />
    </>
  );
}
