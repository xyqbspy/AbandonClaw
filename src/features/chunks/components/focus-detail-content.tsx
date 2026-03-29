"use client";

import { ReactNode } from "react";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import {
  SegmentedTabs,
  SegmentedTabsContent,
  SegmentedTabsList,
  SegmentedTabsTrigger,
} from "@/components/shared/segmented-tabs";
import { LoadingState } from "@/components/shared/action-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  ManualExpressionAssistResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import {
  DetailInfoBlock,
  DetailLoadingBlock,
  DetailStageBlock,
} from "./detail-info-blocks";
import { FocusDetailRelatedItem } from "./focus-detail-selectors";

type FocusDetailTabValue = "info" | "similar" | "contrast";

type FocusDetailContentState = {
  text: string;
  differenceLabel?: string | null;
  kind: "current" | "library-similar" | "suggested-similar" | "contrast";
  savedItem: UserPhraseItemResponse | null;
};

type FocusDetailContentLabels = {
  speakSentence: string;
  candidateBadge: string;
  noTranslation: string;
  loading: string;
  enriching: string;
  tabInfo: string;
  tabSimilar: string;
  tabContrast: string;
  commonUsage: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewStage: string;
  usageHintFallback: string;
  typicalScenarioPending: string;
  semanticFocusPending: string;
  reviewHintFallback: string;
  sourceSentence: string;
  noSourceSentence: string;
  similarHint: string;
  emptySimilar: string;
  contrastHint: string;
  emptyContrast: string;
  addThisExpression?: string;
  addingThisExpression?: string;
  addedThisExpression?: string;
};

type FocusDetailContentProps = {
  detail: FocusDetailContentState;
  activeAssistItem: ManualExpressionAssistResponse["inputItem"] | null;
  focusDetailTab: FocusDetailTabValue;
  focusDetailLoading: boolean;
  retryingEnrichment?: boolean;
  isDetailSpeaking: boolean;
  detailSpeakText: string;
  similarRows: FocusDetailRelatedItem[];
  contrastRows: FocusDetailRelatedItem[];
  isSavedRelatedLoading: boolean;
  usageHint: string;
  typicalScenario: string;
  semanticFocus: string;
  reviewHint: string;
  exampleCards: ReactNode;
  labels: FocusDetailContentLabels;
  savingFocusCandidateKeys?: string[];
  completedFocusCandidateKeys?: string[];
  onSpeak: (text: string) => void;
  onTabChange: (tab: FocusDetailTabValue) => void;
  onOpenSimilarRow: (row: FocusDetailRelatedItem) => void;
  onOpenContrastRow: (row: FocusDetailRelatedItem) => void;
  onSaveSimilarRow?: (row: FocusDetailRelatedItem) => void;
  onSaveContrastRow?: (row: FocusDetailRelatedItem) => void;
};

const CANDIDATE_BADGE_CLASS = "border-[#DCE8F5] bg-[#EEF3FC] text-[#2C6E9E]";
const DETAIL_CARD_CLASS =
  "relative overflow-hidden rounded-[32px] border border-[#E6EDF6] bg-white px-[var(--mobile-space-xl)] py-[var(--mobile-space-xl)] shadow-[0_20px_40px_-10px_rgba(49,130,206,0.15)]";
const BODY_CLASS =
  "text-[length:var(--mobile-font-sheet-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[#2C4F6E]";

function getRelatedActionLabel(
  labels: FocusDetailContentLabels,
  isSaved: boolean,
  isSaving: boolean,
) {
  if (isSaved) return labels.addedThisExpression ?? labels.addThisExpression ?? "已加入";
  if (isSaving) return labels.addingThisExpression ?? labels.addThisExpression ?? "加入中...";
  return labels.addThisExpression ?? "加入表达库";
}

