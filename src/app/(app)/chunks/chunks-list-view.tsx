"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { LoadingButton } from "@/components/shared/action-loading";
import { PhraseReviewStatus, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ExpressionSummaryCard,
  ExpressionSummaryGroup,
  ExpressionSummaryRelatedItem,
} from "@/features/chunks/components/expression-summary-card";
import {
  APPLE_BADGE_INFO,
  APPLE_BADGE_SUBTLE,
  APPLE_BODY_TEXT,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_INFO,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";

const LIST_WRAPPER_CLASS = "flex flex-col gap-[18px] [@media(max-height:760px)]:gap-3";
const EXPR_TAG_CLASS =
  `inline-flex items-center px-2.5 py-1 text-[11px] font-bold [@media(max-height:760px)]:px-2 [@media(max-height:760px)]:py-0.5 [@media(max-height:760px)]:text-[10px] ${APPLE_BADGE_INFO}`;
const EXPAND_BUTTON_CLASS =
  "mt-3 w-full border-t border-[var(--app-chunks-sheet-card-border)] pt-2 text-center text-[13px] font-semibold text-[var(--app-feedback-success-text)] [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:pt-1.5 [@media(max-height:760px)]:text-[12px]";
const INFO_FIELD_CLASS = "space-y-0.5";
const INFO_FIELD_BODY_CLASS = `line-clamp-2 ${APPLE_BODY_TEXT}`;
const INFO_FIELD_META_BODY_CLASS = `line-clamp-2 text-sm ${APPLE_META_TEXT}`;

const APPLE_STATUS_BADGE = APPLE_BADGE_INFO;
const APPLE_PENDING_BADGE = APPLE_BADGE_SUBTLE;

function ChunksInfoField({
  label,
  children,
  bodyClassName = INFO_FIELD_BODY_CLASS,
}: {
  label: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className={INFO_FIELD_CLASS}>
      <p className={APPLE_META_TEXT}>{label}</p>
      <p className={bodyClassName}>{children}</p>
    </div>
  );
}

function ChunksPendingInfoBlock({
  labels,
  text,
  reviewHint,
  similarDiffLabel,
}: {
  labels: Pick<
    ChunksListViewLabels,
    "learningInfoPending" | "learningInfoPendingHint" | "reviewStage" | "similarExpressions"
  >;
  text: string;
  reviewHint: string;
  similarDiffLabel: string | null;
}) {
  return (
    <div className={`space-y-1 p-2.5 ${APPLE_PANEL_INFO}`}>
      <p className={APPLE_META_TEXT}>{labels.learningInfoPending}</p>
      <p className="text-sm font-medium text-foreground">{text}</p>
      <p className={APPLE_META_TEXT}>{labels.learningInfoPendingHint}</p>
      <p className={APPLE_META_TEXT}>
        {labels.reviewStage}：{reviewHint}
      </p>
      {similarDiffLabel ? (
        <p className={APPLE_META_TEXT}>
          {labels.similarExpressions}：{similarDiffLabel}
        </p>
      ) : null}
    </div>
  );
}

function ChunksSimilarExpressionsPanel({
  labels,
  item,
  similarPreview,
  isSimilarExpanded,
  appleButtonClassName,
  generatingSimilarForId,
  toggleSimilarExpanded,
  applyClusterFilter,
  openGenerateSimilarSheet,
  buildDifferenceNote,
}: {
  labels: Pick<
    ChunksListViewLabels,
    | "similarExpressions"
    | "hideSimilar"
    | "showSimilar"
    | "similarEmpty"
    | "viewAllSimilar"
    | "generatingSimilar"
    | "findMoreSimilar"
  >;
  item: UserPhraseItemResponse;
  similarPreview: UserPhraseItemResponse[];
  isSimilarExpanded: boolean;
  appleButtonClassName: string;
  generatingSimilarForId: string | null;
  toggleSimilarExpanded: (userPhraseId: string) => void;
  applyClusterFilter: (clusterId: string, expressionText: string) => void;
  openGenerateSimilarSheet: (item: UserPhraseItemResponse) => Promise<void>;
  buildDifferenceNote: (centerExpression: string, targetExpression: string) => string;
}) {
  const hasSimilarPreview = similarPreview.length > 0;

  return (
    <div className={`space-y-1.5 p-2.5 [@media(max-height:760px)]:space-y-1 [@media(max-height:760px)]:p-2 ${APPLE_PANEL}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => toggleSimilarExpanded(item.userPhraseId)}
        aria-expanded={isSimilarExpanded}
      >
        <p className={APPLE_META_TEXT}>{labels.similarExpressions}</p>
        <p className={APPLE_META_TEXT}>{isSimilarExpanded ? labels.hideSimilar : labels.showSimilar}</p>
      </button>
      {isSimilarExpanded ? (
        hasSimilarPreview ? (
          <div className="space-y-2 [@media(max-height:760px)]:space-y-1.5">
            {similarPreview.map((similarItem) => (
              <div
                key={similarItem.userPhraseId}
                className={`px-2 py-1.5 [@media(max-height:760px)]:px-1.5 [@media(max-height:760px)]:py-1 ${APPLE_LIST_ITEM}`}
              >
                <p className={`font-medium ${APPLE_BODY_TEXT}`}>{similarItem.text}</p>
                <p className={APPLE_META_TEXT}>{buildDifferenceNote(item.text, similarItem.text)}</p>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-0 text-xs"
              onClick={() =>
                item.expressionClusterId
                  ? applyClusterFilter(item.expressionClusterId, item.text)
                  : void openGenerateSimilarSheet(item)
              }
            >
              {labels.viewAllSimilar}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 [@media(max-height:760px)]:space-y-1.5">
            <p className={APPLE_META_TEXT}>{labels.similarEmpty}</p>
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              className={`h-7 text-xs ${appleButtonClassName}`}
              loading={generatingSimilarForId === item.userPhraseId}
              loadingText={`${labels.generatingSimilar}...`}
              onClick={() => void openGenerateSimilarSheet(item)}
            >
              {labels.findMoreSimilar}
            </LoadingButton>
          </div>
        )
      ) : null}
    </div>
  );
}

type ChunksListViewLabels = {
  sentenceUnit: string;
  expressionUnit: string;
  learningInfoPending: string;
  learningInfoFailed: string;
  noTranslation: string;
  usageHint: string;
  sentenceSource: string;
  sentenceSourceFallback: string;
  sentenceUnitHint: string;
  sentenceExpressions: string;
  sentenceExpressionsHint: string;
  sentenceSavedExpression: string;
  sentenceSaveExpression: string;
  sentenceNoExpressions: string;
  reviewStage: string;
  similarExpressions: string;
  translationLabel: string;
  sourceSentence: string;
  speakSentence: string;
  noSourceSentence: string;
  semanticFocusLabel: string;
  semanticFocusPending: string;
  diffRelated: string;
  typicalScenarioLabel: string;
  typicalScenarioPending: string;
  hideSimilar: string;
  showSimilar: string;
  viewAllSimilar: string;
  similarEmpty: string;
  generatingSimilar: string;
  findMoreSimilar: string;
  manualRecorded: string;
  sourceNoteDisplay: string;
  collapseDetail: string;
  expandDetail: string;
  inThisSentence: string;
  commonUsage: string;
  sentenceRecordExpression: string;
  mapUnavailable: string;
  mapPending: string;
  openMap: string;
  sourceScene: string;
  retryEnrichment: string;
  learningInfoPendingHint: string;
};

type ChunksListViewProps = {
  phrases: UserPhraseItemResponse[];
  clusterMembersByClusterId: Map<string, UserPhraseItemResponse[]>;
  expandedSimilarIds: Record<string, boolean>;
  expandedCardIds: Record<string, boolean>;
  expandedIds: Record<string, boolean>;
  savedSentenceExpressionKeys: Record<string, boolean>;
  retryingEnrichmentIds: Record<string, boolean>;
  reviewStatusLabel: Record<PhraseReviewStatus, string>;
  savingSentenceExpressionKey: string | null;
  generatingSimilarForId: string | null;
  mapOpeningForId: string | null;
  openingSourceSceneSlug: string | null;
  playingText: string | null;
  ttsPlaybackText: string | null | undefined;
  ttsLoadingText: string | null | undefined;
  appleButtonClassName: string;
  appleSurfaceClassName: string;
  labels: ChunksListViewLabels;
  toggleCardExpanded: (userPhraseId: string) => void;
  toggleSimilarExpanded: (userPhraseId: string) => void;
  toggleExpanded: (userPhraseId: string) => void;
  getUsageHint: (item: UserPhraseItemResponse) => string;
  getReviewActionHint: (status: PhraseReviewStatus) => string;
  getPrimaryActionLabel: (item: UserPhraseItemResponse) => string;
  buildDifferenceNote: (centerExpression: string, targetExpression: string) => string;
  extractExpressionsFromSentenceItem: (item: UserPhraseItemResponse) => string[];
  renderExampleSentenceCards: (
    examples: UserPhraseItemResponse["exampleSentences"],
    expression: string,
    options: {
      onSpeak: (text?: string | null) => void;
      isSpeakingText: (text?: string | null) => boolean;
      isLoadingText?: (text?: string | null) => boolean;
    },
  ) => ReactNode;
  renderSentenceWithExpressionHighlight: (sentence: string, expression: string) => ReactNode;
  handlePronounceSentence: (text?: string | null) => void;
  saveExpressionFromSentence: (item: UserPhraseItemResponse, expression: string) => Promise<void>;
  openExpressionComposerFromSentence: () => void;
  startReviewFromCard: (item: UserPhraseItemResponse) => void;
  openExpressionMap: (item: UserPhraseItemResponse) => Promise<void>;
  openSourceScene: (slug: string) => void;
  retryAiEnrichment: (item: UserPhraseItemResponse) => Promise<void>;
  applyClusterFilter: (clusterId: string, expressionText: string) => void;
  openGenerateSimilarSheet: (item: UserPhraseItemResponse) => Promise<void>;
};

export function ChunksListView({
  phrases,
  clusterMembersByClusterId,
  expandedSimilarIds,
  expandedCardIds,
  expandedIds,
  savedSentenceExpressionKeys,
  retryingEnrichmentIds,
  reviewStatusLabel,
  savingSentenceExpressionKey,
  generatingSimilarForId,
  mapOpeningForId,
  openingSourceSceneSlug,
  playingText,
  ttsPlaybackText,
  ttsLoadingText,
  appleButtonClassName,
  appleSurfaceClassName,
  labels,
  toggleCardExpanded,
  toggleSimilarExpanded,
  toggleExpanded,
  getUsageHint,
  getReviewActionHint,
  getPrimaryActionLabel,
  buildDifferenceNote,
  extractExpressionsFromSentenceItem,
  renderExampleSentenceCards,
  renderSentenceWithExpressionHighlight,
  handlePronounceSentence,
  saveExpressionFromSentence,
  openExpressionComposerFromSentence,
  startReviewFromCard,
  openExpressionMap,
  openSourceScene,
  retryAiEnrichment,
  applyClusterFilter,
  openGenerateSimilarSheet,
}: ChunksListViewProps) {
  return (
    <div className={LIST_WRAPPER_CLASS}>
      {phrases.map((item) => {
        const sentenceExpressions =
          item.learningItemType === "sentence" ? extractExpressionsFromSentenceItem(item) : [];
        const familyMembers =
          item.learningItemType === "expression" && item.expressionClusterId
            ? (clusterMembersByClusterId.get(item.expressionClusterId) ?? []).filter(
                (row) => row.userPhraseId !== item.userPhraseId,
              )
            : [];
        const similarPreview = familyMembers.slice(0, 5);
        const hasSimilarPreview = similarPreview.length > 0;
        const isSimilarExpanded = Boolean(expandedSimilarIds[item.userPhraseId]);
        const pendingSimilarDiffLabel =
          hasSimilarPreview && item.aiEnrichmentStatus === "pending"
            ? buildDifferenceNote(item.text, similarPreview[0].text)
            : null;
        const cardExpanded = Boolean(expandedCardIds[item.userPhraseId]);

        if (item.learningItemType === "expression") {
          return (
            <ExpressionSummaryCard
              key={item.userPhraseId}
              title={item.text}
              translation={
                item.translation ??
                (item.aiEnrichmentStatus === "pending"
                  ? labels.learningInfoPending
                  : item.aiEnrichmentStatus === "failed"
                    ? labels.learningInfoFailed
                    : labels.noTranslation)
              }
              onTitleClick={() => toggleCardExpanded(item.userPhraseId)}
              badge={<span className={EXPR_TAG_CLASS}>{reviewStatusLabel[item.reviewStatus]}</span>}
            >
              <ExpressionSummaryGroup
                label={
                  hasSimilarPreview
                    ? `🔗 ${labels.similarExpressions} · ${similarPreview.length}`
                    : `🔗 ${labels.similarExpressions}`
                }
                actionLabel="查看详情"
                onAction={() =>
                  item.expressionClusterId
                    ? applyClusterFilter(item.expressionClusterId, item.text)
                    : void openGenerateSimilarSheet(item)
                }
                footer={
                  <button
                    type="button"
                    className={EXPAND_BUTTON_CLASS}
                    onClick={() => toggleSimilarExpanded(item.userPhraseId)}
                    aria-expanded={isSimilarExpanded}
                    aria-label={`${labels.similarExpressions} ${isSimilarExpanded ? labels.hideSimilar : labels.showSimilar}`}
                  >
                    {isSimilarExpanded ? "📘 收起同类表达" : "📖 展开同类表达"}
                  </button>
                }
              >
                {isSimilarExpanded ? (
                  hasSimilarPreview ? (
                    <div className="space-y-0">
                      {similarPreview.map((similarItem) => (
                        <ExpressionSummaryRelatedItem
                          key={similarItem.userPhraseId}
                          primary={similarItem.text}
                          secondary={buildDifferenceNote(item.text, similarItem.text)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className={APPLE_META_TEXT}>{labels.similarEmpty}</p>
                  )
                ) : null}
              </ExpressionSummaryGroup>

              <div
                className={`overflow-hidden transition-all duration-200 ${
                  cardExpanded
                    ? "max-h-[720px] pt-4 opacity-100 [@media(max-height:760px)]:pt-3"
                    : "max-h-0 pt-0 opacity-0"
                }`}
              >
                <div className="space-y-3.5 [@media(max-height:760px)]:space-y-2.5">
                  {item.aiEnrichmentStatus === "pending" ? (
                    <ChunksPendingInfoBlock
                      labels={labels}
                      text={item.text}
                      reviewHint={getReviewActionHint(item.reviewStatus)}
                      similarDiffLabel={pendingSimilarDiffLabel}
                    />
                  ) : null}
                  <ChunksInfoField label={labels.usageHint}>{getUsageHint(item)}</ChunksInfoField>
                  <ChunksInfoField label={labels.sourceSentence} bodyClassName={INFO_FIELD_META_BODY_CLASS}>
                    {item.sourceSentenceText
                      ? renderSentenceWithExpressionHighlight(item.sourceSentenceText, item.text)
                      : item.aiEnrichmentStatus === "pending"
                        ? labels.learningInfoPending
                        : labels.noSourceSentence}
                  </ChunksInfoField>
                  <div className="flex flex-wrap gap-2 pt-1 [@media(max-height:760px)]:gap-1.5 [@media(max-height:760px)]:pt-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={appleButtonClassName}
                      onClick={() => startReviewFromCard(item)}
                    >
                      {getPrimaryActionLabel(item)}
                    </Button>
                    <LoadingButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={appleButtonClassName}
                      disabled={!item.expressionClusterId}
                      loading={mapOpeningForId === item.userPhraseId}
                      loadingText={labels.mapPending}
                      onClick={() => void openExpressionMap(item)}
                    >
                      {!item.expressionClusterId ? labels.mapUnavailable : labels.openMap}
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </ExpressionSummaryCard>
          );
        }

        return (
          <Card key={item.userPhraseId} className={`h-full overflow-hidden ${appleSurfaceClassName}`}>
            <CardHeader className="px-3 py-2.5 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:py-2">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => toggleCardExpanded(item.userPhraseId)}
                aria-expanded={Boolean(expandedCardIds[item.userPhraseId])}
                aria-label={item.text}
              >
                <div className="flex items-start justify-between gap-2 [@media(max-height:760px)]:gap-1.5">
                  <div className="min-w-0">
                    <p className={APPLE_META_TEXT}>
                      {item.learningItemType === "sentence" ? labels.sentenceUnit : labels.expressionUnit}
                    </p>
                    <p className={`mt-0.5 leading-snug ${APPLE_TITLE_SM} [@media(max-height:760px)]:text-[15px]`}>
                      {item.text}
                    </p>
                    <p className={`mt-0.5 line-clamp-1 ${APPLE_META_TEXT}`}>
                      {item.translation ??
                        (item.aiEnrichmentStatus === "pending"
                          ? labels.learningInfoPending
                          : item.aiEnrichmentStatus === "failed"
                            ? labels.learningInfoFailed
                            : labels.noTranslation)}
                    </p>
                  </div>
                  <div className="mt-0.5 flex shrink-0 items-center gap-1.5 [@media(max-height:760px)]:gap-1">
                    <Badge variant="secondary" className={APPLE_STATUS_BADGE}>
                      {reviewStatusLabel[item.reviewStatus]}
                    </Badge>
                    {item.aiEnrichmentStatus === "pending" ? (
                      <Badge variant="outline" className={APPLE_PENDING_BADGE}>
                        {labels.learningInfoPending}
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={`size-4 ${APPLE_META_TEXT} transition-transform duration-200 ${
                        expandedCardIds[item.userPhraseId] ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </div>
                </div>
              </button>
            </CardHeader>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedCardIds[item.userPhraseId]
                  ? "max-h-[780px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <CardContent className="space-y-3.5 p-3 pb-2 pt-2.5 [@media(max-height:760px)]:space-y-2.5 [@media(max-height:760px)]:p-2.5 [@media(max-height:760px)]:pb-2 [@media(max-height:760px)]:pt-2">
                {item.learningItemType === "sentence" ? (
                  <>
                    <ChunksInfoField label={labels.usageHint}>{getUsageHint(item)}</ChunksInfoField>
                    <div className={INFO_FIELD_CLASS}>
                      <p className={APPLE_META_TEXT}>{labels.sentenceSource}</p>
                      <p className={INFO_FIELD_META_BODY_CLASS}>
                        {item.sourceSceneSlug ? item.sourceSceneSlug : labels.sentenceSourceFallback}
                      </p>
                      <p className={APPLE_META_TEXT}>{labels.sentenceUnitHint}</p>
                    </div>
                    <div className="space-y-1">
                      <p className={APPLE_META_TEXT}>{labels.sentenceExpressions}</p>
                      <p className={APPLE_META_TEXT}>{labels.sentenceExpressionsHint}</p>
                      {sentenceExpressions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sentenceExpressions.map((expression) => {
                            const normalized = normalizePhraseText(expression);
                            const key = `${item.userPhraseId}:${normalized}`;
                            const isSaved = Boolean(savedSentenceExpressionKeys[key]);
                            const isSaving = savingSentenceExpressionKey === key;
                            return (
                              <div
                                key={key}
                                className={`flex items-center gap-1 rounded-full px-2 py-1 [@media(max-height:760px)]:px-1.5 [@media(max-height:760px)]:py-0.5 ${APPLE_BADGE_SUBTLE}`}
                              >
                                <span className={APPLE_BODY_TEXT}>{expression}</span>
                                <LoadingButton
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1.5 py-0 text-xs"
                                  disabled={isSaved}
                                  loading={isSaving}
                                  loadingText={`${labels.sentenceSaveExpression}中...`}
                                  onClick={() => void saveExpressionFromSentence(item, expression)}
                                >
                                  {isSaved ? labels.sentenceSavedExpression : labels.sentenceSaveExpression}
                                </LoadingButton>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={APPLE_META_TEXT}>{labels.sentenceNoExpressions}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {item.aiEnrichmentStatus === "pending" ? (
                      <ChunksPendingInfoBlock
                        labels={labels}
                        text={item.text}
                        reviewHint={getReviewActionHint(item.reviewStatus)}
                        similarDiffLabel={pendingSimilarDiffLabel}
                      />
                    ) : null}
                    <ChunksInfoField label={labels.translationLabel}>
                      {item.translation ??
                        (item.aiEnrichmentStatus === "pending"
                          ? labels.learningInfoPending
                          : item.aiEnrichmentStatus === "failed"
                            ? labels.learningInfoFailed
                            : labels.noTranslation)}
                    </ChunksInfoField>
                    <ChunksInfoField label={labels.usageHint}>{getUsageHint(item)}</ChunksInfoField>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className={APPLE_META_TEXT}>{labels.sourceSentence}</p>
                        <TtsActionButton
                          active={playingText === (item.exampleSentences[0]?.en ?? item.sourceSentenceText ?? "").trim()}
                          loading={ttsLoadingText === (item.exampleSentences[0]?.en ?? item.sourceSentenceText ?? "").trim()}
                          size="icon"
                          variant="ghost"
                          className="size-8 border-transparent bg-transparent px-0 text-[var(--app-foreground-muted)] hover:bg-transparent hover:text-[var(--app-foreground)] [@media(max-height:760px)]:size-7"
                          iconClassName="size-4 [@media(max-height:760px)]:size-3.5"
                          onClick={() =>
                            handlePronounceSentence(item.exampleSentences[0]?.en ?? item.sourceSentenceText)
                          }
                          label={labels.speakSentence}
                        />
                      </div>
                      {item.exampleSentences.length > 0 ? (
                        renderExampleSentenceCards(item.exampleSentences, item.text, {
                          onSpeak: handlePronounceSentence,
                          isSpeakingText: (text) => {
                            const normalizedText = text?.trim();
                            return Boolean(normalizedText) &&
                              (playingText === normalizedText || ttsPlaybackText === normalizedText);
                          },
                          isLoadingText: (text) => {
                            const normalizedText = text?.trim();
                            return Boolean(normalizedText) && ttsLoadingText === normalizedText;
                          },
                        })
                      ) : (
                        <p className={`line-clamp-2 text-sm ${APPLE_META_TEXT}`}>
                          {item.sourceSentenceText
                            ? renderSentenceWithExpressionHighlight(item.sourceSentenceText, item.text)
                            : item.aiEnrichmentStatus === "pending"
                              ? labels.learningInfoPending
                              : labels.noSourceSentence}
                        </p>
                      )}
                    </div>
                    <ChunksInfoField label={labels.semanticFocusLabel} bodyClassName={APPLE_META_TEXT}>
                      {item.semanticFocus ??
                        (item.aiEnrichmentStatus === "pending" ? labels.semanticFocusPending : labels.diffRelated)}
                    </ChunksInfoField>
                    <ChunksInfoField label={labels.typicalScenarioLabel} bodyClassName={APPLE_META_TEXT}>
                      {item.typicalScenario ??
                        (item.aiEnrichmentStatus === "pending" ? labels.typicalScenarioPending : labels.diffRelated)}
                    </ChunksInfoField>
                    <ChunksSimilarExpressionsPanel
                      labels={labels}
                      item={item}
                      similarPreview={similarPreview}
                      isSimilarExpanded={isSimilarExpanded}
                      appleButtonClassName={appleButtonClassName}
                      generatingSimilarForId={generatingSimilarForId}
                      toggleSimilarExpanded={toggleSimilarExpanded}
                      applyClusterFilter={applyClusterFilter}
                      openGenerateSimilarSheet={openGenerateSimilarSheet}
                      buildDifferenceNote={buildDifferenceNote}
                    />
                  </>
                )}
                {item.sourceType === "manual" ? (
                  <div className="space-y-0.5">
                    <p className={APPLE_META_TEXT}>{labels.manualRecorded}</p>
                    {item.sourceNote ? (
                      <p className={`line-clamp-1 ${APPLE_META_TEXT}`}>
                        {labels.sourceNoteDisplay}：{item.sourceNote}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <ChunksInfoField label={labels.reviewStage} bodyClassName={APPLE_META_TEXT}>
                  {getReviewActionHint(item.reviewStatus)}
                </ChunksInfoField>
                {item.usageNote && item.usageNote.trim().length > 70 ? (
                  <div className="space-y-1.5 [@media(max-height:760px)]:space-y-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={`h-auto px-0 text-xs ${APPLE_META_TEXT}`}
                      onClick={() => toggleExpanded(item.userPhraseId)}
                    >
                      {expandedIds[item.userPhraseId] ? labels.collapseDetail : labels.expandDetail}
                    </Button>
                    {expandedIds[item.userPhraseId] ? (
                      <div className="space-y-1.5 pt-0.5 [@media(max-height:760px)]:space-y-1">
                        <p className={APPLE_META_TEXT}>{labels.inThisSentence}</p>
                        <p className={APPLE_BODY_TEXT}>{item.translation ?? labels.noTranslation}</p>
                        <p className={APPLE_META_TEXT}>{labels.commonUsage}</p>
                        <p className={`text-sm ${APPLE_META_TEXT}`}>{item.usageNote}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 px-3 py-2.5 [@media(max-height:760px)]:gap-1.5 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:py-2">
                {item.learningItemType === "sentence" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={appleButtonClassName}
                    onClick={() => openExpressionComposerFromSentence()}
                  >
                    {labels.sentenceRecordExpression}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={appleButtonClassName}
                      onClick={() => startReviewFromCard(item)}
                    >
                      {getPrimaryActionLabel(item)}
                    </Button>
                    <LoadingButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={appleButtonClassName}
                      disabled={!item.expressionClusterId}
                      loading={mapOpeningForId === item.userPhraseId}
                      loadingText={labels.mapPending}
                      onClick={() => void openExpressionMap(item)}
                    >
                      {!item.expressionClusterId ? labels.mapUnavailable : labels.openMap}
                    </LoadingButton>
                    {item.sourceSceneSlug ? (
                      <LoadingButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={appleButtonClassName}
                        loading={openingSourceSceneSlug === item.sourceSceneSlug}
                        loadingText="进入场景中..."
                        onClick={() => openSourceScene(item.sourceSceneSlug!)}
                      >
                        {labels.sourceScene}
                      </LoadingButton>
                    ) : null}
                    {item.aiEnrichmentStatus === "failed" ? (
                      <LoadingButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={appleButtonClassName}
                        loading={Boolean(retryingEnrichmentIds[item.userPhraseId])}
                        loadingText={`${labels.retryEnrichment}...`}
                        onClick={() => void retryAiEnrichment(item)}
                      >
                        {labels.retryEnrichment}
                      </LoadingButton>
                    ) : null}
                  </>
                )}
              </CardFooter>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
