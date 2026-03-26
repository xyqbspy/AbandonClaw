"use client";

import { ReactNode } from "react";
import { LoadingState } from "@/components/shared/action-loading";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  APPLE_BODY_TEXT,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";
import {
  ManualExpressionAssistResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
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

const APPLE_CANDIDATE_BADGE =
  "border-[var(--app-border-soft)] bg-[var(--app-surface)] text-[var(--muted-foreground)]";

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
  const renderRelatedRow = (
    row: FocusDetailRelatedItem,
    kind: "similar" | "contrast",
  ) => {
    const normalized = normalizePhraseText(row.text);
    const savingKey = `${kind}:${normalized}`;
    const isSaving = Boolean(normalized) && savingFocusCandidateKeys.includes(savingKey);
    const isCompleted = Boolean(normalized) && completedFocusCandidateKeys.includes(savingKey);
    const isSaved = Boolean(row.savedItem) || isCompleted;
    const canOpenDetail = Boolean(row.savedItem);
    const actionLabel = isSaved
      ? labels.addedThisExpression ?? labels.addThisExpression ?? "已加入"
      : isSaving
        ? labels.addingThisExpression ?? labels.addThisExpression ?? "加入中..."
        : labels.addThisExpression ?? "加入表达库";

    return (
      <div key={row.key} className={`w-full p-3 ${APPLE_LIST_ITEM}`}>
        <div className="flex items-start justify-between gap-3">
          {canOpenDetail ? (
            <button
              type="button"
              className="min-w-0 flex-1 text-left transition hover:text-foreground/80"
              onClick={() =>
                kind === "similar" ? onOpenSimilarRow(row) : onOpenContrastRow(row)
              }
            >
              <p className="text-sm font-medium text-foreground">{row.text}</p>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{row.text}</p>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            variant={isSaved ? "secondary" : "ghost"}
            className="h-8 shrink-0 rounded-full px-3 text-xs"
            disabled={isSaved || isSaving}
            onClick={() => {
              if (isSaved || isSaving) return;
              if (kind === "similar") onSaveSimilarRow(row);
              else onSaveContrastRow(row);
            }}
          >
            {actionLabel}
          </Button>
        </div>

        {row.translation ? (
          <p className={`mt-1 ${APPLE_META_TEXT}`}>
            {kind === "similar" ? "（同类）" : "（对照）"}
            {row.translation}
          </p>
        ) : row.differenceLabel ? (
          <p className={`mt-1 ${APPLE_META_TEXT}`}>{row.differenceLabel}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4">
      <div className={`shrink-0 p-4 ${APPLE_PANEL}`}>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className={`min-w-0 text-lg ${APPLE_TITLE_MD}`}>{detail.text}</p>
            <div className="flex shrink-0 items-center gap-2">
              {detail.savedItem || activeAssistItem ? (
                <TtsActionButton
                  active={isDetailSpeaking}
                  onClick={() => onSpeak(detailSpeakText)}
                  className={`h-auto px-0 ${APPLE_META_TEXT} hover:text-foreground`}
                  iconClassName="size-4"
                  label={labels.speakSentence}
                />
              ) : null}
              {!detail.savedItem ? (
                <Badge variant="outline" className={APPLE_CANDIDATE_BADGE}>
                  {labels.candidateBadge}
                </Badge>
              ) : null}
            </div>
          </div>
          <p className={`text-sm ${APPLE_META_TEXT}`}>
            {retryingEnrichment
              ? labels.enriching
              : detail.savedItem?.translation ??
                activeAssistItem?.translation ??
                labels.noTranslation}
          </p>
        </div>
        {detail.differenceLabel ? (
          <p className={`mt-2 ${APPLE_META_TEXT}`}>{detail.differenceLabel}</p>
        ) : null}
      </div>

      {focusDetailLoading ? <LoadingState text={labels.loading} /> : null}
      {retryingEnrichment ? <LoadingState text={labels.enriching} /> : null}

      <Tabs
        value={focusDetailTab}
        onValueChange={(value) => onTabChange(value as FocusDetailTabValue)}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mb-3 w-full min-w-0 shrink-0 justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="info">{labels.tabInfo}</TabsTrigger>
          <TabsTrigger value="similar">{labels.tabSimilar}</TabsTrigger>
          <TabsTrigger value="contrast">{labels.tabContrast}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="info"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1"
        >
          <div className="space-y-4 pb-6">
            {retryingEnrichment ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  labels.commonUsage,
                  labels.typicalScenario,
                  labels.semanticFocus,
                  labels.reviewStage,
                ].map((title) => (
                  <div
                    key={title}
                    className={`space-y-2 p-3 ${APPLE_LIST_ITEM}`}
                    aria-label={`${title}补全中`}
                  >
                    <p className={APPLE_META_TEXT}>{title}</p>
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 w-5/6 rounded bg-[var(--app-surface-hover)]" />
                      <div className="h-3 w-2/3 rounded bg-[var(--app-surface-hover)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`space-y-1 p-3 ${APPLE_LIST_ITEM}`}>
                  <p className={APPLE_META_TEXT}>{labels.commonUsage}</p>
                  <p className={APPLE_BODY_TEXT}>{usageHint || labels.usageHintFallback}</p>
                </div>
                <div className={`space-y-1 p-3 ${APPLE_LIST_ITEM}`}>
                  <p className={APPLE_META_TEXT}>{labels.typicalScenario}</p>
                  <p className={APPLE_BODY_TEXT}>
                    {typicalScenario || labels.typicalScenarioPending}
                  </p>
                </div>
                <div className={`space-y-1 p-3 ${APPLE_LIST_ITEM}`}>
                  <p className={APPLE_META_TEXT}>{labels.semanticFocus}</p>
                  <p className={APPLE_BODY_TEXT}>
                    {semanticFocus || labels.semanticFocusPending}
                  </p>
                </div>
                <div className={`space-y-1 p-3 ${APPLE_LIST_ITEM}`}>
                  <p className={APPLE_META_TEXT}>{labels.reviewStage}</p>
                  <p className={APPLE_BODY_TEXT}>{reviewHint || labels.reviewHintFallback}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className={APPLE_META_TEXT}>{labels.sourceSentence}</p>
              {retryingEnrichment ? (
                <div className={`animate-pulse p-3 ${APPLE_LIST_ITEM}`} aria-label="例句补全中">
                  <div className="h-4 w-4/5 rounded bg-[var(--app-surface-hover)]" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-[var(--app-surface-hover)]" />
                </div>
              ) : (
                exampleCards ?? <p className={APPLE_BODY_TEXT}>{labels.noSourceSentence}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="similar"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1"
        >
          <div className="space-y-2 pb-6">
            <p className={APPLE_META_TEXT}>{labels.similarHint}</p>
            {similarRows.length > 0 ? (
              similarRows.slice(0, 12).map((row) => renderRelatedRow(row, "similar"))
            ) : isSavedRelatedLoading ? (
              <LoadingState text={labels.loading} />
            ) : (
              <p className={APPLE_BODY_TEXT}>{labels.emptySimilar}</p>
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="contrast"
          className="mt-0 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-1"
        >
          <div className="space-y-2 pb-6">
            <p className={APPLE_META_TEXT}>{labels.contrastHint}</p>
            {contrastRows.length > 0 ? (
              contrastRows.slice(0, 12).map((row) => renderRelatedRow(row, "contrast"))
            ) : isSavedRelatedLoading ? (
              <LoadingState text={labels.loading} />
            ) : (
              <p className={APPLE_BODY_TEXT}>{labels.emptyContrast}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