export function FocusDetailContent({
  detail,
  activeAssistItem,
  focusDetailTab,
  focusDetailLoading,
  retryingEnrichment = false,
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
  onSpeak,
  onTabChange,
  onOpenSimilarRow,
  onOpenContrastRow,
  onSaveSimilarRow = () => undefined,
  onSaveContrastRow = () => undefined,
}: FocusDetailContentProps) {
  const renderRelatedRow = (row: FocusDetailRelatedItem, kind: "similar" | "contrast") => {
    const normalized = normalizePhraseText(row.text);
    const savingKey = `${kind}:${normalized}`;
    const isSaving = Boolean(normalized) && savingFocusCandidateKeys.includes(savingKey);
    const isCompleted = Boolean(normalized) && completedFocusCandidateKeys.includes(savingKey);
    const isSaved = Boolean(row.savedItem) || isCompleted;
    const canOpenDetail = Boolean(row.savedItem);
    const actionLabel = getRelatedActionLabel(labels, isSaved, isSaving);

    if (kind === "contrast") {
      return (
        <div
          key={row.key}
          className="rounded-[22px] border border-[#FCFCFD] bg-white px-[var(--mobile-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3">
            {canOpenDetail ? (
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpenContrastRow(row)}
              >
                <span className="text-[clamp(15px,4vw,17px)] font-bold text-[#2D3748]">{row.text}</span>
              </button>
            ) : (
              <span className="text-[clamp(15px,4vw,17px)] font-bold text-[#2D3748]">{row.text}</span>
            )}
            {!isSaved ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-[var(--mobile-control-height)] rounded-full border border-[#E6EDF6] bg-[#F0F4FC] px-[var(--mobile-space-md)] text-[length:var(--mobile-font-caption)] text-[#2C5A7A] shadow-none hover:bg-[#E4ECF6]"
                disabled={isSaving}
                onClick={() => onSaveContrastRow(row)}
              >
                {actionLabel}
              </Button>
            ) : (
              <span className="inline-flex size-[var(--mobile-icon-button)] items-center justify-center rounded-full bg-[#F0FFF4] text-[length:var(--mobile-font-body)] text-[#38A169]">
                ✓
              </span>
            )}
          </div>
          <p className="mt-1 text-[length:var(--mobile-font-body-sm)] text-[#718096]">
            {row.translation ?? row.differenceLabel ?? labels.emptyContrast}
          </p>
        </div>
      );
    }

    return (
      <div
        key={row.key}
        className="rounded-[22px] border border-[#FCFCFD] bg-white px-[var(--mobile-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-start justify-between gap-3">
          {canOpenDetail ? (
            <button
              type="button"
              className="min-w-0 flex-1 text-left transition hover:text-[#1F4F6E]/80"
              onClick={() => onOpenSimilarRow(row)}
            >
              <p className="text-[clamp(15px,4vw,17px)] font-bold text-[#2D3748]">{row.text}</p>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-[clamp(15px,4vw,17px)] font-bold text-[#2D3748]">{row.text}</p>
            </div>
          )}
          {isSaved ? (
            <span className="inline-flex size-[var(--mobile-icon-button)] shrink-0 items-center justify-center rounded-full bg-[#F0FFF4] text-[length:var(--mobile-font-body)] text-[#38A169]">
              ✓           </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={actionLabel}
              className="size-[var(--mobile-icon-button)] shrink-0 rounded-full bg-[#F0FFF4] px-0 text-[length:var(--mobile-font-body)] text-[#38A169] shadow-none hover:bg-[#E6FFFA]"
              disabled={isSaving}
              onClick={() => {
                if (isSaving) return;
                onSaveSimilarRow(row);
              }}
            >
              {isSaving ? "…" : "+"}
            </Button>
          )}
        </div>
        <p className="mt-1 text-[length:var(--mobile-font-body-sm)] text-[#718096]">
          {row.translation ?? row.differenceLabel ?? labels.emptySimilar}
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 bg-[#F2F2F7] [@media(max-height:760px)]:gap-2.5">
      <div className={`${DETAIL_CARD_CLASS} shrink-0`}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-6px] top-[-18px] text-[112px] leading-none text-[#F7FAFC] [@media(max-height:760px)]:hidden"
        >
          &quot;
        </span>
        <div className="space-y-4 border-[#EFF3FC] [@media(max-height:760px)]:space-y-2">
          <div className="flex items-start justify-between gap-4 [@media(max-height:760px)]:gap-2.5">
            <div className="min-w-0 flex-1">
              {!detail.savedItem ? (
                <Badge className={`mb-2 rounded-full border px-[var(--mobile-space-md)] py-[var(--mobile-space-xs)] text-[length:var(--mobile-font-caption)] font-semibold ${CANDIDATE_BADGE_CLASS}`}>
                  {labels.candidateBadge}
                </Badge>
              ) : null}
              <p className="truncate text-[clamp(22px,6vw,26px)] font-[850] tracking-[-0.05em] text-[#1A365D] [@media(max-height:760px)]:text-[clamp(18px,5.2vw,20px)] [@media(max-height:760px)]:leading-tight">
                {detail.text}
              </p>
            </div>
            {detail.savedItem ? (
              <TtsActionButton
                active={isDetailSpeaking}
                onClick={() => onSpeak(detailSpeakText)}
                label={labels.speakSentence}
                ariaLabel={labels.speakSentence}
                className="h-[var(--mobile-control-height)] rounded-full border border-[#E6EDF6] bg-[#F0F4FC] px-[var(--mobile-space-xl)] text-[#2C5A7A] shadow-none hover:bg-[#E4ECF6] [@media(max-height:760px)]:h-[var(--mobile-icon-button)] [@media(max-height:760px)]:px-[var(--mobile-space-md)] [@media(max-height:760px)]:text-[length:var(--mobile-font-caption)]"
                iconClassName="size-4"
              />
            ) : null}
          </div>
          <p className="text-[clamp(15px,4.2vw,18px)] font-medium text-[#718096] [@media(max-height:760px)]:text-[length:var(--mobile-font-body)] [@media(max-height:760px)]:leading-5">
            {retryingEnrichment
              ? labels.enriching
              : detail.savedItem?.translation ??
                activeAssistItem?.translation ??
                labels.noTranslation}
          </p>
        </div>
        {detail.differenceLabel ? (
          <p className="mt-3 text-[length:var(--mobile-font-body-sm)] leading-5 text-[#718096] [@media(max-height:760px)]:mt-2">{detail.differenceLabel}</p>
        ) : null}
      </div>

      {focusDetailLoading ? <LoadingState text={labels.loading} /> : null}
      {retryingEnrichment ? <LoadingState text={labels.enriching} /> : null}

      <SegmentedTabs
        value={focusDetailTab}
        onValueChange={(value) => onTabChange(value as FocusDetailTabValue)}
        className="min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        <SegmentedTabsList className="mb-1 shrink-0 [@media(max-height:760px)]:mb-0">
          <SegmentedTabsTrigger value="info">{labels.tabInfo}</SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="similar">{labels.tabSimilar}</SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="contrast">{labels.tabContrast}</SegmentedTabsTrigger>
        </SegmentedTabsList>

        {focusDetailTab === "similar" || focusDetailTab === "contrast" ? (
          <p className="mb-3 shrink-0 px-1 text-[length:var(--mobile-font-body-sm)] leading-6 text-[#718096] [@media(max-height:760px)]:mb-1.5 [@media(max-height:760px)]:text-[length:var(--mobile-font-meta)] [@media(max-height:760px)]:leading-4">
            {focusDetailTab === "similar" ? labels.similarHint : labels.contrastHint}
          </p>
        ) : null}

        <SegmentedTabsContent value="info" className="mt-0 min-h-0 w-full flex-1 overflow-y-auto px-1">
          <div className="space-y-4 pb-6 [@media(max-height:760px)]:space-y-3 [@media(max-height:760px)]:pb-4">
            {retryingEnrichment ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[labels.commonUsage, labels.typicalScenario, labels.semanticFocus, labels.reviewStage].map(
                  (title) => (
                    <DetailLoadingBlock key={title} title={title} />
                  ),
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <DetailInfoBlock title={labels.semanticFocus} icon={<span>🎯</span>}>
                  <div className="rounded-[20px] bg-[#F0F6FE] px-[var(--mobile-space-xl)] py-[var(--mobile-space-lg)]">
                    <p className={BODY_CLASS}>{semanticFocus || labels.semanticFocusPending}</p>
                  </div>
                </DetailInfoBlock>
                <DetailStageBlock title={labels.reviewStage}>
                  {reviewHint || labels.reviewHintFallback}
                </DetailStageBlock>
                <DetailInfoBlock title={labels.commonUsage}>
                  <p className={BODY_CLASS}>{usageHint || labels.usageHintFallback}</p>
                </DetailInfoBlock>
                <DetailInfoBlock title={labels.typicalScenario}>
                  <p className={BODY_CLASS}>{typicalScenario || labels.typicalScenarioPending}</p>
                </DetailInfoBlock>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[length:var(--mobile-font-body)] font-semibold text-[#1F4B6E]">📖 {labels.sourceSentence}</p>
              {retryingEnrichment ? (
                <div
                  className="animate-pulse rounded-[24px] border border-[#EEF3FC] bg-[#FAFDFF] p-[var(--mobile-space-xl)]"
                  aria-label="例句补全中"
                >
                  <div className="h-4 w-4/5 rounded bg-[var(--app-surface-hover)]" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-[var(--app-surface-hover)]" />
                </div>
              ) : (
                exampleCards ?? <p className={BODY_CLASS}>{labels.noSourceSentence}</p>
              )}
            </div>
          </div>
        </SegmentedTabsContent>

        <SegmentedTabsContent
          value="similar"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto px-1"
        >
          <div className="space-y-3 pb-6 [@media(max-height:760px)]:pb-4">
            {similarRows.length > 0 ? (
              similarRows.slice(0, 12).map((row) => renderRelatedRow(row, "similar"))
            ) : isSavedRelatedLoading ? (
              <LoadingState text={labels.loading} />
            ) : (
              <p className={BODY_CLASS}>{labels.emptySimilar}</p>
            )}
          </div>
        </SegmentedTabsContent>

        <SegmentedTabsContent
          value="contrast"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto px-1"
        >
          <div className="space-y-3 pb-6 [@media(max-height:760px)]:pb-4">
            {contrastRows.length > 0 ? (
              <div className="space-y-3">
                {contrastRows.slice(0, 12).map((row) => renderRelatedRow(row, "contrast"))}
              </div>
            ) : isSavedRelatedLoading ? (
              <LoadingState text={labels.loading} />
            ) : (
              <p className={BODY_CLASS}>{labels.emptyContrast}</p>
            )}
          </div>
        </SegmentedTabsContent>
      </SegmentedTabs>
    </div>
  );
}
