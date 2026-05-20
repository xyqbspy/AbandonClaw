"use client";

import { normalizePhraseText } from "@/lib/shared/phrases";
import type { PhraseReviewStatus } from "@/lib/utils/phrases-api";
import { ChunksListView } from "./chunks-list-view";
import type { ChunksListViewProps } from "./chunks-list-view";
import { chunksPageMessages as zh } from "./chunks-page-messages";
import { CHUNKS_PRIMARY_BUTTON_CLASSNAME as chunksButtonClassName } from "./chunks-page-styles";

const LIST_SECTION_CLASSNAME = "space-y-4";
const LIST_SURFACE_CLASSNAME = "rounded-[2rem] border border-slate-50 bg-white shadow-sm ring-0";

const reviewStatusLabel = {
  saved: zh.tabs.saved,
  reviewing: zh.tabs.reviewing,
  mastered: zh.tabs.mastered,
  archived: "\u5df2\u5f52\u6863",
} satisfies Record<PhraseReviewStatus, string>;

const chunksListViewLabels = {
  sentenceUnit: zh.sentenceUnit,
  expressionUnit: zh.expressionUnit,
  learningInfoPending: zh.learningInfoPending,
  learningInfoFailed: zh.learningInfoFailed,
  noTranslation: zh.noTranslation,
  usageHint: zh.usageHint,
  sentenceSource: zh.sentenceSource,
  sentenceSourceFallback: zh.sentenceSourceFallback,
  sentenceUnitHint: zh.sentenceUnitHint,
  sentenceExpressions: zh.sentenceExpressions,
  sentenceExpressionsHint: zh.sentenceExpressionsHint,
  sentenceSavedExpression: zh.sentenceSavedExpression,
  sentenceSaveExpression: zh.sentenceSaveExpression,
  sentenceNoExpressions: zh.sentenceNoExpressions,
  reviewStage: zh.reviewStage,
  similarExpressions: zh.similarExpressions,
  translationLabel: zh.translationLabel,
  sourceSentence: zh.sourceSentence,
  speakSentence: zh.speakSentence,
  noSourceSentence: zh.noSourceSentence,
  semanticFocusLabel: zh.semanticFocusLabel,
  semanticFocusPending: zh.semanticFocusPending,
  diffRelated: zh.diffRelated,
  typicalScenarioLabel: zh.typicalScenarioLabel,
  typicalScenarioPending: zh.typicalScenarioPending,
  hideSimilar: zh.hideSimilar,
  showSimilar: zh.showSimilar,
  viewAllSimilar: zh.viewAllSimilar,
  similarEmpty: zh.similarEmpty,
  generatingSimilar: zh.generatingSimilar,
  findMoreSimilar: zh.findMoreSimilar,
  manualRecorded: zh.manualRecorded,
  sourceNoteDisplay: zh.sourceNoteDisplay,
  collapseDetail: zh.collapseDetail,
  expandDetail: zh.expandDetail,
  inThisSentence: zh.inThisSentence,
  commonUsage: zh.commonUsage,
  sentenceRecordExpression: zh.sentenceRecordExpression,
  detailPrimaryAction: zh.detailPrimaryAction,
  mapUnavailable: zh.mapUnavailable,
  mapPending: zh.mapPending,
  openMap: zh.openMap,
  sourceScene: zh.sourceScene,
  retryEnrichment: zh.retryEnrichment,
  learningInfoPendingHint: zh.learningInfoPendingHint,
} satisfies ChunksListViewProps["labels"];

const extractExpressionsFromSentenceItem: ChunksListViewProps["extractExpressionsFromSentenceItem"] = (item) => {
  const raw = (item.sourceChunkText ?? "").trim();
  if (!raw) return [] as string[];
  const parts = raw
    .split(/[|,/，；;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 2 && entry.length <= 80);
  const unique = new Map<string, string>();
  for (const entry of parts) {
    const normalized = normalizePhraseText(entry);
    if (/^sentence-[0-9a-f]{8}$/i.test(normalized)) continue;
    if (!normalized || unique.has(normalized)) continue;
    unique.set(normalized, entry);
  }
  return Array.from(unique.values()).slice(0, 6);
};

type ChunksPageListDataProps = Pick<
  ChunksListViewProps,
  "phrases" | "clusterMembersByClusterId"
>;

type ChunksPageListExpansionProps = Pick<
  ChunksListViewProps,
  | "expandedSimilarIds"
  | "expandedCardIds"
  | "expandedIds"
  | "toggleCardExpanded"
  | "toggleSimilarExpanded"
  | "toggleExpanded"
>;

type ChunksPageListStatusProps = Pick<
  ChunksListViewProps,
  | "savedSentenceExpressionKeys"
  | "retryingEnrichmentIds"
  | "savingSentenceExpressionKey"
  | "generatingSimilarForId"
  | "mapOpeningForId"
  | "openingSourceSceneSlug"
>;

type ChunksPageListAudioProps = {
  speakingText: ChunksListViewProps["playingText"];
  loadingText: ChunksListViewProps["ttsLoadingText"];
  handlePronounceSentence: ChunksListViewProps["handlePronounceSentence"];
};

type ChunksPageListPresenterProps = Pick<
  ChunksListViewProps,
  | "getUsageHint"
  | "getReviewActionHint"
  | "getPrimaryActionLabel"
  | "buildDifferenceNote"
  | "renderExampleSentenceCards"
  | "renderSentenceWithExpressionHighlight"
>;

type ChunksPageListActionProps = Pick<
  ChunksListViewProps,
  | "saveExpressionFromSentence"
  | "openExpressionComposerFromSentence"
  | "openExpressionDetail"
  | "startReviewFromCard"
  | "openExpressionMap"
  | "openSourceScene"
  | "retryAiEnrichment"
  | "applyClusterFilter"
  | "openGenerateSimilarSheet"
>;

export type ChunksPageListSectionProps = {
  data: ChunksPageListDataProps;
  expansion: ChunksPageListExpansionProps;
  status: ChunksPageListStatusProps;
  audio: ChunksPageListAudioProps;
  presenters: ChunksPageListPresenterProps;
  actions: ChunksPageListActionProps;
};

export function ChunksPageListSection({
  data,
  expansion,
  status,
  audio,
  presenters,
  actions,
}: ChunksPageListSectionProps) {
  return (
    <section className={LIST_SECTION_CLASSNAME}>
      <ChunksListView
        {...data}
        {...expansion}
        {...status}
        {...presenters}
        {...actions}
        reviewStatusLabel={reviewStatusLabel}
        playingText={audio.speakingText}
        ttsPlaybackText={audio.speakingText}
        ttsLoadingText={audio.loadingText}
        appleButtonClassName={chunksButtonClassName}
        appleSurfaceClassName={LIST_SURFACE_CLASSNAME}
        labels={chunksListViewLabels}
        extractExpressionsFromSentenceItem={extractExpressionsFromSentenceItem}
        handlePronounceSentence={audio.handlePronounceSentence}
      />
    </section>
  );
}
