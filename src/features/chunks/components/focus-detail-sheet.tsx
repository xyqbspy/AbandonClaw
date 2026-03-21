"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSheetShell } from "@/components/shared/detail-sheet-shell";
import { ManualExpressionAssistResponse, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { FocusDetailActions } from "./focus-detail-actions";
import { FocusDetailConfirm } from "./focus-detail-confirm";
import { FocusDetailContent } from "./focus-detail-content";
import { FocusDetailSheetLabels } from "./focus-detail-labels";

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
          <div className="space-y-3">
            <p className="truncate text-base font-semibold">{labels.title}</p>
            <div className="flex items-center justify-between gap-3">
              {trailLength > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`${appleButtonClassName} h-8 min-w-0 gap-1 px-2 sm:px-3`}
                  onClick={onReopenPrevTrail}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">{labels.backToCurrent}</span>
                </Button>
              ) : (
                <div className="h-8 w-8 sm:w-20" aria-hidden="true" />
              )}
              <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
                {canShowFindRelations ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={appleButtonClassName}
                    disabled={detailLoading || focusAssistLoading}
                    onClick={onFindRelations}
                  >
                    {focusAssistLoading ? `${labels.findRelations}...` : labels.findRelations}
                  </Button>
                ) : (
                  <div className="hidden h-9 min-w-[120px] sm:block" aria-hidden="true" />
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`${appleButtonClassName} ${canShowSiblingNav ? "" : "invisible pointer-events-none"}`}
                  onClick={onOpenPrevSibling}
                >
                  {labels.prev}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`${appleButtonClassName} ${canShowSiblingNav ? "" : "invisible pointer-events-none"}`}
                  onClick={onOpenNextSibling}
                >
                  {labels.next}
                </Button>
              </div>
            </div>
          </div>
        }
        headerClassName="border-b border-[rgb(236,238,240)] bg-[rgb(250,250,250)]"
        footer={
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
                moreActions: labels.detailMoreActions,
                openAsMain: labels.detailOpenAsMain,
                moveIntoCluster: labels.moveIntoCluster,
                detachClusterMember: labels.detachClusterMember,
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
                {labels.addThisExpression}
              </Button>
            )}
          </div>
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
            labels={{
              speakSentence: labels.speakSentence,
              candidateBadge: labels.detailCandidateBadge,
              noTranslation: labels.noTranslation,
              loading: labels.detailLoading,
              tabInfo: labels.detailTabInfo,
              tabSimilar: labels.detailTabSavedSimilar,
              tabContrast: labels.detailTabContrast,
              commonUsage: labels.commonUsage,
              typicalScenario: labels.typicalScenarioLabel,
              semanticFocus: labels.semanticFocusLabel,
              reviewStage: labels.reviewStage,
              usageHintFallback: labels.usageHintFallback,
              typicalScenarioPending: labels.typicalScenarioPending,
              semanticFocusPending: labels.semanticFocusPending,
              reviewHintFallback: reviewHint,
              sourceSentence: labels.sourceSentence,
              noSourceSentence: labels.noSourceSentence,
              similarHint: labels.detailSimilarHint,
              emptySimilar: labels.focusEmptySimilar,
              contrastHint: labels.detailContrastHint,
              emptyContrast: labels.noContrastExpressions,
            }}
            onSpeak={onSpeak}
            onTabChange={onTabChange}
            onOpenSimilarRow={onOpenSimilarRow}
            onOpenContrastRow={onOpenContrastRow}
          />
        ) : null}
      </DetailSheetShell>

      <FocusDetailConfirm
        open={Boolean(detailConfirmAction && detail?.savedItem)}
        title={
          detailConfirmAction === "set-cluster-main"
            ? labels.detailOpenAsMainConfirmTitle
            : labels.detachClusterMemberConfirmTitle
        }
        description={
          detailConfirmAction === "set-cluster-main"
            ? labels.detailOpenAsMainConfirmDesc
            : labels.detachClusterMemberConfirmDesc
        }
        text={detail?.savedItem?.text ?? ""}
        translation={detail?.savedItem?.translation ?? null}
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
