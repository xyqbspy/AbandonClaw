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

const CANDIDATE_BADGE_CLASS =
  "border-[var(--app-chunks-sheet-info-border)] bg-[var(--app-chunks-sheet-info-soft)] text-[var(--app-chunks-sheet-info-text)]";
const DETAIL_CARD_CLASS =
  "relative overflow-hidden rounded-[var(--mobile-adapt-overlay-radius)] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] px-[var(--mobile-adapt-space-xl)] py-[var(--mobile-adapt-space-xl)] shadow-[var(--app-chunks-sheet-card-shadow)]";
const BODY_CLASS =
  "text-[length:var(--mobile-font-sheet-body)] leading-[var(--mobile-adapt-overlay-body-line-height)] text-[var(--app-chunks-sheet-body)]";
const RELATED_ROW_CLASS =
  "rounded-[var(--mobile-adapt-overlay-card-radius)] border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-card-bg)] px-[var(--mobile-adapt-space-sheet)] py-[var(--mobile-adapt-overlay-related-row-py)] shadow-[var(--app-shadow-soft)]";
const RELATED_TEXT_CLASS =
  "text-[length:var(--mobile-adapt-overlay-body)] font-bold text-[var(--app-chunks-sheet-title)]";

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
        <div key={row.key} className={RELATED_ROW_CLASS}>
          <div className="flex items-start justify-between gap-[var(--mobile-adapt-space-sm)]">
            {canOpenDetail ? (
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpenContrastRow(row)}
              >
                <span className={RELATED_TEXT_CLASS}>{row.text}</span>
              </button>
            ) : (
              <span className={RELATED_TEXT_CLASS}>{row.text}</span>
            )}
            {!isSaved ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-[var(--mobile-control-height)] rounded-full border border-[var(--app-chunks-sheet-secondary-border)] bg-[var(--app-chunks-sheet-info-soft)] px-[var(--mobile-space-md)] text-[length:var(--mobile-font-caption)] text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-[var(--app-chunks-sheet-secondary-hover)]"
                disabled={isSaving}
                onClick={() => onSaveContrastRow(row)}
              >
                {actionLabel}
              </Button>
            ) : (
              <span className="inline-flex size-[var(--mobile-icon-button)] items-center justify-center rounded-full bg-[var(--app-chunks-sheet-success-soft)] text-[length:var(--mobile-font-body)] text-[var(--app-chunks-sheet-success-text)]">
                ✓
              </span>
            )}
          </div>
          <p className="mt-1 text-[length:var(--mobile-font-body-sm)] text-[var(--app-chunks-sheet-muted)]">
            {row.translation ?? row.differenceLabel ?? labels.emptyContrast}
          </p>
        </div>
      );
    }

    return (
      <div key={row.key} className={RELATED_ROW_CLASS}>
        <div className="flex items-start justify-between gap-[var(--mobile-adapt-space-sm)]">
          {canOpenDetail ? (
            <button
              type="button"
              className="min-w-0 flex-1 text-left transition hover:opacity-80"
              onClick={() => onOpenSimilarRow(row)}
            >
              <p className={RELATED_TEXT_CLASS}>{row.text}</p>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className={RELATED_TEXT_CLASS}>{row.text}</p>
            </div>
          )}
          {isSaved ? (
            <span className="inline-flex size-[var(--mobile-icon-button)] shrink-0 items-center justify-center rounded-full bg-[var(--app-chunks-sheet-success-soft)] text-[length:var(--mobile-font-body)] text-[var(--app-chunks-sheet-success-text)]">
              ✓           </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={actionLabel}
              className="size-[var(--mobile-icon-button)] shrink-0 rounded-full bg-[var(--app-chunks-sheet-success-soft)] px-0 text-[length:var(--mobile-font-body)] text-[var(--app-chunks-sheet-success-text)] shadow-none hover:bg-[var(--app-chunks-sheet-success-hover)]"
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
        <p className="mt-1 text-[length:var(--mobile-font-body-sm)] text-[var(--app-chunks-sheet-muted)]">
          {row.translation ?? row.differenceLabel ?? labels.emptySimilar}
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-[var(--mobile-adapt-space-md)] bg-[var(--app-chunks-sheet-bg)] [@media(max-height:760px)]:gap-[var(--mobile-adapt-space-sm)]">
      <div className={`${DETAIL_CARD_CLASS} shrink-0`}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-6px] top-[-18px] text-[112px] leading-none text-[var(--app-chunks-sheet-info-soft)] [@media(max-height:760px)]:hidden"
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
              <p className="truncate text-[length:clamp(1.25rem,6vw,1.625rem)] font-[850] tracking-[-0.05em] text-[var(--app-chunks-sheet-title)] [@media(max-height:760px)]:text-[length:clamp(1.05rem,5.2vw,1.25rem)] [@media(max-height:760px)]:leading-tight">
                {detail.text}
              </p>
            </div>
            {detail.savedItem ? (
              <TtsActionButton
                active={isDetailSpeaking}
                onClick={() => onSpeak(detailSpeakText)}
                label={labels.speakSentence}
                ariaLabel={labels.speakSentence}
                className="h-[var(--mobile-control-height)] rounded-full border border-[var(--app-chunks-sheet-secondary-border)] bg-[var(--app-chunks-sheet-info-soft)] px-[var(--mobile-space-xl)] text-[var(--app-chunks-sheet-secondary-text)] shadow-none hover:bg-[var(--app-chunks-sheet-secondary-hover)] [@media(max-height:760px)]:h-[var(--mobile-icon-button)] [@media(max-height:760px)]:px-[var(--mobile-space-md)] [@media(max-height:760px)]:text-[length:var(--mobile-font-caption)]"
                iconClassName="size-4"
              />
            ) : null}
          </div>
          <p className="text-[length:clamp(0.95rem,4.2vw,1.125rem)] font-medium text-[var(--app-chunks-sheet-muted)] [@media(max-height:760px)]:text-[length:var(--mobile-font-body)] [@media(max-height:760px)]:leading-5">
            {retryingEnrichment
              ? labels.enriching
              : detail.savedItem?.translation ??
                activeAssistItem?.translation ??
                labels.noTranslation}
          </p>
        </div>
        {detail.differenceLabel ? (
          <p className="mt-3 text-[length:var(--mobile-font-body-sm)] leading-5 text-[var(--app-chunks-sheet-muted)] [@media(max-height:760px)]:mt-2">{detail.differenceLabel}</p>
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
          <p className="mb-3 shrink-0 px-1 text-[length:var(--mobile-font-body-sm)] leading-6 text-[var(--app-chunks-sheet-muted)] [@media(max-height:760px)]:mb-1.5 [@media(max-height:760px)]:text-[length:var(--mobile-font-meta)] [@media(max-height:760px)]:leading-4">
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
                  <div className="rounded-[var(--mobile-adapt-overlay-card-radius)] bg-[var(--app-chunks-sheet-info-bg)] px-[var(--mobile-adapt-space-xl)] py-[var(--mobile-adapt-space-lg)]">
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
              <p className="text-[length:var(--mobile-font-body)] font-semibold text-[var(--app-chunks-sheet-title)]">📖 {labels.sourceSentence}</p>
              {retryingEnrichment ? (
                <div
                  className="animate-pulse rounded-[var(--mobile-adapt-overlay-card-radius)] border border-[var(--app-chunks-sheet-info-border)] bg-[var(--app-chunks-sheet-card-bg)] p-[var(--mobile-adapt-space-xl)]"
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
