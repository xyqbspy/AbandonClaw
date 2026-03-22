"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { PhraseReviewStatus, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        return (
          <Card key={item.userPhraseId} className={`h-full overflow-hidden ${appleSurfaceClassName}`}>
            <CardHeader className="px-3 py-2.5">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => toggleCardExpanded(item.userPhraseId)}
                aria-expanded={Boolean(expandedCardIds[item.userPhraseId])}
                aria-label={item.text}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {item.learningItemType === "sentence" ? labels.sentenceUnit : labels.expressionUnit}
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold leading-snug">{item.text}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {item.translation ??
                        (item.aiEnrichmentStatus === "pending"
                          ? labels.learningInfoPending
                          : item.aiEnrichmentStatus === "failed"
                            ? labels.learningInfoFailed
                            : labels.noTranslation)}
                    </p>
                  </div>
                  <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                    <Badge variant="secondary">{reviewStatusLabel[item.reviewStatus]}</Badge>
                    {item.aiEnrichmentStatus === "pending" ? (
                      <Badge variant="outline">{labels.learningInfoPending}</Badge>
                    ) : null}
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${
                        expandedCardIds[item.userPhraseId] ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </div>
                </div>
              </button>
            </CardHeader>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expandedCardIds[item.userPhraseId] ? "max-h-[780px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <CardContent className="space-y-3.5 p-3 pb-2 pt-2.5">
                {item.learningItemType === "sentence" ? (
                  <>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{labels.usageHint}</p>
                      <p className="line-clamp-2 text-sm text-foreground/90">{getUsageHint(item)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{labels.sentenceSource}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.sourceSceneSlug ? item.sourceSceneSlug : labels.sentenceSourceFallback}
                      </p>
                      <p className="text-xs text-muted-foreground">{labels.sentenceUnitHint}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{labels.sentenceExpressions}</p>
                      <p className="text-[11px] text-muted-foreground">{labels.sentenceExpressionsHint}</p>
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
                                className="flex items-center gap-1 rounded-full bg-[rgb(240,240,240)] px-2 py-1"
                              >
                                <span className="text-xs text-foreground">{expression}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1.5 py-0 text-[11px]"
                                  disabled={isSaved || isSaving}
                                  onClick={() => void saveExpressionFromSentence(item, expression)}
                                >
                                  {isSaved
                                    ? labels.sentenceSavedExpression
                                    : isSaving
                                      ? `${labels.sentenceSaveExpression}...`
                                      : labels.sentenceSaveExpression}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{labels.sentenceNoExpressions}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {item.aiEnrichmentStatus === "pending" ? (
                      <div className="space-y-1 rounded-lg bg-[rgb(246,246,246)] p-2.5">
                        <p className="text-xs text-muted-foreground">{labels.learningInfoPending}</p>
                        <p className="text-sm font-medium text-foreground">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{labels.learningInfoPendingHint}</p>
                        <p className="text-xs text-muted-foreground">
                          {labels.reviewStage}：{getReviewActionHint(item.reviewStatus)}
                        </p>
                        {pendingSimilarDiffLabel ? (
                          <p className="text-xs text-muted-foreground">
                            {labels.similarExpressions}：{pendingSimilarDiffLabel}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{labels.translationLabel}</p>
                      <p className="line-clamp-2 text-sm text-foreground/90">
                        {item.translation ??
                          (item.aiEnrichmentStatus === "pending"
                            ? labels.learningInfoPending
                            : item.aiEnrichmentStatus === "failed"
                              ? labels.learningInfoFailed
                              : labels.noTranslation)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{labels.usageHint}</p>
                      <p className="line-clamp-2 text-sm text-foreground/90">{getUsageHint(item)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">{labels.sourceSentence}</p>
                        <TtsActionButton
                          active={playingText === (item.exampleSentences[0]?.en ?? item.sourceSentenceText ?? "").trim()}
                          loading={ttsLoadingText === (item.exampleSentences[0]?.en ?? item.sourceSentenceText ?? "").trim()}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          iconClassName="size-3"
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
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {item.sourceSentenceText
                            ? renderSentenceWithExpressionHighlight(item.sourceSentenceText, item.text)
                            : item.aiEnrichmentStatus === "pending"
                              ? labels.learningInfoPending
                              : labels.noSourceSentence}
                        </p>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{labels.semanticFocusLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.semanticFocus ??
                          (item.aiEnrichmentStatus === "pending" ? labels.semanticFocusPending : labels.diffRelated)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{labels.typicalScenarioLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.typicalScenario ??
                          (item.aiEnrichmentStatus === "pending" ? labels.typicalScenarioPending : labels.diffRelated)}
                      </p>
                    </div>
                    <div className="space-y-1.5 rounded-lg bg-[rgb(246,246,246)] p-2.5">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => toggleSimilarExpanded(item.userPhraseId)}
                        aria-expanded={isSimilarExpanded}
                      >
                        <p className="text-xs text-muted-foreground">{labels.similarExpressions}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isSimilarExpanded ? labels.hideSimilar : labels.showSimilar}
                        </p>
                      </button>
                      {isSimilarExpanded ? (
                        hasSimilarPreview ? (
                          <div className="space-y-2">
                            {similarPreview.map((similarItem) => (
                              <div key={similarItem.userPhraseId} className="rounded-md bg-[rgb(240,240,240)] px-2 py-1.5">
                                <p className="text-xs font-medium text-foreground">{similarItem.text}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {buildDifferenceNote(item.text, similarItem.text)}
                                </p>
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
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">{labels.similarEmpty}</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className={`h-7 text-xs ${appleButtonClassName}`}
                              disabled={generatingSimilarForId === item.userPhraseId}
                              onClick={() => void openGenerateSimilarSheet(item)}
                            >
                              {generatingSimilarForId === item.userPhraseId
                                ? `${labels.generatingSimilar}...`
                                : labels.findMoreSimilar}
                            </Button>
                          </div>
                        )
                      ) : null}
                    </div>
                  </>
                )}
                {item.sourceType === "manual" ? (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{labels.manualRecorded}</p>
                    {item.sourceNote ? (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {labels.sourceNoteDisplay}：{item.sourceNote}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{labels.reviewStage}</p>
                  <p className="text-xs text-foreground/80">{getReviewActionHint(item.reviewStatus)}</p>
                </div>
                {item.usageNote && item.usageNote.trim().length > 70 ? (
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-auto px-0 text-xs text-muted-foreground"
                      onClick={() => toggleExpanded(item.userPhraseId)}
                    >
                      {expandedIds[item.userPhraseId] ? labels.collapseDetail : labels.expandDetail}
                    </Button>
                    {expandedIds[item.userPhraseId] ? (
                      <div className="space-y-1.5 pt-0.5">
                        <p className="text-xs text-muted-foreground">{labels.inThisSentence}</p>
                        <p className="text-sm text-foreground/90">{item.translation ?? labels.noTranslation}</p>
                        <p className="text-xs text-muted-foreground">{labels.commonUsage}</p>
                        <p className="text-sm text-muted-foreground">{item.usageNote}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 px-3 py-2.5">
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={appleButtonClassName}
                      disabled={!item.expressionClusterId}
                      onClick={() => void openExpressionMap(item)}
                    >
                      {!item.expressionClusterId
                        ? labels.mapUnavailable
                        : mapOpeningForId === item.userPhraseId
                          ? labels.mapPending
                          : labels.openMap}
                    </Button>
                    {item.sourceSceneSlug ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={appleButtonClassName}
                        onClick={() => openSourceScene(item.sourceSceneSlug!)}
                      >
                        {labels.sourceScene}
                      </Button>
                    ) : null}
                    {item.aiEnrichmentStatus === "failed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={appleButtonClassName}
                        disabled={Boolean(retryingEnrichmentIds[item.userPhraseId])}
                        onClick={() => void retryAiEnrichment(item)}
                      >
                        {retryingEnrichmentIds[item.userPhraseId]
                          ? `${labels.retryEnrichment}...`
                          : labels.retryEnrichment}
                      </Button>
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
