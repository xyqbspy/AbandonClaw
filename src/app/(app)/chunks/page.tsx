"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import {
  playChunkAudio,
  prefetchChunkAudio,
  regenerateChunkAudioBatch,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import { ExpressionCluster, ExpressionMapResponse } from "@/lib/types/expression-map";
import {
  enrichSimilarExpressionFromApi,
  enrichSimilarExpressionsBatchFromApi,
  generateManualExpressionAssistFromApi,
  generateSimilarExpressionsFromApi,
  ManualExpressionAssistResponse,
  PhraseReviewStatus,
  savePhrasesBatchFromApi,
  SimilarExpressionCandidateResponse,
  savePhraseFromApi,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoveIntoClusterSheet } from "@/features/chunks/components/move-into-cluster-sheet";
import { buildFocusDetailLabels } from "@/features/chunks/components/focus-detail-labels";
import { FocusDetailSheet } from "@/features/chunks/components/focus-detail-sheet";
import { ExpressionMapSheet } from "@/features/chunks/components/expression-map-sheet";
import { buildExpressionMapViewModel } from "@/features/chunks/components/expression-map-selectors";
import { ClusterFocusList } from "@/features/chunks/components/cluster-focus-list";
import { buildFocusDetailViewModel } from "@/features/chunks/components/focus-detail-selectors";
import type { FocusDetailRelatedItem } from "@/features/chunks/components/focus-detail-selectors";
import {
  MoveIntoClusterCandidate,
  MoveIntoClusterGroup,
} from "@/features/chunks/components/types";
import {
  getFocusMainExpressionRows,
  resolveFocusMainExpressionId,
  toggleMoveIntoClusterCandidateSelection,
  toggleMoveIntoClusterGroupSelection,
} from "@/features/chunks/expression-clusters/ui-logic";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_TEXT_SM,
  APPLE_SURFACE,
} from "@/lib/ui/apple-style";
import {
  buildSavedFocusDetailState,
  buildFocusDetailClosePayload,
  buildFocusDetailOpenRowAction,
  buildFocusDetailSheetState,
  buildFocusDetailTabChangeState,
  buildGeneratedSimilarSheetState,
  buildManualSheetState,
  buildMoveIntoClusterOpenChangeState,
  buildMoveIntoClusterSheetState,
  buildClusterFilterChange,
  buildChunksSummary,
  resolveClusterFilterExpressionLabel,
  resolveFocusExpressionId,
} from "./chunks-page-logic";
import { useChunksRouteState } from "./use-chunks-route-state";
import { useExpressionClusterActions } from "./use-expression-cluster-actions";
import { useFocusAssist } from "./use-focus-assist";
import { useGeneratedSimilarSheet } from "./use-generated-similar-sheet";
import { useChunksListData } from "./use-chunks-list-data";
import { useManualExpressionComposer } from "./use-manual-expression-composer";
import { useManualSentenceComposer } from "./use-manual-sentence-composer";
import { useSavedRelations } from "./use-saved-relations";
import { useFocusDetailController } from "./use-focus-detail-controller";
import { ChunksListView } from "./chunks-list-view";

const zh = {
  loadFailed: "\u52a0\u8f7d\u8868\u8fbe\u5931\u8d25\u3002",
  loading: "\u52a0\u8f7d\u4e2d...",
  total: "\u5171",
  items: "\u6761",
  eyebrow: "Expression",
  title: "Expression Library",
  desc: "\u5728\u8fd9\u91cc\u7ba1\u7406\u4f60\u7684\u5df2\u4fdd\u5b58\u8868\u8fbe\uff0c\u5e76\u4ece\u8868\u8fbe\u7ec4\u76f4\u63a5\u8fdb\u5165\u590d\u4e60\u3002",
  searchPlaceholder: "\u641c\u7d22\u5df2\u4fdd\u5b58\u8868\u8fbe",
  addExpression: "\u6dfb\u52a0\u5b66\u4e60\u5185\u5bb9",
  manualAddTitle: "\u6dfb\u52a0\u5b66\u4e60\u5185\u5bb9",
  manualAddDesc: "\u53ea\u586b\u8868\u8fbe\u4e5f\u53ef\u4ee5\uff0c\u4fdd\u5b58\u540e\u4f1a\u81ea\u52a8\u8865\u5168\u4e2d\u6587\u91ca\u4e49\u3001\u8bed\u5883\u4f8b\u53e5\u548c\u4f7f\u7528\u63d0\u793a\u3002",
  itemTypeLabel: "\u8bb0\u5f55\u7c7b\u578b",
  itemTypeExpression: "\u8bb0\u5f55\u8868\u8fbe",
  itemTypeSentence: "\u8bb0\u5f55\u53e5\u5b50",
  contentTabExpression: "\u8868\u8fbe",
  contentTabSentence: "\u53e5\u5b50",
  viewModeList: "\u5217\u8868\u6a21\u5f0f",
  viewModeFocus: "\u4e3b\u8868\u8fbe\u6a21\u5f0f",
  focusModeTitle: "\u4e3b\u8868\u8fbe\u5b66\u4e60\u89c6\u56fe",
  focusModeDesc: "\u56f4\u7ed5\u4e00\u4e2a\u4e3b\u8868\u8fbe\uff0c\u4e00\u6b21\u770b\u540c\u7c7b\u3001\u5bf9\u7167\u548c\u5b66\u4e60\u4fe1\u606f\u3002",
  focusLibrarySimilar: "\u5df2\u5728\u5e93\u540c\u7c7b",
  focusSuggestedSimilar: "AI \u540c\u7c7b\u5019\u9009",
  focusContrast: "AI \u5bf9\u7167\u8868\u8fbe",
  focusEmptySimilar: "\u6682\u65e0\u53ef\u7528\u540c\u7c7b\u8868\u8fbe",
  focusLoading: "\u6b63\u5728\u8865\u5168\u4e3b\u8868\u8fbe\u89c6\u56fe...",
  focusTabSimilar: "\u540c\u7c7b\u8868\u8fbe",
  focusTabContrast: "\u5bf9\u7167\u8868\u8fbe",
  focusExpand: "\u5c55\u5f00",
  focusCollapse: "\u6536\u8d77",
  focusRelatedEmpty: "\u6682\u65e0\u76f8\u5173\u8868\u8fbe",
  addThisExpression: "\u52a0\u5165\u8868\u8fbe\u5e93",
  addingThisExpression: "\u52a0\u5165\u4e2d",
  addedThisExpression: "\u5df2\u52a0\u5165",
  completeAssist: "\u5b8c\u6210",
  detailTitle: "\u8868\u8fbe\u8be6\u60c5",
  detailLoading: "\u6b63\u5728\u52a0\u8f7d\u8868\u8fbe\u8be6\u60c5...",
  detailOpenAsMain: "\u8bbe\u4e3a\u672c\u7c07\u4e3b\u8868\u8fbe",
  detailOpenAsMainConfirmTitle: "\u8bbe\u7f6e\u4e3a\u672c\u7c07\u4e3b\u8868\u8fbe\uff1f",
  detailOpenAsMainConfirmDesc:
    "\u8fd9\u4f1a\u628a\u8be5\u8868\u8fbe\u8bbe\u4e3a\u5f53\u524d\u8868\u8fbe\u7c07\u7684\u4e3b\u8868\u8fbe\uff0c\u4e0d\u4f1a\u62c6\u51fa\u6210\u72ec\u7acb\u8868\u8fbe\u3002",
  detailCandidateBadge: "AI \u5019\u9009",
  detailFindRelations: "\u67e5\u627e\u540c\u7c7b / \u5bf9\u7167\u8868\u8fbe",
  detailRelationsDesc:
    "\u9700\u8981\u65f6\u518d\u4e3b\u52a8\u67e5\u627e\uff0c\u67e5\u627e\u540e\u4f1a\u65b0\u589e AI \u540c\u7c7b \u548c AI \u5bf9\u7167 \u6807\u7b7e\u9875\u3002",
  openCurrentDetail: "\u67e5\u770b\u8fd9\u4e00\u7ec4",
  detailTabInfo: "\u8be6\u60c5",
  detailTabSavedSimilar: "\u540c\u7c7b\u8868\u8fbe",
  detailTabSuggested: "AI \u540c\u7c7b",
  detailTabContrast: "\u5bf9\u7167\u8868\u8fbe",
  detailMoreActions: "\u66f4\u591a\u64cd\u4f5c",
  detailManualAddRelated: "\u6dfb\u52a0\u5173\u8054\u8868\u8fbe",
  detailRegenerateAudio: "\u91cd\u65b0\u751f\u6210\u97f3\u9891",
  detailRetryEnrichment: "\u8865\u5168\u5f53\u524dchunk",
  detailSimilarHint: "\u8fd9\u4e00\u7ec4\u8868\u8fbe\u610f\u601d\u63a5\u8fd1\uff0c\u53ef\u4ee5\u653e\u5728\u4e00\u8d77\u5bf9\u6bd4\u7740\u5b66\u3002",
  detailContrastHint: "\u8fd9\u4e9b\u8868\u8fbe\u548c\u5f53\u524d\u8bf4\u6cd5\u5f62\u6210\u5bf9\u7167\uff0c\u9002\u5408\u653e\u5728\u4e00\u8d77\u533a\u5206\u3002",
  detailPrev: "\u4e0a\u4e00\u6761",
  detailNext: "\u4e0b\u4e00\u6761",
  detailBackToCurrent: "\u8fd4\u56de",
  detailNoAiSimilar: "\u8fd8\u6ca1\u6709 AI \u540c\u7c7b\u5019\u9009\uff0c\u53ef\u5148\u5728\u8be6\u60c5\u91cc\u70b9\u300c\u67e5\u627e\u540c\u7c7b / \u5bf9\u7167\u8868\u8fbe\u300d\u3002",
  expressionTextLabel: "\u8868\u8fbe",
  expressionTextPlaceholder: "call it a day",
  sentenceLabel: "\u53e5\u5b50",
  sentencePlaceholder: "I think I should call it a day.",
  translationLabel: "\u4e2d\u6587\u91ca\u4e49\uff08\u53ef\u9009\uff09",
  translationPlaceholder: "\u4eca\u5929\u5148\u5230\u8fd9\u91cc / \u6536\u5de5",
  sourceSentenceLabel: "\u4f8b\u53e5 / \u8bed\u5883\uff08\u53ef\u9009\uff09",
  sentenceMainLabel: "\u53e5\u5b50",
  sentenceMainPlaceholder: "I was exhausted, so I decided to call it a day.",
  usageNoteLabel: "\u4f7f\u7528\u63d0\u793a\uff08\u53ef\u9009\uff09",
  usageNotePlaceholder:
    "\u4f8b\u5982\uff1a\u9002\u5408\u4ec0\u4e48\u65f6\u5019\u7528\uff1f\u8bed\u6c14\u4e0a\u6709\u4ec0\u4e48\u611f\u89c9\uff1f",
  sourceNoteLabel: "\u8bb0\u5f55\u6765\u6e90\uff08\u53ef\u9009\uff09",
  findMoreRelated: "\u627e\u66f4\u591a\u540c\u7c7b / \u5bf9\u7167\u8868\u8fbe",
  generatingSuggestions: "\u6b63\u5728\u751f\u6210\u5019\u9009...",
  currentInputCard: "\u5f53\u524d\u8f93\u5165",
  similarExpressionsAuto: "\u540c\u7c7b\u8868\u8fbe",
  contrastExpressionsAuto: "\u5bf9\u7167\u8868\u8fbe",
  noContrastExpressions: "\u6682\u65e0\u660e\u663e\u5bf9\u7167\u8868\u8fbe",
  saveSelectedExpressions: "\u5c06\u52fe\u9009\u9879\u52a0\u5165\u8868\u8fbe\u5e93",
  sentenceAutoHint: "\u53ea\u8f93\u5165\u82f1\u6587\u53e5\u5b50\u5373\u53ef\uff0c\u4fdd\u5b58\u65f6\u4f1a\u81ea\u52a8\u8865\u5168\u7ffb\u8bd1\u548c\u5b66\u4e60\u4fe1\u606f\u3002",
  sourceNotePlaceholder:
    "\u4f8b\u5982\uff1a\u4f60\u662f\u5728\u54ea\u91cc\u770b\u5230\u5b83\u7684\uff1f\u64ad\u5ba2 / \u89c6\u9891 / \u670b\u53cb\u804a\u5929",
  saveToLibrary: "\u4fdd\u5b58\u5230\u8868\u8fbe\u5e93",
  saveAndReview: "\u4fdd\u5b58\u5e76\u52a0\u5165\u590d\u4e60",
  saveSentence: "\u4fdd\u5b58\u53e5\u5b50",
  saveSentenceReview: "\u4fdd\u5b58\u53e5\u5b50",
  saveSuccess: "\u5df2\u52a0\u5165\u8868\u8fbe\u5e93\uff0c\u5e76\u81ea\u52a8\u8865\u5168\u5b66\u4e60\u4fe1\u606f",
  saveSentenceSuccess: "\u5df2\u4fdd\u5b58\u53e5\u5b50\u5230\u5b66\u4e60\u5e93",
  saveReviewSuccess: "\u5df2\u52a0\u5165\u8868\u8fbe\u5e93\uff0c\u6b63\u5728\u5f00\u59cb\u590d\u4e60",
  saveDuplicateSuccess: "\u8fd9\u4e2a\u8868\u8fbe\u5df2\u5728\u8868\u8fbe\u5e93\u91cc\uff0c\u5df2\u66f4\u65b0\u8bb0\u5f55\u5e76\u8865\u5168\u5b66\u4e60\u4fe1\u606f",
  saveSentenceDuplicateSuccess: "\u8fd9\u53e5\u5185\u5bb9\u5df2\u5728\u5b66\u4e60\u5e93\u91cc\uff0c\u5df2\u66f4\u65b0\u8bb0\u5f55",
  saveDuplicateReviewSuccess:
    "\u8fd9\u4e2a\u8868\u8fbe\u5df2\u5728\u8868\u8fbe\u5e93\u91cc\uff0c\u6b63\u5728\u5f00\u59cb\u590d\u4e60",
  autoEnrichStarted: "\u5df2\u4fdd\u5b58\uff0c\u6b63\u5728\u81ea\u52a8\u8865\u5168\u4e2d\u6587\u91ca\u4e49\u548c\u4f8b\u53e5...",
  autoEnrichFailedKeepSaved: "\u5df2\u4fdd\u5b58\uff0c\u4f46\u81ea\u52a8\u8865\u5168\u5931\u8d25\uff0c\u53ef\u7a0d\u540e\u70b9\u201c\u91cd\u8bd5\u8865\u5168\u201d\u3002",
  sourceNoteDisplay: "\u8bb0\u5f55\u6765\u6e90",
  manualRecorded: "\u624b\u52a8\u8bb0\u5f55",
  sentenceUnit: "\u53e5\u5b50\u5355\u5143",
  sentenceUnitHint: "\u8fd9\u662f\u4e00\u6761\u8bed\u5883\u53e5\u5b50\uff0c\u53ef\u4ece\u4e2d\u63d0\u70bc\u8868\u8fbe\u3002",
  sentenceSource: "\u53e5\u5b50\u6765\u6e90",
  sentenceSourceFallback: "\u624b\u52a8\u8bb0\u5f55\u7684\u53e5\u5b50",
  sentenceExpressions: "\u8fd9\u53e5\u91cc\u503c\u5f97\u8bb0\u7684\u8868\u8fbe",
  sentenceNoExpressions: "\u6682\u65e0\u6807\u8bb0\u8868\u8fbe\uff0c\u53ef\u4ece\u8fd9\u53e5\u7ee7\u7eed\u8bb0\u5f55\u3002",
  sentenceExpressionsHint: "\u70b9\u51fb\u300c\u4fdd\u5b58\u8fd9\u4e2a\u8868\u8fbe\u300d\uff0c\u76f4\u63a5\u52a0\u5165\u8868\u8fbe\u5e93\u3002",
  sentenceRecordExpression: "\u81ea\u5df1\u9009\u4e00\u6bb5\u6765\u8bb0\u5f55",
  sentenceSaveExpression: "\u4fdd\u5b58\u8fd9\u4e2a\u8868\u8fbe",
  sentenceSavedExpression: "\u5df2\u4fdd\u5b58",
  sentenceRecordHint: "\u4ece\u8fd9\u53e5\u91cc\u62c6\u51fa\u4e00\u6bb5\u503c\u5f97\u8bb0\u7684\u8868\u8fbe",
  sentenceRecordFormHint: "\u53ef\u9009\uff1a\u4ece\u8fd9\u53e5\u91cc\u63d0\u53d6\u4e00\u6bb5\u503c\u5f97\u8bb0\u7684\u8868\u8fbe\u3002",
  sentenceOpenExpressionComposer: "\u5df2\u6253\u5f00\u300c\u8bb0\u5f55\u8868\u8fbe\u300d",
  sentenceExpressionSaved: "\u5df2\u4fdd\u5b58\u5230\u8868\u8fbe\u5e93",
  missingExpression: "\u8bf7\u8f93\u5165\u8868\u8fbe\u6587\u672c",
  missingSentence: "\u8bf7\u8f93\u5165\u53e5\u5b50\u5185\u5bb9",
  tabs: {
    all: "\u5168\u90e8",
    saved: "\u5f85\u590d\u4e60",
    reviewing: "\u7ec3\u4e60\u4e2d",
    mastered: "\u5df2\u638c\u63e1",
  },
  listLoading: "\u8868\u8fbe\u52a0\u8f7d\u4e2d...",
  emptyTitle: "\u6682\u65e0\u8868\u8fbe",
  emptyDesc: "\u5148\u4ece\u573a\u666f\u4e2d\u6536\u85cf\u4e00\u4e9b\u8868\u8fbe\uff0c\u8fd9\u91cc\u4f1a\u6210\u4e3a\u4f60\u7684\u590d\u4e60\u5165\u53e3\u3002",
  noTranslation: "\u6682\u65e0\u7ffb\u8bd1",
  expressionUnit: "\u8868\u8fbe\u5355\u5143",
  sourceSentence: "\u4f8b\u53e5",
  noSourceSentence: "\u6682\u65e0\u53e5\u5b50\u4e0a\u4e0b\u6587",
  usageHint: "\u4f7f\u7528\u63d0\u793a",
  learningInfoPending: "\u5b66\u4e60\u4fe1\u606f\u751f\u6210\u4e2d",
  learningInfoPendingHint: "\u6b63\u5728\u8865\u5168\u7ffb\u8bd1\u3001\u4f8b\u53e5\u548c\u4f7f\u7528\u63d0\u793a\uff0c\u7a0d\u540e\u4f1a\u53d8\u6210\u5b8c\u6574\u5b66\u4e60\u5361\u3002",
  learningInfoFailed: "\u5b66\u4e60\u4fe1\u606f\u6682\u672a\u751f\u6210\uff0c\u53ef\u7a0d\u540e\u518d\u770b\u3002",
  retryEnrichment: "\u91cd\u8bd5\u8865\u5168",
  retryEnrichmentSuccess: "\u5df2\u5b8c\u6210\u8865\u5168",
  retryEnrichmentFailed: "\u8865\u5168\u5931\u8d25\uff0c\u53ef\u518d\u8bd5\u4e00\u6b21",
  semanticFocusLabel: "\u8bed\u4e49\u4fa7\u91cd",
  typicalScenarioLabel: "\u5178\u578b\u573a\u666f",
  semanticFocusPending: "\u6b63\u5728\u8865\u5168",
  typicalScenarioPending: "\u6b63\u5728\u8865\u5168",
  usageHintFallback: "\u8bd5\u7740\u628a\u8fd9\u4e2a\u8868\u8fbe\u653e\u8fdb\u4f60\u81ea\u5df1\u7684\u4e00\u53e5\u8bdd\u91cc\u3002",
  reviewStage: "\u5f53\u524d\u9636\u6bb5",
  reviewStageSavedHint: "\u5148\u8fc7\u4e00\u8f6e\uff0c\u5efa\u7acb\u719f\u6089\u611f\u3002",
  reviewStageReviewingHint: "\u7ee7\u7eed\u5de9\u56fa\uff0c\u628a\u5b83\u7528\u987a\u53e3\u3002",
  reviewStageMasteredHint: "\u5df2\u8fdb\u5165\u638c\u63e1\u9636\u6bb5\uff0c\u5076\u5c14\u56de\u770b\u5373\u53ef\u3002",
  reviewActionSavedHint: "\u5148\u8fc7\u4e00\u8f6e\uff0c\u5efa\u7acb\u719f\u6089\u611f",
  reviewActionReviewingHint: "\u8d81\u8fd8\u8bb0\u5f97\uff0c\u7ee7\u7eed\u5de9\u56fa",
  reviewActionMasteredHint: "\u5076\u5c14\u56de\u770b\uff0c\u9632\u6b62\u751f\u758f",
  startReview: "\u5f00\u59cb\u590d\u4e60",
  continueReview: "\u7ee7\u7eed\u590d\u4e60",
  revisitOne: "\u518d\u770b\u4e00\u904d",
  reviewFamily: "\u590d\u4e60\u8fd9\u7ec4",
  sentenceReviewPending: "\u53e5\u5b50\u590d\u4e60\u5f85\u5f00\u653e",
  openMap: "\u76f8\u5173\u8868\u8fbe",
  mapPending: "\u76f8\u5173\u8868\u8fbe\u751f\u6210\u4e2d",
  mapUnavailable: "\u6682\u65e0\u76f8\u5173\u8868\u8fbe",
  sourceScene: "\u6765\u6e90\u573a\u666f",
  expandDetail: "\u67e5\u770b\u89e3\u6790",
  collapseDetail: "\u6536\u8d77",
  inThisSentence: "\u5728\u8fd9\u53e5\u91cc",
  commonUsage: "\u5e38\u89c1\u7528\u6cd5",
  speakSentence: "\u6717\u8bfb",
  stopSpeaking: "\u505c\u6b62",
  speechUnsupported: "\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u53d1\u97f3",
  reviewStartFeedback: "\u5df2\u5f00\u59cb\u590d\u4e60\u8fd9\u4e2a\u8868\u8fbe",
  reviewFamilyFeedback: "\u5df2\u5f00\u59cb\u590d\u4e60\u8fd9\u7ec4\u8868\u8fbe",
  openMapFeedback: "\u5df2\u6253\u5f00\u76f8\u5173\u8868\u8fbe",
  mapTitle: "\u8868\u8fbe\u5730\u56fe",
  mapDesc: "\u67e5\u770b\u8be5\u8868\u8fbe\u7684\u76f8\u5173\u8bf4\u6cd5\uff0c\u53ef\u4ee5\u76f4\u63a5\u7ec4\u961f\u590d\u4e60\u6216\u52a0\u5165\u590d\u4e60\u6c60\u3002",
  mapLoading: "\u8868\u8fbe\u5730\u56fe\u751f\u6210\u4e2d...",
  mapFailed: "\u751f\u6210\u8868\u8fbe\u5730\u56fe\u5931\u8d25\u3002",
  mapEmpty: "\u6682\u65e0\u53ef\u7528\u8868\u8fbe\u7ec4\u3002",
  centerExpression: "\u4e2d\u5fc3\u8868\u8fbe",
  relatedExpressions: "\u76f8\u5173\u8868\u8fbe",
  clusterMeaning: "\u7c07\u542b\u4e49",
  practiceCluster: "\u7ec3\u8fd9\u4e2a\u8868\u8fbe\u7c07",
  addCluster: "\u5c06\u8fd9\u4e2a\u7c07\u52a0\u5165\u590d\u4e60",
  addClusterSuccess: "\u8be5\u8868\u8fbe\u7c07\u5df2\u52a0\u5165\u590d\u4e60\u6c60\u3002",
  clusterEmpty: "\u8be5\u8868\u8fbe\u7c07\u6682\u65e0\u8868\u8fbe\u3002",
  statusUnknown: "\u672a\u52a0\u5165\u590d\u4e60",
  diffSame: "\u4e2d\u5fc3\u8868\u8fbe",
  diffRelated: "\u76f8\u5173\u8868\u8fbe",
  diffColloquial: "\u66f4\u53e3\u8bed",
  diffSpecific: "\u66f4\u5177\u4f53",
  diffRecoverRoutine: "\u66f4\u504f\u6062\u590d\u89c4\u5f8b",
  diffRestart: "\u66f4\u504f\u91cd\u65b0\u5f00\u59cb",
  mapLimitedPrefix: "\u4ec5\u5c55\u793a\u6700\u76f8\u5173\u7684",
  mapLimitedSuffix: "\u6761",
  similarExpressions: "\u540c\u7c7b\u8868\u8fbe",
  showSimilar: "\u5c55\u5f00\u540c\u7c7b\u8868\u8fbe",
  hideSimilar: "\u6536\u8d77\u540c\u7c7b\u8868\u8fbe",
  similarEmpty: "\u6682\u65e0\u5df2\u5efa\u7acb\u7684\u540c\u7c7b\u8868\u8fbe\u3002",
  viewAllSimilar: "\u67e5\u770b\u66f4\u591a\u540c\u7c7b\u8868\u8fbe",
  findMoreSimilar: "\u627e\u66f4\u591a\u540c\u7c7b\u8868\u8fbe",
  expandSimilar: "\u6269\u5c55\u540c\u7c7b\u8868\u8fbe",
  generatingSimilar: "\u540c\u7c7b\u8868\u8fbe\u751f\u6210\u4e2d",
  generatedSimilarTitle: "AI \u5019\u9009\u540c\u7c7b\u8868\u8fbe",
  generatedSimilarDesc:
    "\u5148\u52fe\u9009\u4f60\u8981\u7684\u5019\u9009\uff0c\u518d\u52a0\u5165\u8868\u8fbe\u5e93\u5e76\u5efa\u7acb\u540c\u7c7b\u5173\u8054\u3002",
  noGeneratedSimilar: "\u6682\u672a\u751f\u6210\u5230\u5408\u9002\u5019\u9009\uff0c\u53ef\u518d\u8bd5\u4e00\u6b21\u3002",
  addSelectedSimilar: "\u52a0\u5165\u8868\u8fbe\u5e93\u5e76\u5efa\u7acb\u540c\u7c7b\u5173\u8054",
  addSelectedSimilarSuccess: "\u5df2\u52a0\u5165\u9009\u4e2d\u5019\u9009\u5e76\u5efa\u7acb\u540c\u7c7b\u5173\u8054\u3002",
  selectAtLeastOne: "\u8bf7\u81f3\u5c11\u9009\u62e9 1 \u4e2a\u5019\u9009\u3002",
  viewingClusterFilter: "\u6b63\u5728\u67e5\u770b\u8fd9\u4e00\u7ec4\u540c\u7c7b\u8868\u8fbe",
  filteredClusterPrefix: "\u5df2\u7b5b\u9009\uff1a",
  filteredClusterSuffix: "\u8fd9\u4e2a\u8868\u8fbe\u7c07",
  mergeCluster: "\u5408\u5e76\u5230\u5f53\u524d\u4e3b\u7c07",
  mergeClusterSuccess: "\u5df2\u5408\u5e76\u8868\u8fbe\u7c07",
  moveIntoCluster: "\u79fb\u5165\u5f53\u524d\u8868\u8fbe\u7c07",
  moveIntoClusterTitle: "\u79fb\u5165\u5f53\u524d\u8868\u8fbe\u7c07",
  quickAddRelatedTitle: "\u6dfb\u52a0\u5173\u8054\u8868\u8fbe",
  quickAddRelatedDesc: "\u76f4\u63a5\u628a\u4f60\u624b\u52a8\u60f3\u5230\u7684\u8868\u8fbe\u6302\u5230\u5f53\u524d\u4e3b\u8868\u8fbe\u4e0a\uff0c\u4fdd\u5b58\u540e\u4f1a\u81ea\u52a8\u8865\u5168\u5b66\u4e60\u4fe1\u606f\u3002",
  quickAddTargetLabel: "\u5f53\u524d\u4e3b\u8868\u8fbe",
  quickAddCopyTarget: "\u70b9\u51fb\u590d\u5236",
  quickAddCopySuccess: "\u5df2\u590d\u5236\u5f53\u524d\u4e3b\u8868\u8fbe\u3002",
  quickAddCopyFailed: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
  quickAddTextLabel: "\u5173\u8054\u8868\u8fbe",
  quickAddTextPlaceholder: "get through the day",
  quickAddRelationTypeLabel: "\u5173\u8054\u7c7b\u578b",
  quickAddSimilar: "\u540c\u7c7b",
  quickAddContrast: "\u5bf9\u7167",
  quickAddSubmit: "\u4fdd\u5b58\u5173\u8054\u8868\u8fbe",
  quickAddSuccessSimilar: "\u5df2\u52a0\u5165\u540c\u7c7b\u8868\u8fbe\u5e76\u5efa\u7acb\u5173\u8054\u3002",
  quickAddSuccessContrast: "\u5df2\u52a0\u5165\u5bf9\u7167\u8868\u8fbe\u5e76\u5efa\u7acb\u5173\u8054\u3002",
  quickAddDuplicateCurrent: "\u4e0d\u80fd\u628a\u5f53\u524d\u4e3b\u8868\u8fbe\u91cd\u590d\u52a0\u5165\u4e3a\u5173\u8054\u9879\u3002",
  quickAddDuplicateSimilar: "\u8fd9\u6761\u540c\u7c7b\u8868\u8fbe\u5df2\u5728\u5f53\u524d\u5217\u8868\u91cc\u4e86\u3002",
  quickAddDuplicateContrast: "\u8fd9\u6761\u5bf9\u7167\u8868\u8fbe\u5df2\u5728\u5f53\u524d\u5217\u8868\u91cc\u4e86\u3002",
  quickAddExistingLibraryHint: "\u8fd9\u6761\u8868\u8fbe\u5df2\u5728\u8868\u8fbe\u5e93\u91cc\uff0c\u4fdd\u5b58\u540e\u4f1a\u76f4\u63a5\u4e0e\u5f53\u524d\u4e3b\u8868\u8fbe\u5efa\u7acb\u5173\u8054\u3002",
  regenerateAudioSuccess: "\u5df2\u91cd\u65b0\u751f\u6210\u5f53\u524d\u8be6\u60c5\u7684\u97f3\u9891\u3002",
  regenerateAudioFailed: "\u91cd\u65b0\u751f\u6210\u97f3\u9891\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
  moveIntoClusterDesc:
    "\u53ef\u4ee5\u4e00\u6b21\u52fe\u9009\u591a\u4e2a\u8868\u8fbe\u6216\u5176\u5b50\u8868\u8fbe\uff0c\u7edf\u4e00\u79fb\u5165\u5f53\u524d\u4e3b\u8868\u8fbe\u6240\u5728\u7684\u7c07\u3002",
  moveIntoClusterCurrentMain: "\u5f53\u524d\u76ee\u6807\u4e3b\u8868\u8fbe",
  moveIntoClusterSourceCluster: "\u6765\u6e90\u8868\u8fbe\u7c07",
  moveIntoClusterStandalone: "\u72ec\u7acb\u8868\u8fbe",
  moveIntoClusterSubExpression: "\u5b50\u8868\u8fbe",
  moveIntoClusterMainExpression: "\u4e3b\u8868\u8fbe",
  moveIntoClusterExpand: "\u5c55\u5f00",
  moveIntoClusterCollapse: "\u6536\u8d77",
  moveIntoClusterMemberCountSuffix: "\u4e2a\u8868\u8fbe",
  moveIntoClusterEmpty: "\u6682\u65e0\u53ef\u79fb\u5165\u7684\u8868\u8fbe\u3002",
  moveIntoClusterSelectOne: "\u8bf7\u81f3\u5c11\u9009\u62e9 1 \u4e2a\u8981\u79fb\u5165\u7684\u8868\u8fbe\u3002",
  moveIntoClusterSelectGroup: "\u5168\u9009",
  moveIntoClusterSelectedGroup: "\u5df2\u5168\u9009",
  moveIntoClusterCoveredByMain: "\u968f\u6574\u7c07\u4e00\u8d77\u79fb\u5165",
  moveIntoClusterDisabledHint: "\u5f53\u524d\u6ca1\u6709\u53ef\u79fb\u5165\u7684\u5176\u4ed6\u8868\u8fbe\u3002",
  moveIntoClusterSubmit: "\u786e\u8ba4\u79fb\u5165",
  moveIntoClusterSuccess: "\u5df2\u79fb\u5165",
  moveIntoClusterPartialFailed: "\u90e8\u5206\u79fb\u5165\u5931\u8d25",
  detachClusterMember: "\u8bbe\u7f6e\u4e3a\u72ec\u7acb\u4e3b\u8868\u8fbe",
  detachClusterMemberSuccess: "\u5df2\u8bbe\u7f6e\u4e3a\u72ec\u7acb\u4e3b\u8868\u8fbe",
  detachClusterMemberConfirmTitle: "\u8bbe\u7f6e\u4e3a\u72ec\u7acb\u4e3b\u8868\u8fbe\uff1f",
  detachClusterMemberConfirmDesc:
    "\u8fd9\u4f1a\u5c06\u8be5\u8868\u8fbe\u79fb\u51fa\u5f53\u524d\u8868\u8fbe\u7c07\uff0c\u5e76\u6210\u4e3a\u4e00\u4e2a\u72ec\u7acb\u4e3b\u8868\u8fbe\u3002",
  confirmCancel: "\u53d6\u6d88",
  confirmContinue: "\u786e\u8ba4",
  clearClusterFilter: "\u8fd4\u56de\u5168\u90e8\u8868\u8fbe",
  diffGentle: "\u66f4\u6e29\u548c",
  diffOverdoReminder: "\u66f4\u504f\u63d0\u9192\u522b\u505a\u8fc7\u5934",
  diffIntense: "\u66f4\u5f3a\u70c8",
  diffDirectPrediction: "\u66f4\u504f\u76f4\u63a5\u9884\u6d4b",
  diffEvidenceBased: "\u66f4\u504f\u6709\u8ff9\u8c61",
  diffTiredState: "\u66f4\u5e38\u7528\u4e8e\u75b2\u60eb\u72b6\u6001",
  close: "\u5173\u95ed",
};

const reviewStatusLabel: Record<PhraseReviewStatus, string> = {
  saved: zh.tabs.saved,
  reviewing: zh.tabs.reviewing,
  mastered: zh.tabs.mastered,
  archived: "\u5df2\u5f52\u6863",
};

const isContrastDerivedExpression = (sourceNote: string | null | undefined) => {
  const normalized = (sourceNote ?? "").trim().toLowerCase();
  return normalized === "manual-contrast-ai" || normalized === "focus-contrast-ai";
};

const asReviewSessionExpressions = (rows: UserPhraseItemResponse[]) =>
  rows.map((row) => ({
    userPhraseId: row.userPhraseId,
    text: row.text,
    expressionClusterId: row.expressionClusterId,
  }));

const filterRowsByClusterExpressions = (
  rows: UserPhraseItemResponse[],
  cluster: ExpressionCluster,
  selected: UserPhraseItemResponse | null,
) => {
  const clusterTextSet = new Set(cluster.expressions.map((text) => normalizePhraseText(text)));
  const selectedClusterId = selected?.expressionClusterId ?? null;
  return rows.filter((row) => {
    if (selectedClusterId && row.expressionClusterId && row.expressionClusterId === selectedClusterId) {
      return true;
    }
    return clusterTextSet.has(normalizePhraseText(row.text));
  });
};

const tokenize = (value: string) =>
  normalizePhraseText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

const hasContraction = (value: string) => /(?:\w+'\w+)|(?:\w+n['’]t)/i.test(value);

const hasAnyToken = (tokens: string[], candidates: string[]) =>
  candidates.some((candidate) => tokens.includes(candidate));

const SIMILAR_LABEL_FALLBACK = [
  zh.diffGentle,
  zh.diffOverdoReminder,
  zh.diffIntense,
  zh.diffColloquial,
  zh.diffDirectPrediction,
  zh.diffEvidenceBased,
  zh.diffTiredState,
  zh.diffSpecific,
  zh.diffRelated,
];
const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

const normalizeSimilarLabel = (label: string | null | undefined) => {
  const trimmed = (label ?? "").trim();
  if (!trimmed) return zh.diffRelated;
  if (SIMILAR_LABEL_FALLBACK.includes(trimmed)) return trimmed;
  return zh.diffRelated;
};

const buildDifferenceNote = (centerExpression: string, targetExpression: string) => {
  const center = normalizePhraseText(centerExpression);
  const target = normalizePhraseText(targetExpression);
  if (!center || !target) return zh.diffRelated;
  if (center === target) return zh.diffSame;

  const centerTokens = tokenize(centerExpression);
  const targetTokens = tokenize(targetExpression);
  if (
    hasAnyToken(targetTokens, [
      "don't",
      "dont",
      "avoid",
      "stop",
      "ease",
      "easy",
      "careful",
      "too",
      "hard",
      "push",
    ])
  ) {
    return zh.diffOverdoReminder;
  }
  if (
    hasAnyToken(targetTokens, ["a bit", "slightly", "gentle", "easier", "lighter", "take it easy"]) ||
    targetTokens.length < centerTokens.length
  ) {
    return zh.diffGentle;
  }
  if (hasAnyToken(targetTokens, ["really", "totally", "absolutely", "extremely"])) {
    return zh.diffIntense;
  }
  if (
    hasAnyToken(targetTokens, [
      "sign",
      "signs",
      "looking",
      "seem",
      "appears",
      "seems",
      "likely",
      "headed",
    ])
  ) {
    return zh.diffEvidenceBased;
  }
  if (hasAnyToken(targetTokens, ["going", "gonna", "will"])) {
    return zh.diffDirectPrediction;
  }
  if (hasAnyToken(targetTokens, ["tired", "worn", "exhausted", "wiped", "drained", "empty"])) {
    return zh.diffTiredState;
  }
  if (hasContraction(targetExpression) && !hasContraction(centerExpression)) {
    return zh.diffColloquial;
  }
  if (targetTokens.length >= centerTokens.length + 2) {
    return zh.diffSpecific;
  }
  return zh.diffRelated;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderSentenceWithExpressionHighlight = (sentence: string, expression: string) => {
  const source = sentence.trim();
  const target = expression.trim();
  if (!source || !target) return source;

  const lowerSource = source.toLowerCase();
  const lowerTarget = target.toLowerCase();
  const directStart = lowerSource.indexOf(lowerTarget);
  if (directStart >= 0) {
    const directEnd = directStart + target.length;
    return (
      <>
        {source.slice(0, directStart)}
        <mark className="rounded bg-primary/10 px-0.5 text-primary">
          {source.slice(directStart, directEnd)}
        </mark>
        {source.slice(directEnd)}
      </>
    );
  }

  const targetTokens = tokenize(target).filter((token) => token.length >= 3);
  const fallbackToken = targetTokens.sort((a, b) => b.length - a.length)[0];
  if (!fallbackToken) return source;

  const tokenRegex = new RegExp(`\\b${escapeRegExp(fallbackToken)}\\b`, "i");
  const match = source.match(tokenRegex);
  if (!match || match.index == null) return source;
  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {source.slice(0, start)}
      <mark className="rounded bg-primary/10 px-0.5 text-primary">{source.slice(start, end)}</mark>
      {source.slice(end)}
    </>
  );
};

const renderExampleSentenceCards = (
  examples: Array<{ en: string; zh: string }>,
  expression: string,
  options?: {
    onSpeak?: (text: string) => void;
    isSpeakingText?: (text: string) => boolean;
    isLoadingText?: (text: string) => boolean;
  },
) => {
  if (examples.length === 0) return null;
  return (
    <div className="space-y-2">
      {examples.map((example, index) => (
        <div key={`${example.en}-${index}`} className="rounded-xl bg-[rgb(246,246,246)] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm text-foreground/90">
              {renderSentenceWithExpressionHighlight(example.en, expression)}
            </p>
            {options?.onSpeak ? (
              <TtsActionButton
                active={options.isSpeakingText?.(example.en) ?? false}
                loading={options.isLoadingText?.(example.en) ?? false}
                onClick={() => options.onSpeak?.(example.en)}
                className="mt-0.5 h-auto shrink-0 px-0 text-xs text-muted-foreground hover:text-foreground"
                iconClassName="size-4"
                label={zh.speakSentence}
              />
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{example.zh}</p>
        </div>
      ))}
    </div>
  );
};

type FocusDetailState = {
  text: string;
  differenceLabel?: string | null;
  kind: "current" | "library-similar" | "suggested-similar" | "contrast";
  savedItem: UserPhraseItemResponse | null;
  assistItem: ManualExpressionAssistResponse["inputItem"] | null;
};

type FocusDetailTabValue = "info" | "similar" | "contrast";

type FocusDetailTrailItem = {
  userPhraseId: string | null;
  text: string;
  differenceLabel?: string | null;
  kind: FocusDetailState["kind"];
  tab: FocusDetailTabValue;
};

type FocusDetailConfirmAction = "set-cluster-main" | "set-standalone-main";

const extractExpressionsFromSentenceItem = (item: UserPhraseItemResponse) => {
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

export default function ChunksPage() {
  const router = useRouter();
  const ttsPlaybackState = useTtsPlaybackState();
  const [playingText, setPlayingText] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const {
    routeState,
    query,
    setQuery,
    reviewFilter,
    setReviewFilter,
    contentFilter,
    setContentFilter,
    expressionClusterFilterId,
    setExpressionClusterFilterId,
  } = useChunksRouteState({
    searchParams,
    router,
  });
  const [expressionViewMode, setExpressionViewMode] = useState<"list" | "focus">("focus");

  // 地图与列表展示
  const [mapOpen, setMapOpen] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<ExpressionMapResponse | null>(null);
  const [mapSourceExpression, setMapSourceExpression] = useState<UserPhraseItemResponse | null>(
    null,
  );
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [addingCluster, setAddingCluster] = useState(false);
  const [mapOpeningForId, setMapOpeningForId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [expandedSimilarIds, setExpandedSimilarIds] = useState<Record<string, boolean>>({});
  // 手动添加与相似表达
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [manualItemType, setManualItemType] = useState<"expression" | "sentence">("expression");
  const [manualText, setManualText] = useState("");
  const [manualSentence, setManualSentence] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [savingSentenceExpressionKey, setSavingSentenceExpressionKey] = useState<string | null>(
    null,
  );
  const [savedSentenceExpressionKeys, setSavedSentenceExpressionKeys] = useState<
    Record<string, boolean>
  >({});
  const [retryingEnrichmentIds, setRetryingEnrichmentIds] = useState<Record<string, boolean>>({});
  // Focus 主表达与详情
  const [focusExpressionId, setFocusExpressionId] = useState<string>("");
  const [focusRelationTab, setFocusRelationTab] = useState<"similar" | "contrast">("similar");
  const [expandedFocusMainId, setExpandedFocusMainId] = useState<string | null>(null);
  const [focusRelationActiveText, setFocusRelationActiveText] = useState("");
  const [detailConfirmAction, setDetailConfirmAction] = useState<FocusDetailConfirmAction | null>(null);
  const [expandedMoveIntoClusterGroups, setExpandedMoveIntoClusterGroups] = useState<Record<string, boolean>>({});
  const [selectedMoveIntoClusterMap, setSelectedMoveIntoClusterMap] = useState<Record<string, boolean>>({});
  const [focusDetailActionsOpen, setFocusDetailActionsOpen] = useState(false);
  const [quickAddRelatedOpen, setQuickAddRelatedOpen] = useState(false);
  const [quickAddRelatedText, setQuickAddRelatedText] = useState("");
  const [quickAddRelatedType, setQuickAddRelatedType] = useState<"similar" | "contrast">("similar");
  const [savingQuickAddRelated, setSavingQuickAddRelated] = useState(false);
  const quickAddRelatedInputRef = useRef<HTMLInputElement | null>(null);
  const [regeneratingDetailAudio, setRegeneratingDetailAudio] = useState(false);

  useEffect(
    () => () => {
      stopTtsPlayback();
    },
    [],
  );

  useEffect(() => {
    if (!quickAddRelatedOpen) return;

    const timer = window.setTimeout(() => {
      quickAddRelatedInputRef.current?.focus();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [quickAddRelatedOpen]);

  const { loading, phrases, setPhrases, total, listDataSource, loadPhrases } = useChunksListData({
    query,
    reviewFilter,
    contentFilter,
    expressionClusterFilterId,
    onLoadFailed: (message) => {
      toast.error(message || zh.loadFailed);
    },
  });

  const summary = useMemo(() => {
    return buildChunksSummary({
      loading,
      total,
      labels: {
        loading: zh.loading,
        total: zh.total,
        items: zh.items,
      },
    });
  }, [loading, total]);

  const phraseByNormalized = useMemo(() => {
    const map = new Map<string, UserPhraseItemResponse>();
    for (const row of phrases) {
      map.set(normalizePhraseText(row.text), row);
    }
    return map;
  }, [phrases]);

  const clusterMembersByClusterId = useMemo(() => {
    const map = new Map<string, UserPhraseItemResponse[]>();
    for (const row of phrases) {
      if (row.learningItemType !== "expression" || !row.expressionClusterId) continue;
      const bucket = map.get(row.expressionClusterId) ?? [];
      bucket.push(row);
      map.set(row.expressionClusterId, bucket);
    }
    return map;
  }, [phrases]);

  const expressionRows = useMemo(
    () => phrases.filter((row) => row.learningItemType === "expression"),
    [phrases],
  );

  // Focus 视图与表达簇 selector
  const focusMainExpressionRows = useMemo(
    () => getFocusMainExpressionRows(expressionRows, focusExpressionId),
    [expressionRows, focusExpressionId],
  );

  const resolveFocusMainExpressionIdForRow = useCallback(
    (userPhraseId: string) => {
      return resolveFocusMainExpressionId(expressionRows, userPhraseId);
    },
    [expressionRows],
  );

  // Focus 主表达切换
  const switchFocusMainExpression = useCallback(
    (userPhraseId: string) => {
      setFocusExpressionId(resolveFocusMainExpressionIdForRow(userPhraseId));
    },
    [resolveFocusMainExpressionIdForRow],
  );

  const assignFocusMainExpression = useCallback(
    (item: UserPhraseItemResponse) => {
      setFocusExpressionId(item.userPhraseId);
    },
    [],
  );

  const focusExpression = useMemo(() => {
    if (focusMainExpressionRows.length === 0) return null;
    const resolvedId = resolveFocusExpressionId({
      contentFilter,
      focusExpressionId,
      focusMainExpressionIds: focusMainExpressionRows.map((row) => row.userPhraseId),
      resolveFocusMainExpressionId: resolveFocusMainExpressionIdForRow,
    });
    return (
      focusMainExpressionRows.find((row) => row.userPhraseId === resolvedId) ??
      focusMainExpressionRows[0]
    );
  }, [
    contentFilter,
    focusExpressionId,
    focusMainExpressionRows,
    resolveFocusMainExpressionIdForRow,
  ]);

  const clusterFilterExpressionLabel = useMemo(() => {
    return resolveClusterFilterExpressionLabel({
      expressionClusterFilterId,
      phrases,
    });
  }, [expressionClusterFilterId, phrases]);

  const expressionMapViewModel = useMemo(
    () =>
      buildExpressionMapViewModel({
        mapData,
        activeClusterId,
        mapSourceExpression,
        phrases,
      }),
    [activeClusterId, mapData, mapSourceExpression, phrases],
  );

  const {
    activeCluster,
    expressionStatusByNormalized,
    centerExpressionText,
    displayedClusterExpressions,
  } = expressionMapViewModel;

  const getPrimaryActionLabel = (item: UserPhraseItemResponse) => {
    if (item.learningItemType === "sentence") return zh.sentenceReviewPending;
    if (item.reviewStatus === "reviewing") return zh.continueReview;
    if (item.reviewStatus === "mastered") {
      return item.expressionClusterId ? zh.reviewFamily : zh.revisitOne;
    }
    return zh.startReview;
  };

  const focusSavedSimilarRows = useMemo(() => {
    if (!focusExpression?.expressionClusterId) return [] as UserPhraseItemResponse[];
    return (clusterMembersByClusterId.get(focusExpression.expressionClusterId) ?? []).filter(
      (row) => row.userPhraseId !== focusExpression.userPhraseId,
    );
  }, [clusterMembersByClusterId, focusExpression]);

  const moveIntoClusterCandidates = useMemo(() => {
    const targetClusterId = focusExpression?.expressionClusterId ?? null;
    if (!focusExpression) return [] as MoveIntoClusterCandidate[];

    const rowById = new Map(expressionRows.map((row) => [row.userPhraseId, row]));
    return expressionRows
      .filter((row) => {
        if (row.userPhraseId === focusExpression.userPhraseId) return false;
        if (targetClusterId && row.expressionClusterId && row.expressionClusterId === targetClusterId) return false;
        return true;
      })
      .map((row) => {
        const sourceClusterId = row.expressionClusterId ?? null;
        const sourceClusterMainId = sourceClusterId
          ? row.expressionClusterMainUserPhraseId ?? null
          : null;
        const sourceClusterMainText =
          (sourceClusterMainId ? rowById.get(sourceClusterMainId)?.text : null) ?? row.text;
        const sourceClusterMemberCount = sourceClusterId
          ? (clusterMembersByClusterId.get(sourceClusterId)?.length ?? 1)
          : 1;

        return {
          row,
          sourceClusterId,
          sourceClusterMainText,
          sourceClusterMemberCount,
          isSourceMain: sourceClusterId ? row.userPhraseId === sourceClusterMainId : true,
        } satisfies MoveIntoClusterCandidate;
      })
      .sort((a, b) => {
        const sourceDelta = a.sourceClusterMainText.localeCompare(b.sourceClusterMainText);
        if (sourceDelta !== 0) return sourceDelta;
        return a.row.text.localeCompare(b.row.text);
      });
  }, [
    clusterMembersByClusterId,
    expressionRows,
    focusExpression,
  ]);

  const moveIntoClusterGroups = useMemo(() => {
    const groups = new Map<string, MoveIntoClusterGroup>();
    for (const candidate of moveIntoClusterCandidates) {
      const key = candidate.sourceClusterId ?? `standalone:${candidate.row.userPhraseId}`;
      const existing = groups.get(key);
      if (existing) {
        existing.candidates.push(candidate);
        continue;
      }

      groups.set(key, {
        key,
        title: candidate.sourceClusterId ? candidate.sourceClusterMainText : candidate.row.text,
        description: candidate.sourceClusterId
          ? `${zh.moveIntoClusterSourceCluster}\u00b7 ${candidate.sourceClusterMemberCount}${zh.moveIntoClusterMemberCountSuffix}`
          : zh.moveIntoClusterStandalone,
        candidates: [candidate],
        isCluster: Boolean(candidate.sourceClusterId),
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        isCluster: Boolean(group.isCluster && group.candidates.length > 1),
        candidates: [...group.candidates].sort((a, b) => {
          const mainDelta =
            Number(b.row.text === group.title) - Number(a.row.text === group.title);
          if (mainDelta !== 0) return mainDelta;
          return a.row.text.localeCompare(b.row.text);
        }),
      }))
      .sort((a, b) => {
        const clusterDelta = Number(b.isCluster) - Number(a.isCluster);
        if (clusterDelta !== 0) return clusterDelta;
        return a.title.localeCompare(b.title);
      });
  }, [moveIntoClusterCandidates]);

  const {
    focusAssistLoading,
    focusAssistData,
    resetFocusAssist,
    loadFocusAssist,
    savingFocusCandidateKeys,
    completedFocusCandidateKeys,
    saveFocusCandidate,
  } = useFocusAssist({
    expressionRows,
    onLoadFailed: (message) => {
      toast.error(message || zh.loadFailed);
    },
    onCandidateSaved: async ({ focusItem, candidate, kind }) => {
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      invalidateSavedRelations([focusItem.userPhraseId]);
      toast.success(zh.addSelectedSimilarSuccess);
    },
  });
  const focusSimilarItems = useMemo(() => {
    const items: Array<{
      key: string;
      text: string;
      differenceLabel?: string;
      kind: FocusDetailState["kind"];
      savedItem: UserPhraseItemResponse | null;
    }> = [];
    const seen = new Set<string>();

    for (const row of focusSavedSimilarRows) {
      const normalized = normalizePhraseText(row.text);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      items.push({
        key: `saved:${row.userPhraseId}`,
        text: row.text,
        differenceLabel: focusExpression ? buildDifferenceNote(focusExpression.text, row.text) : undefined,
        kind: "library-similar",
        savedItem: row,
      });
    }

    for (const candidate of focusAssistData?.similarExpressions ?? []) {
      const normalized = normalizePhraseText(candidate.text);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      items.push({
        key: `ai:${normalized}`,
        text: candidate.text,
        differenceLabel: candidate.differenceLabel,
        kind: "suggested-similar",
        savedItem: phraseByNormalized.get(normalized) ?? null,
      });
    }
    return items;
  }, [focusAssistData?.similarExpressions, focusExpression, focusSavedSimilarRows, phraseByNormalized]);

  const focusContrastItems = useMemo(() => {
    return (focusAssistData?.contrastExpressions ?? []).map((candidate) => {
      const normalized = normalizePhraseText(candidate.text);
      return {
        key: `contrast:${normalized}`,
        text: candidate.text,
        differenceLabel: candidate.differenceLabel,
        kind: "contrast" as const,
        savedItem: phraseByNormalized.get(normalized) ?? null,
      };
    });
  }, [focusAssistData?.contrastExpressions, phraseByNormalized]);

  const {
    focusDetailOpen,
    setFocusDetailOpen,
    focusDetailLoading,
    setFocusDetailLoading,
    focusDetail,
    setFocusDetail,
    focusDetailTab,
    setFocusDetailTab,
    focusDetailTrail,
    setFocusDetailTrail,
    openFocusDetail: openFocusDetailBase,
    openFocusSiblingDetail: openFocusSiblingDetailBase,
    reopenFocusTrailItem,
  } = useFocusDetailController({
    phraseByNormalized,
    expressionRows,
    focusSimilarItems,
    focusContrastItems,
    focusRelationTab,
    resolveFocusMainExpressionIdForRow,
    onSetFocusExpressionId: setFocusExpressionId,
    onLoadFailed: (message) => {
      toast.error(message || zh.loadFailed);
    },
  });
  const openFocusDetail = useCallback(
    (params: Parameters<typeof openFocusDetailBase>[0]) => {
      setFocusDetailActionsOpen(false);
      return openFocusDetailBase(params);
    },
    [openFocusDetailBase],
  );
  const openFocusSiblingDetail = useCallback(
    (direction: -1 | 1) => {
      setFocusDetailActionsOpen(false);
      openFocusSiblingDetailBase(direction);
    },
    [openFocusSiblingDetailBase],
  );

  const {
    savedRelationCache,
    savedRelationRowsBySourceId,
    savedRelationLoadingKey,
    focusRelationsBootstrapDone,
    invalidateSavedRelations,
  } = useSavedRelations({
    contentFilter,
    expressionViewMode,
    expressionRows,
    focusDetailUserPhraseId: focusDetail?.savedItem?.userPhraseId ?? null,
    onLoadFailed: (message) => {
      toast.error(message || zh.loadFailed);
    },
  });
  const {
    manualExpressionAssist,
    manualAssistLoading,
    manualSelectedMap,
    savingManualExpression,
    clearManualExpressionAssist,
    resetManualExpressionComposer,
    toggleManualSelected,
    loadManualExpressionAssist,
    saveManualExpression,
  } = useManualExpressionComposer({
    expressionRows,
    onError: (message) => {
      toast.error(message || zh.loadFailed);
    },
    onPartialEnrichFailed: () => {
      toast.error(zh.autoEnrichFailedKeepSaved);
    },
  });
  const { savingManualSentence, saveManualSentence } = useManualSentenceComposer({
    onError: (message) => {
      toast.error(message || zh.loadFailed);
    },
  });
  useEffect(() => {
    if (contentFilter !== "expression") return;
    if (focusMainExpressionRows.length === 0) {
      setFocusExpressionId("");
      resetFocusAssist();
      return;
    }
    const resolvedId = resolveFocusExpressionId({
      contentFilter,
      focusExpressionId,
      focusMainExpressionIds: focusMainExpressionRows.map((row) => row.userPhraseId),
      resolveFocusMainExpressionId: resolveFocusMainExpressionIdForRow,
    });
    if (!resolvedId) {
      setFocusExpressionId("");
      return;
    }
    if (!focusMainExpressionRows.some((row) => row.userPhraseId === resolvedId)) {
      setFocusExpressionId(focusMainExpressionRows[0].userPhraseId);
      return;
    }
    if (resolvedId !== focusExpressionId) {
      setFocusExpressionId(resolvedId);
    }
  }, [contentFilter, focusExpressionId, focusMainExpressionRows, resetFocusAssist, resolveFocusMainExpressionIdForRow]);

  useEffect(() => {
    resetFocusAssist();
    setFocusRelationTab("similar");
  }, [focusExpressionId, resetFocusAssist]);

  useEffect(() => {
    const sourceItems = focusRelationTab === "contrast" ? focusContrastItems : focusSimilarItems;
    if (sourceItems.length === 0) {
      setFocusRelationActiveText("");
      return;
    }
    if (!focusRelationActiveText) {
      setFocusRelationActiveText(sourceItems[0].text);
      return;
    }
    const exists = sourceItems.some(
      (item) => normalizePhraseText(item.text) === normalizePhraseText(focusRelationActiveText),
    );
    if (!exists) {
      setFocusRelationActiveText(sourceItems[0].text);
    }
  }, [focusContrastItems, focusRelationActiveText, focusRelationTab, focusSimilarItems]);

  const startReviewFromCard = (item: UserPhraseItemResponse) => {
    if (item.learningItemType === "sentence") {
      toast.message(zh.sentenceReviewPending);
      return;
    }
    if (item.reviewStatus === "mastered" && item.expressionClusterId) {
      const clusterRows = phrases.filter((row) => row.expressionClusterId === item.expressionClusterId);
      if (clusterRows.length > 0) {
        toast.success(zh.reviewFamilyFeedback);
        startReviewSession({
          router,
          source: "expression-library-card",
          expressions: asReviewSessionExpressions(clusterRows),
        });
        return;
      }
    }
    toast.success(zh.reviewStartFeedback);
    startReviewSession({
      router,
      source: "expression-library-card",
      expressions: asReviewSessionExpressions([item]),
    });
  };

  const openExpressionComposerFromSentence = () => {
    setManualItemType("expression");
    setManualText("");
    resetManualExpressionComposer();
    setAddSheetOpen(true);
    toast.message(zh.sentenceOpenExpressionComposer);
  };

  const saveExpressionFromSentence = async (item: UserPhraseItemResponse, expression: string) => {
    const normalized = normalizePhraseText(expression);
    if (!normalized) return;
    const key = `${item.userPhraseId}:${normalized}`;
    if (savingSentenceExpressionKey === key) return;
    setSavingSentenceExpressionKey(key);
    try {
      await savePhraseFromApi({
        text: expression,
        learningItemType: "expression",
        sourceType: "manual",
        sourceSentenceText: item.text,
        sourceChunkText: expression,
        translation: item.translation ?? undefined,
      });
      setSavedSentenceExpressionKeys((prev) => ({ ...prev, [key]: true }));
      toast.success(zh.sentenceExpressionSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setSavingSentenceExpressionKey(null);
    }
  };

  // 表达簇动作
  const resetMoveIntoClusterSelection = useCallback(() => {
    setExpandedMoveIntoClusterGroups({});
    setSelectedMoveIntoClusterMap({});
  }, []);

  const focusDetailClusterMemberCount = useMemo(() => {
    const clusterId = focusDetail?.savedItem?.expressionClusterId ?? null;
    if (!clusterId) return 0;
    return clusterMembersByClusterId.get(clusterId)?.length ?? 0;
  }, [clusterMembersByClusterId, focusDetail?.savedItem?.expressionClusterId]);

  // Focus 详情 selector 与 UI 映射
  const canMoveIntoCurrentCluster = Boolean(focusExpression) && moveIntoClusterCandidates.length > 0;
  const toggleMoveIntoClusterGroupExpand = useCallback((groupKey: string) => {
    setExpandedMoveIntoClusterGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }, []);
  const toggleMoveIntoClusterGroupSelect = useCallback((group: MoveIntoClusterGroup, groupSelected: boolean) => {
    setSelectedMoveIntoClusterMap((current) => toggleMoveIntoClusterGroupSelection(current, group, groupSelected));
  }, []);
  const toggleMoveIntoClusterCandidate = useCallback((
    group: MoveIntoClusterGroup,
    candidate: MoveIntoClusterCandidate,
    selected: boolean,
  ) => {
    setSelectedMoveIntoClusterMap((current) =>
      toggleMoveIntoClusterCandidateSelection(current, group, candidate, selected),
    );
  }, []);
  const canSetCurrentClusterMain = Boolean(
    focusDetail?.savedItem?.expressionClusterId &&
      focusDetail.savedItem.userPhraseId !== focusDetail.savedItem.expressionClusterMainUserPhraseId,
  );
  const canSetStandaloneMain = Boolean(
    focusDetail?.savedItem?.expressionClusterId && focusDetailClusterMemberCount > 1,
  );
  const {
    detachingClusterMember,
    moveIntoClusterOpen,
    setMoveIntoClusterOpen,
    movingIntoCluster,
    ensuringMoveTargetCluster,
    detachFocusDetailFromCluster,
    setFocusDetailAsClusterMain,
    handleMoveSelectedIntoCurrentCluster,
    openMoveIntoCurrentCluster,
  } = useExpressionClusterActions({
    focusExpression,
    focusDetailSavedItem: focusDetail?.savedItem ?? null,
    moveIntoClusterCandidates,
    selectedMoveIntoClusterMap,
    loadPhrases: async () => {
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
    },
    onInvalidateSavedRelations: invalidateSavedRelations,
    onAssignFocusMainExpression: assignFocusMainExpression,
    onResetMoveSelection: resetMoveIntoClusterSelection,
    onOpenMoveSheet: () => {},
    onCloseMoveSheet: () => {},
    onCloseFocusDetail: () => {
      setFocusDetailOpen(false);
    },
    onCloseFocusActions: () => {
      setFocusDetailActionsOpen(false);
    },
    onClearDetailConfirm: () => {
      setDetailConfirmAction(null);
    },
    onSuccess: (message) => {
      toast.success(message);
    },
    onError: (message) => {
      toast.error(message || zh.loadFailed);
    },
    labels: {
      loadFailed: zh.loadFailed,
      detachClusterMemberSuccess: zh.detachClusterMemberSuccess,
      moveIntoClusterSelectOne: zh.moveIntoClusterSelectOne,
      moveIntoClusterSuccess: zh.moveIntoClusterSuccess,
      moveIntoClusterPartialFailed: zh.moveIntoClusterPartialFailed,
    },
  });
  // Focus 详情打开与链路切换
  

  const openExpressionMap = async (expression: UserPhraseItemResponse) => {
    if (expression.learningItemType === "sentence") return;
    setMapOpeningForId(expression.userPhraseId);
    setMapOpen(true);
    setMapLoading(true);
    setMapError(null);
    setMapData(null);
    setMapSourceExpression(expression);
    setActiveClusterId(null);
    try {
      const grouped = expression.expressionClusterId
        ? phrases.filter((row) => row.expressionClusterId === expression.expressionClusterId)
        : [expression];
      const baseExpressions = Array.from(
        new Set(grouped.map((row) => row.text).filter((text) => text.trim().length > 0)),
      ).slice(0, 12);

      const response = await generateExpressionMapFromApi({
        sourceSceneId: expression.sourceSceneSlug ?? `expression:${expression.userPhraseId}`,
        sourceSceneTitle: expression.sourceSceneSlug ?? undefined,
        baseExpressions: baseExpressions.length > 0 ? baseExpressions : [expression.text],
      });

      setMapData(response);
      setActiveClusterId(response.clusters[0]?.id ?? null);
      toast.success(zh.openMapFeedback);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : zh.mapFailed);
    } finally {
      setMapOpeningForId(null);
      setMapLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSimilarExpanded = (id: string) => {
    setExpandedSimilarIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyClusterFilter = (clusterId: string, sourceExpressionText?: string) => {
    const next = buildClusterFilterChange({
      searchParams,
      clusterId,
    });
    if (!next.nextClusterId) return;
    setExpressionClusterFilterId(next.nextClusterId);
    setQuery("");
    if (next.shouldResetFilters) {
      setContentFilter("expression");
      setReviewFilter("all");
    }
    if (sourceExpressionText) {
      toast.message(`${zh.filteredClusterPrefix} ${sourceExpressionText} ${zh.filteredClusterSuffix}`);
    }
  };

  const clearClusterFilter = () => {
    const next = buildClusterFilterChange({
      searchParams,
      clusterId: "",
    });
    setExpressionClusterFilterId(next.nextClusterId);
  };

  const {
    similarSheetOpen,
    setSimilarSheetOpen,
    similarSeedExpression,
    generatingSimilarForId,
    generatedSimilarCandidates,
    selectedSimilarMap,
    savingSelectedSimilar,
    openGenerateSimilarSheet,
    toggleCandidateSelected,
    saveSelectedSimilarCandidates,
    resetGeneratedSimilarSheet,
  } = useGeneratedSimilarSheet({
    expressionRows,
    normalizeSimilarLabel,
    onLoadCluster: async (clusterId) => {
      await loadPhrases(query, reviewFilter, contentFilter, clusterId, { preferCache: false });
    },
    onApplyClusterFilter: applyClusterFilter,
    onSelectAtLeastOne: () => {
      toast.message(zh.selectAtLeastOne);
    },
    onSuccess: () => {
      toast.success(zh.addSelectedSimilarSuccess);
    },
    onError: (message) => {
      toast.error(message || zh.loadFailed);
    },
  });

  const retryAiEnrichment = async (item: UserPhraseItemResponse) => {
    if (item.learningItemType !== "expression") return;
    if (retryingEnrichmentIds[item.userPhraseId]) return;
    setRetryingEnrichmentIds((prev) => ({ ...prev, [item.userPhraseId]: true }));
    setPhrases((prev) =>
      prev.map((row) =>
        row.userPhraseId === item.userPhraseId
          ? { ...row, aiEnrichmentStatus: "pending", aiEnrichmentError: null }
          : row,
      ),
    );
    try {
      await enrichSimilarExpressionFromApi({
        userPhraseId: item.userPhraseId,
        baseExpression: item.text,
      });
      toast.success(zh.retryEnrichmentSuccess);
    } catch (error) {
      setPhrases((prev) =>
        prev.map((row) =>
          row.userPhraseId === item.userPhraseId ? { ...row, aiEnrichmentStatus: "failed" } : row,
        ),
      );
      toast.error(error instanceof Error ? error.message : zh.retryEnrichmentFailed);
    } finally {
      setRetryingEnrichmentIds((prev) => ({ ...prev, [item.userPhraseId]: false }));
      void loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
    }
  };

  const getUsageHint = (item: UserPhraseItemResponse) => {
    if (item.aiEnrichmentStatus === "pending") return zh.learningInfoPending;
    if (item.aiEnrichmentStatus === "failed") return zh.learningInfoFailed;
    const raw = (item.usageNote ?? "").trim();
    if (raw.length === 0) return zh.usageHintFallback;
    if (raw.length <= 70) return raw;
    return `${raw.slice(0, 70)}...`;
  };

  const handlePronounceSentence = (sentence: string | null | undefined) => {
    const text = (sentence ?? "").trim();
    if (!text) return;
    const isLoadingCurrentText =
      ttsPlaybackState.status === "loading" && ttsPlaybackState.text?.trim() === text;
    if (playingText === text || isLoadingCurrentText) {
      stopTtsPlayback();
      setPlayingText(null);
      return;
    }
    void (async () => {
      stopTtsPlayback();
      setPlayingText(text);
      try {
        await playChunkAudio({ chunkText: text });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : zh.speechUnsupported);
      } finally {
        setPlayingText((prev) => (prev === text ? null : prev));
      }
    })();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const warmupItems = phrases.slice(0, 6);
      for (const item of warmupItems) {
        const text = item.text.trim();
        if (text) {
          void prefetchChunkAudio({
            chunkText: text,
            chunkKey: buildChunkAudioKey(text),
          });
        }

        const exampleText =
          item.exampleSentences[0]?.en?.trim() || item.sourceSentenceText?.trim() || "";
        if (exampleText) {
          void prefetchChunkAudio({
            chunkText: exampleText,
            chunkKey: buildChunkAudioKey(exampleText),
          });
        }
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phrases]);

  const getReviewActionHint = (status: PhraseReviewStatus) => {
    if (status === "reviewing") return zh.reviewActionReviewingHint;
    if (status === "mastered") return zh.reviewActionMasteredHint;
    return zh.reviewActionSavedHint;
  };

  // Focus 详情模块数据
  const focusDetailViewModel = useMemo(
    () =>
      buildFocusDetailViewModel({
        focusDetail,
        focusExpression,
        focusAssistData,
        savedRelationCache,
        clusterMembersByClusterId,
        phraseByNormalized,
        savedRelationLoadingKey,
        isContrastDerivedExpression,
        getUsageHint,
        getReviewActionHint,
        defaults: {
          usageHintFallback: zh.usageHintFallback,
          typicalScenarioPending: zh.typicalScenarioPending,
          semanticFocusPending: zh.semanticFocusPending,
          reviewHintFallback: "可先加入表达库，再决定是否加入复习。",
        },
      }),
    [
      clusterMembersByClusterId,
      focusAssistData,
      focusDetail,
      focusExpression,
      phraseByNormalized,
      savedRelationCache,
      savedRelationLoadingKey,
    ],
  );

  useEffect(() => {
    if (!focusDetail) return;

    const normalized = normalizePhraseText(focusDetail.text);
    if (!normalized) return;

    const matchedSavedItem =
      (focusDetail.savedItem
        ? phrases.find((row) => row.userPhraseId === focusDetail.savedItem?.userPhraseId) ?? null
        : null) ??
      phraseByNormalized.get(normalized) ??
      null;

    const nextDetail = buildSavedFocusDetailState({
      focusDetail,
      matchedSavedItem,
    });

    if (nextDetail !== focusDetail) {
      setFocusDetail(nextDetail);
    }
  }, [focusDetail, phraseByNormalized, phrases, setFocusDetail]);

  useEffect(() => {
    if (!focusDetailOpen || !focusDetail) return;

    const timer = window.setTimeout(() => {
      const candidateTexts = [
        focusDetailViewModel.detailSpeakText,
        ...(focusDetail.savedItem?.exampleSentences ?? focusDetailViewModel.activeAssistItem?.examples ?? [])
          .map((item) => item.en?.trim())
          .filter(Boolean),
        ...focusDetailViewModel.similarRows.slice(0, 2).map((row) => row.text.trim()),
        ...focusDetailViewModel.contrastRows.slice(0, 2).map((row) => row.text.trim()),
      ];

      for (const text of candidateTexts) {
        const clean = (text ?? "").trim();
        if (!clean) continue;
        void prefetchChunkAudio({
          chunkText: clean,
          chunkKey: buildChunkAudioKey(clean),
        });
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    focusDetail,
    focusDetailOpen,
    focusDetailViewModel.activeAssistItem,
    focusDetailViewModel.contrastRows,
    focusDetailViewModel.detailSpeakText,
    focusDetailViewModel.similarRows,
  ]);
  const focusDetailLabels = useMemo(
    () =>
      buildFocusDetailLabels({
        detailTitle: zh.detailTitle,
        detailBackToCurrent: zh.detailBackToCurrent,
        detailFindRelations: zh.detailFindRelations,
        detailPrev: zh.detailPrev,
        detailNext: zh.detailNext,
        detailMoreActions: zh.detailMoreActions,
        detailManualAddRelated: zh.detailManualAddRelated,
        detailRegenerateAudio: zh.detailRegenerateAudio,
        detailRetryEnrichment: zh.detailRetryEnrichment,
        detailOpenAsMain: zh.detailOpenAsMain,
        moveIntoCluster: zh.moveIntoCluster,
        detachClusterMember: zh.detachClusterMember,
        addThisExpression: zh.addThisExpression,
        addingThisExpression: zh.addingThisExpression,
        addedThisExpression: zh.addedThisExpression,
        completeAssist: zh.completeAssist,
        confirmCancel: zh.confirmCancel,
        confirmContinue: zh.confirmContinue,
        detailOpenAsMainConfirmTitle: zh.detailOpenAsMainConfirmTitle,
        detailOpenAsMainConfirmDesc: zh.detailOpenAsMainConfirmDesc,
        detachClusterMemberConfirmTitle: zh.detachClusterMemberConfirmTitle,
        detachClusterMemberConfirmDesc: zh.detachClusterMemberConfirmDesc,
        detailCandidateBadge: zh.detailCandidateBadge,
        noTranslation: zh.noTranslation,
        detailLoading: zh.detailLoading,
        detailTabInfo: zh.detailTabInfo,
        detailTabSavedSimilar: zh.detailTabSavedSimilar,
        detailTabContrast: zh.detailTabContrast,
        commonUsage: zh.commonUsage,
        typicalScenarioLabel: zh.typicalScenarioLabel,
        semanticFocusLabel: zh.semanticFocusLabel,
        reviewStage: zh.reviewStage,
        usageHintFallback: zh.usageHintFallback,
        typicalScenarioPending: zh.typicalScenarioPending,
        semanticFocusPending: zh.semanticFocusPending,
        sourceSentence: zh.sourceSentence,
        noSourceSentence: zh.noSourceSentence,
        detailSimilarHint: zh.detailSimilarHint,
        focusEmptySimilar: zh.focusEmptySimilar,
        detailContrastHint: zh.detailContrastHint,
        noContrastExpressions: zh.noContrastExpressions,
        speakSentence: zh.speakSentence,
      }),
    [],
  );

  const handlePracticeCluster = () => {
    if (!activeCluster) return;
    const selectedRows = filterRowsByClusterExpressions(phrases, activeCluster, mapSourceExpression);
    if (selectedRows.length > 0) {
      startReviewSession({
        router,
        source: "expression-map-cluster",
        expressions: asReviewSessionExpressions(selectedRows),
      });
      return;
    }
    if (mapSourceExpression) {
      startReviewSession({
        router,
        source: "expression-map-single",
        expressions: asReviewSessionExpressions([mapSourceExpression]),
      });
    }
  };

  const handleAddClusterToReview = async () => {
    if (!activeCluster || !mapSourceExpression || addingCluster) return;
    setAddingCluster(true);
    try {
      const sourceSaveResult = mapSourceExpression.expressionClusterId
        ? null
        : await savePhraseFromApi({
            text: mapSourceExpression.text,
            expressionClusterId: `create-cluster:${activeCluster.id}`,
            sourceSceneSlug: mapSourceExpression.sourceSceneSlug ?? undefined,
            sourceSentenceText: mapSourceExpression.sourceSentenceText ?? undefined,
            sourceChunkText: mapSourceExpression.text,
            translation: mapSourceExpression.translation ?? undefined,
          });
      const clusterId = mapSourceExpression.expressionClusterId ?? sourceSaveResult?.expressionClusterId ?? null;
      if (!clusterId) {
        throw new Error("未能创建表达组。");
      }
      const existingNormalized = new Set(phrases.map((row) => normalizePhraseText(row.text)));
      const newTexts = Array.from(
        new Set(activeCluster.expressions.map((text) => text.trim()).filter(Boolean)),
      )
        .slice(0, 20)
        .filter((text) => !existingNormalized.has(normalizePhraseText(text)));

      if (newTexts.length > 0) {
        await savePhrasesBatchFromApi({
          items: newTexts.map((text) => ({
            text,
            sourceSceneSlug: mapSourceExpression.sourceSceneSlug ?? undefined,
            sourceSentenceText: mapSourceExpression.sourceSentenceText ?? undefined,
            sourceChunkText: text,
            expressionClusterId: clusterId,
          })),
        });
        await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
          preferCache: false,
        });
      }
      toast.success(zh.addClusterSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setAddingCluster(false);
    }
  };

  const resetManualForm = () => {
    setManualItemType("expression");
    setManualText("");
    setManualSentence("");
    resetManualExpressionComposer();
  };

  const resetQuickAddRelatedForm = () => {
    setQuickAddRelatedText("");
    setQuickAddRelatedType("similar");
  };

  const quickAddRelatedValidationMessage = useMemo(() => {
    const text = quickAddRelatedText.trim();
    if (!text || !focusExpression) return null;

    const normalizedText = normalizePhraseText(text);
    const normalizedFocusText = normalizePhraseText(focusExpression.text);
    if (normalizedText === normalizedFocusText) {
      return zh.quickAddDuplicateCurrent;
    }

    const duplicateExists =
      quickAddRelatedType === "similar"
        ? focusDetailViewModel.similarRows.some(
            (row) => normalizePhraseText(row.text) === normalizedText,
          )
        : focusDetailViewModel.contrastRows.some(
            (row) => normalizePhraseText(row.text) === normalizedText,
          );

    if (!duplicateExists) return null;
    return quickAddRelatedType === "similar"
      ? zh.quickAddDuplicateSimilar
      : zh.quickAddDuplicateContrast;
  }, [
    focusDetailViewModel.contrastRows,
    focusDetailViewModel.similarRows,
    focusExpression,
    quickAddRelatedText,
    quickAddRelatedType,
  ]);

  const quickAddRelatedLibraryHint = useMemo(() => {
    const text = quickAddRelatedText.trim();
    if (!text || !focusExpression || quickAddRelatedValidationMessage) return null;

    const existingItem = phraseByNormalized.get(normalizePhraseText(text));
    if (!existingItem || existingItem.learningItemType !== "expression") return null;
    return zh.quickAddExistingLibraryHint;
  }, [focusExpression, phraseByNormalized, quickAddRelatedText, quickAddRelatedValidationMessage]);

  const handleSaveQuickAddRelated = async () => {
    if (!focusExpression || !focusDetail?.savedItem) return;

    const text = quickAddRelatedText.trim();
    if (!text) {
      toast.error(zh.missingExpression);
      return;
    }
    if (savingQuickAddRelated) return;
    if (quickAddRelatedValidationMessage) {
      toast.message(quickAddRelatedValidationMessage);
      return;
    }

    setSavingQuickAddRelated(true);
    try {
      const response = await savePhraseFromApi({
        text,
        learningItemType: "expression",
        sourceType: "manual",
        sourceNote:
          quickAddRelatedType === "similar"
            ? "manual-similar-direct"
            : "manual-contrast-direct",
        sourceSentenceText: focusExpression.sourceSentenceText ?? undefined,
        sourceChunkText: text,
        relationSourceUserPhraseId: focusExpression.userPhraseId,
        relationType: quickAddRelatedType,
      });
      await enrichSimilarExpressionFromApi({
        userPhraseId: response.userPhrase.id,
        baseExpression: focusExpression.text,
      });
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      invalidateSavedRelations([focusExpression.userPhraseId, response.userPhrase.id]);
      setFocusRelationTab(quickAddRelatedType);
      setFocusDetailTab(quickAddRelatedType);
      setFocusDetailActionsOpen(false);
      setQuickAddRelatedOpen(false);
      resetQuickAddRelatedForm();
      toast.success(
        quickAddRelatedType === "similar"
          ? zh.quickAddSuccessSimilar
          : zh.quickAddSuccessContrast,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setSavingQuickAddRelated(false);
    }
  };

  const handleCopyQuickAddTarget = async () => {
    const text = focusExpression?.text?.trim() ?? "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(zh.quickAddCopySuccess);
    } catch {
      toast.error(zh.quickAddCopyFailed);
    }
  };

  const handleRegenerateCurrentDetailAudio = async () => {
    if (!focusDetail || regeneratingDetailAudio) return;

    const candidateTexts = [
      focusDetailViewModel.detailSpeakText,
      ...(focusDetail.savedItem?.exampleSentences ?? focusDetailViewModel.activeAssistItem?.examples ?? [])
        .map((example) => example.en?.trim() ?? ""),
    ]
      .map((text) => text.trim())
      .filter(Boolean);
    const uniqueTexts = Array.from(new Set(candidateTexts));

    if (uniqueTexts.length === 0) {
      toast.message(zh.noSourceSentence);
      return;
    }

    setRegeneratingDetailAudio(true);
    try {
      await regenerateChunkAudioBatch(
        uniqueTexts.map((text) => ({
          chunkText: text,
          chunkKey: buildChunkAudioKey(text),
        })),
      );
      setFocusDetailActionsOpen(false);
      toast.success(zh.regenerateAudioSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.regenerateAudioFailed);
    } finally {
      setRegeneratingDetailAudio(false);
    }
  };

  const handleSaveManualExpression = async (mode: "save" | "save_and_review") => {
    const text = manualText.trim();
    const sentenceText = manualSentence.trim();
    if (manualItemType === "expression" && !text) {
      toast.error(zh.missingExpression);
      return;
    }
    if (manualItemType === "sentence" && !sentenceText) {
      toast.error(zh.missingSentence);
      return;
    }
    if (savingManual) return;

    setSavingManual(true);
    try {
      let reviewSessionExpressions: Array<{ userPhraseId: string; text: string }> = [];

      if (manualItemType === "sentence") {
        const result = await saveManualSentence(sentenceText);
        if (!result) {
          return;
        }
        reviewSessionExpressions = result.reviewSessionExpressions;
      } else {
        const result = await saveManualExpression({
          text,
          mode,
        });
        if (!result) {
          return;
        }
        if (result.emptySelection) {
          toast.message(zh.selectAtLeastOne);
          return;
        }
        reviewSessionExpressions = result.reviewSessionExpressions;
      }

      const nextContentFilter =
        manualItemType === "sentence" ? "sentence" : contentFilter;
      if (nextContentFilter !== contentFilter) {
        setContentFilter(nextContentFilter);
      }
      await loadPhrases(query, reviewFilter, nextContentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      if (mode === "save_and_review" && manualItemType === "expression") {
        toast.success(zh.saveReviewSuccess);
        startReviewSession({
          router,
          source: "expression-library-manual-add",
          expressions: reviewSessionExpressions,
        });
      } else {
        if (manualItemType === "sentence") {
          toast.success(zh.saveSentenceSuccess);
        } else {
          toast.success(
            manualExpressionAssist ? zh.addSelectedSimilarSuccess : zh.saveSuccess,
          );
        }
      }

      setAddSheetOpen(false);
      resetManualForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setSavingManual(false);
    }
  };

  const manualSheetState = buildManualSheetState({
    manualItemType,
    manualExpressionAssist,
    savingManual,
    savingManualSentence,
    labels: {
      title: zh.manualAddTitle,
      description: zh.manualAddDesc,
      itemTypeLabel: zh.itemTypeLabel,
      saveSentence: zh.saveSentence,
      saveSelectedExpressions: zh.saveSelectedExpressions,
      saveToLibrary: zh.saveToLibrary,
      saveAndReview: zh.saveAndReview,
    },
  });
  const generatedSimilarSheetState = buildGeneratedSimilarSheetState({
    similarSeedExpression,
    generatingSimilarForId,
    generatedSimilarCandidates,
    savingSelectedSimilar,
    labels: {
      title: zh.generatedSimilarTitle,
      description: zh.generatedSimilarDesc,
      centerExpression: zh.centerExpression,
      generating: zh.generatingSimilar,
      empty: zh.noGeneratedSimilar,
      close: zh.close,
      submit: zh.addSelectedSimilar,
    },
  });
  const focusDetailSheetState = buildFocusDetailSheetState({
    focusDetail,
    focusDetailTrailLength: focusDetailTrail.length,
    focusRelationTab,
    focusSimilarCount: focusSimilarItems.length,
    focusContrastCount: focusContrastItems.length,
    canShowFindRelations: focusDetailViewModel.canShowFindRelations,
    focusExpression,
    savingFocusCandidateKey: savingFocusCandidateKeys[0] ?? null,
    playingText,
    ttsPlaybackText: ttsPlaybackState.text,
    detailSpeakText: focusDetailViewModel.detailSpeakText,
  });

  const focusDetailSheetProps = {
    open: focusDetailOpen,
    detail: focusDetail,
    detailTab: focusDetailTab,
    detailLoading: focusDetailLoading,
    detailActionsOpen: focusDetailActionsOpen,
    detailConfirmAction,
    trailLength: focusDetailSheetState.trailLength,
    canShowSiblingNav: focusDetailSheetState.canShowSiblingNav,
    canShowFindRelations: focusDetailSheetState.canShowFindRelations,
    canShowManualAddRelated:
      Boolean(focusDetail?.savedItem) &&
      Boolean(focusExpression) &&
      normalizePhraseText(focusDetail?.text ?? "") === normalizePhraseText(focusExpression?.text ?? ""),
    canShowRegenerateAudio: Boolean(focusDetail),
    canShowRetryEnrichment: Boolean(focusDetail?.savedItem),
    canCompleteAssist:
      Boolean(focusAssistData) &&
      Boolean(focusDetail?.savedItem) &&
      Boolean(focusExpression) &&
      normalizePhraseText(focusDetail?.text ?? "") === normalizePhraseText(focusExpression?.text ?? ""),
    completeAssistDisabled: savingFocusCandidateKeys.length > 0,
    focusAssistLoading,
    openingManualAddRelated: savingQuickAddRelated,
    regeneratingAudio: regeneratingDetailAudio,
    retryingEnrichment: Boolean(
      focusDetail?.savedItem && retryingEnrichmentIds[focusDetail.savedItem.userPhraseId],
    ),
    movingIntoCluster,
    ensuringMoveTargetCluster,
    detachingClusterMember,
    canSetCurrentClusterMain,
    canMoveIntoCurrentCluster,
    canSetStandaloneMain,
    primaryActionLabel: focusDetail?.savedItem ? getPrimaryActionLabel(focusDetail.savedItem) : undefined,
    appleButtonClassName,
    activeAssistItem: focusDetailViewModel.activeAssistItem,
    isDetailSpeaking: focusDetailSheetState.isDetailSpeaking,
    detailSpeakText: focusDetailViewModel.detailSpeakText,
    similarRows: focusDetailViewModel.similarRows,
    contrastRows: focusDetailViewModel.contrastRows,
    isSavedRelatedLoading: focusDetailViewModel.isSavedRelatedLoading,
    usageHint: focusDetailViewModel.usageHint,
    typicalScenario: focusDetailViewModel.typicalScenario,
    semanticFocus: focusDetailViewModel.semanticFocus,
    reviewHint: focusDetailViewModel.reviewHint,
    savingFocusCandidateKeys,
    completedFocusCandidateKeys,
    exampleCards: focusDetail
      ? (renderExampleSentenceCards(
          focusDetail.savedItem?.exampleSentences ?? focusDetailViewModel.activeAssistItem?.examples ?? [],
          focusDetail.text,
          {
            onSpeak: handlePronounceSentence,
            isSpeakingText: (text) =>
              Boolean(text) &&
              (playingText === text.trim() || ttsPlaybackState.text === text.trim()),
            isLoadingText: (text) =>
              Boolean(text) &&
              ttsPlaybackState.status === "loading" &&
              ttsPlaybackState.text === text.trim(),
          },
        ) ?? null)
      : null,
    labels: focusDetailLabels,
  };

  const focusDetailSheetHandlers = {
    onOpenChange: (open: boolean) => {
      setFocusDetailOpen(open);
      if (!open) {
        const nextState = buildFocusDetailClosePayload();
        setFocusDetailActionsOpen(nextState.actionsOpen);
        setFocusDetailTrail(nextState.trail);
        setFocusDetailTab(nextState.tab);
        setQuickAddRelatedOpen(false);
        setMoveIntoClusterOpen(false);
        setDetailConfirmAction(null);
      }
    },
    onReopenPrevTrail: () => reopenFocusTrailItem(focusDetailTrail.length - 2),
    onFindRelations: () => {
      if (!focusDetail?.savedItem) return;
      void loadFocusAssist(focusDetail.savedItem);
    },
    onOpenManualAddRelated: () => {
      setFocusDetailActionsOpen(false);
      setQuickAddRelatedOpen(true);
    },
    onRegenerateAudio: () => {
      void handleRegenerateCurrentDetailAudio();
    },
    onRetryEnrichment: () => {
      if (!focusDetail?.savedItem) return;
      void retryAiEnrichment(focusDetail.savedItem);
    },
    onOpenPrevSibling: () => openFocusSiblingDetail(-1),
    onOpenNextSibling: () => openFocusSiblingDetail(1),
    onSetDetailActionsOpen: setFocusDetailActionsOpen,
    onRequestSetCurrentClusterMain: () => {
      setFocusDetailActionsOpen(false);
      setDetailConfirmAction("set-cluster-main");
    },
    onRequestMoveIntoCluster: () => {
      void openMoveIntoCurrentCluster();
    },
    onRequestSetStandaloneMain: () => {
      if (!focusDetail?.savedItem?.expressionClusterId) return;
      setFocusDetailActionsOpen(false);
      setDetailConfirmAction("set-standalone-main");
    },
    onPrimaryAction: () => {
      if (!focusDetail?.savedItem) return;
      startReviewFromCard(focusDetail.savedItem as UserPhraseItemResponse);
      setFocusDetailOpen(false);
    },
    onCompleteAssist: () => {
      resetFocusAssist();
      setFocusDetailActionsOpen(false);
      setFocusRelationTab("similar");
    },
    onSpeak: handlePronounceSentence,
    onTabChange: (nextTab: "info" | "similar" | "contrast") => {
      const nextState = buildFocusDetailTabChangeState({
        nextTab,
        focusRelationTab,
      });
      setFocusDetailTab(nextState.nextTab);
      setFocusRelationTab(nextState.nextRelationTab);
    },
    onOpenSimilarRow: (row: FocusDetailRelatedItem) => {
      const nextAction = buildFocusDetailOpenRowAction({
        row,
        kind: row.kind,
      });
      setFocusRelationTab(nextAction.nextRelationTab);
      void openFocusDetail(nextAction.detailInput);
    },
    onOpenContrastRow: (row: FocusDetailRelatedItem) => {
      const nextAction = buildFocusDetailOpenRowAction({
        row,
        kind: "contrast",
      });
      setFocusRelationTab(nextAction.nextRelationTab);
      void openFocusDetail(nextAction.detailInput);
    },
    onSaveSimilarRow: (row: FocusDetailRelatedItem) => {
      if (!focusExpression || row.savedItem) return;
      void saveFocusCandidate(
        focusExpression,
        {
          text: row.text,
          differenceLabel: row.differenceLabel ?? "鐩稿叧璇存硶",
        },
        "similar",
      );
    },
    onSaveContrastRow: (row: FocusDetailRelatedItem) => {
      if (!focusExpression || row.savedItem) return;
      void saveFocusCandidate(
        focusExpression,
        {
          text: row.text,
          differenceLabel: row.differenceLabel ?? "鐩稿叧璇存硶",
        },
        "contrast",
      );
    },
    onCloseConfirm: () => setDetailConfirmAction(null),
    onConfirm: () => {
      if (detailConfirmAction === "set-cluster-main") {
        void setFocusDetailAsClusterMain();
        return;
      }
      void detachFocusDetailFromCluster();
    },
  };

  const moveIntoClusterSheetState = buildMoveIntoClusterSheetState({
    focusExpression,
    groups: moveIntoClusterGroups,
    expandedGroups: expandedMoveIntoClusterGroups,
    selectedMap: selectedMoveIntoClusterMap,
    submitting: movingIntoCluster,
    appleButtonClassName,
    labels: {
      close: zh.close,
      title: zh.moveIntoClusterTitle,
      description: zh.moveIntoClusterDesc,
      currentMain: zh.moveIntoClusterCurrentMain,
      empty: zh.moveIntoClusterEmpty,
      selectGroup: zh.moveIntoClusterSelectGroup,
      selectedGroup: zh.moveIntoClusterSelectedGroup,
      coveredByMain: zh.moveIntoClusterCoveredByMain,
      submit: zh.moveIntoClusterSubmit,
      mainExpression: zh.moveIntoClusterMainExpression,
      subExpression: zh.moveIntoClusterSubExpression,
    },
  });

  const moveIntoClusterSheetProps = {
    open: moveIntoClusterOpen,
    ...moveIntoClusterSheetState,
    onOpenChange: (open: boolean) => {
      const nextState = buildMoveIntoClusterOpenChangeState(open);
      setMoveIntoClusterOpen(nextState.open);
      if (nextState.shouldResetSelection) {
        resetMoveIntoClusterSelection();
      }
    },
    onToggleGroupExpand: toggleMoveIntoClusterGroupExpand,
    onToggleGroupSelect: toggleMoveIntoClusterGroupSelect,
    onToggleCandidate: toggleMoveIntoClusterCandidate,
    onSubmit: () => void handleMoveSelectedIntoCurrentCluster(),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={zh.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{summary}</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={appleButtonClassName}
            onClick={() => setAddSheetOpen(true)}
          >
            {zh.addExpression}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`${appleButtonClassName} ${
            contentFilter === "expression"
              ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
              : ""
          }`}
          onClick={() => {
            setContentFilter("expression");
            setReviewFilter("all");
          }}
        >
          {zh.contentTabExpression}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`${appleButtonClassName} ${
            contentFilter === "sentence"
              ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
              : ""
          }`}
          onClick={() => {
            setContentFilter("sentence");
            setReviewFilter("all");
          }}
        >
          {zh.contentTabSentence}
        </Button>
      </div>

      {contentFilter === "expression" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${appleButtonClassName} ${
              expressionViewMode === "focus"
                ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                : ""
            }`}
            onClick={() => setExpressionViewMode("focus")}
          >
            {zh.viewModeFocus}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${appleButtonClassName} ${
              expressionViewMode === "list"
                ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                : ""
            }`}
            onClick={() => setExpressionViewMode("list")}
          >
            {zh.viewModeList}
          </Button>
        </div>
      ) : null}

      {!(contentFilter === "expression" && expressionViewMode === "focus") ? (
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: zh.tabs.all },
            { key: "saved", label: zh.tabs.saved },
            { key: "reviewing", label: zh.tabs.reviewing },
            { key: "mastered", label: zh.tabs.mastered },
          ].map((tab) => (
            <Button
              key={tab.key}
              type="button"
              size="sm"
              variant="ghost"
              className={`${appleButtonClassName} ${
                reviewFilter === tab.key
                  ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                  : ""
              }`}
              onClick={() => setReviewFilter(tab.key as PhraseReviewStatus | "all")}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      ) : null}

      {expressionClusterFilterId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[rgb(246,246,246)] px-3 py-2">
          <p className="text-xs text-muted-foreground">{zh.viewingClusterFilter}</p>
          {clusterFilterExpressionLabel ? (
            <p className="text-xs text-foreground/90">
              {zh.filteredClusterPrefix}
              <span className="font-medium"> {clusterFilterExpressionLabel} </span>
              {zh.filteredClusterSuffix}
            </p>
          ) : null}
          <Button type="button" size="sm" variant="ghost" className={appleButtonClassName} onClick={clearClusterFilter}>
            {zh.clearClusterFilter}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{zh.listLoading}</p>
      ) : phrases.length === 0 ? (
        <EmptyState title={zh.emptyTitle} description={zh.emptyDesc} />
      ) : contentFilter === "expression" && expressionViewMode === "focus" && focusExpression ? (
        <div className="space-y-4">
          <ClusterFocusList
            ready={focusRelationsBootstrapDone}
            rows={focusMainExpressionRows}
            currentFocusExpressionId={focusExpression.userPhraseId}
            expandedFocusMainId={expandedFocusMainId}
            clusterMembersByClusterId={clusterMembersByClusterId}
            savedRelationRowsBySourceId={savedRelationRowsBySourceId}
            currentFocusSimilarItems={focusSimilarItems}
            labels={{
              loading: zh.detailLoading,
              title: zh.focusModeTitle,
              expand: zh.focusExpand,
              collapse: zh.focusCollapse,
              noTranslation: zh.noTranslation,
              similarTab: zh.focusTabSimilar,
              openCurrentDetail: zh.openCurrentDetail,
            }}
            appleSurfaceClassName={APPLE_SURFACE}
            onToggleMain={switchFocusMainExpression}
            onToggleExpanded={(userPhraseId) =>
              setExpandedFocusMainId((current) => (current === userPhraseId ? null : userPhraseId))
            }
            onOpenMainDetail={(row) => {
              switchFocusMainExpression(row.userPhraseId);
              void openFocusDetail({
                text: row.text,
                kind: "current",
                chainMode: "reset",
              });
            }}
            onOpenMainSimilarTab={(row) => {
              switchFocusMainExpression(row.userPhraseId);
              void openFocusDetail({
                text: row.text,
                kind: "current",
                initialTab: "similar",
                chainMode: "reset",
              });
            }}
            onOpenPreviewItem={(row, item) => {
              switchFocusMainExpression(row.userPhraseId);
              setFocusRelationTab("similar");
              setFocusRelationActiveText(item.text);
              void openFocusDetail({
                text: item.text,
                differenceLabel: item.differenceLabel,
                kind: item.kind,
                chainMode: "reset",
              });
            }}
          />

        </div>
      ) : (
        <ChunksListView
          phrases={phrases}
          clusterMembersByClusterId={clusterMembersByClusterId}
          expandedSimilarIds={expandedSimilarIds}
          expandedCardIds={expandedCardIds}
          expandedIds={expandedIds}
          savedSentenceExpressionKeys={savedSentenceExpressionKeys}
          retryingEnrichmentIds={retryingEnrichmentIds}
          reviewStatusLabel={reviewStatusLabel}
          savingSentenceExpressionKey={savingSentenceExpressionKey}
          generatingSimilarForId={generatingSimilarForId}
          mapOpeningForId={mapOpeningForId}
          playingText={playingText}
          ttsPlaybackText={ttsPlaybackState.text}
          ttsLoadingText={ttsPlaybackState.status === "loading" ? ttsPlaybackState.text : null}
          appleButtonClassName={appleButtonClassName}
          appleSurfaceClassName={APPLE_SURFACE}
          labels={{
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
            mapUnavailable: zh.mapUnavailable,
            mapPending: zh.mapPending,
            openMap: zh.openMap,
            sourceScene: zh.sourceScene,
            retryEnrichment: zh.retryEnrichment,
            learningInfoPendingHint: zh.learningInfoPendingHint,
          }}
          toggleCardExpanded={toggleCardExpanded}
          toggleSimilarExpanded={toggleSimilarExpanded}
          toggleExpanded={toggleExpanded}
          getUsageHint={getUsageHint}
          getReviewActionHint={getReviewActionHint}
          getPrimaryActionLabel={getPrimaryActionLabel}
          buildDifferenceNote={buildDifferenceNote}
          extractExpressionsFromSentenceItem={extractExpressionsFromSentenceItem}
          renderExampleSentenceCards={renderExampleSentenceCards}
          renderSentenceWithExpressionHighlight={renderSentenceWithExpressionHighlight}
          handlePronounceSentence={handlePronounceSentence}
          saveExpressionFromSentence={saveExpressionFromSentence}
          openExpressionComposerFromSentence={openExpressionComposerFromSentence}
          startReviewFromCard={startReviewFromCard}
          openExpressionMap={openExpressionMap}
          openSourceScene={(slug) => router.push(`/scene/${slug}`)}
          retryAiEnrichment={retryAiEnrichment}
          applyClusterFilter={applyClusterFilter}
          openGenerateSimilarSheet={openGenerateSimilarSheet}
        />
      )}

      <Sheet
        open={addSheetOpen}
        onOpenChange={(open) => {
          setAddSheetOpen(open);
          if (!open && !savingManual) resetManualForm();
        }}
      >
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-0 bg-white">
          <SheetHeader>
            <SheetTitle>{manualSheetState.title}</SheetTitle>
            <SheetDescription>{manualSheetState.description}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{manualSheetState.itemTypeLabel}</p>
              <Tabs
                value={manualItemType}
                onValueChange={(value) =>
                  setManualItemType(value === "sentence" ? "sentence" : "expression")
                }
              >
                <TabsList className="w-full overflow-y-hidden">
                  <TabsTrigger value="expression" className="flex-1">
                    {zh.itemTypeExpression}
                  </TabsTrigger>
                  <TabsTrigger value="sentence" className="flex-1">
                    {zh.itemTypeSentence}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {manualItemType === "expression" ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.expressionTextLabel}</p>
                  <Input
                    value={manualText}
                    onChange={(event) => {
                      setManualText(event.target.value);
                      clearManualExpressionAssist();
                    }}
                    placeholder={zh.expressionTextPlaceholder}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={manualAssistLoading || !manualText.trim()}
                  onClick={() => void loadManualExpressionAssist(manualText)}
                >
                  {manualAssistLoading ? `${zh.generatingSuggestions}...` : zh.findMoreRelated}
                </Button>
                {manualExpressionAssist ? (
                  <div className="space-y-3 rounded-xl bg-[rgb(246,246,246)] p-3">
                    <div className="space-y-1 rounded-lg bg-white p-3">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={Boolean(manualSelectedMap[normalizePhraseText(manualExpressionAssist.inputItem.text)])}
                          onChange={() => toggleManualSelected(manualExpressionAssist.inputItem.text)}
                        />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{zh.currentInputCard}</p>
                          <p className="text-sm font-medium">{manualExpressionAssist.inputItem.text}</p>
                          {manualExpressionAssist.inputItem.translation ? (
                            <p className="text-xs text-muted-foreground">
                              {manualExpressionAssist.inputItem.translation}
                            </p>
                          ) : null}
                          {manualExpressionAssist.inputItem.usageNote ? (
                            <p className="text-xs text-muted-foreground">
                              {manualExpressionAssist.inputItem.usageNote}
                            </p>
                          ) : null}
                          {renderExampleSentenceCards(
                            manualExpressionAssist.inputItem.examples,
                            manualExpressionAssist.inputItem.text,
                            {
                              onSpeak: handlePronounceSentence,
                              isSpeakingText: (text) =>
                                Boolean(text) &&
                                (playingText === text.trim() || ttsPlaybackState.text === text.trim()),
                              isLoadingText: (text) =>
                                Boolean(text) &&
                                ttsPlaybackState.status === "loading" &&
                                ttsPlaybackState.text === text.trim(),
                            },
                          )}
                        </div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{zh.similarExpressionsAuto}</p>
                      {manualExpressionAssist.similarExpressions.length > 0 ? (
                        manualExpressionAssist.similarExpressions.map((candidate) => (
                          <label
                            key={`similar-${candidate.text}`}
                            className="flex cursor-pointer items-start gap-2 rounded-lg bg-white p-3"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(manualSelectedMap[normalizePhraseText(candidate.text)])}
                              onChange={() => toggleManualSelected(candidate.text)}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{candidate.text}</p>
                              <p className="text-xs text-muted-foreground">
                                {normalizeSimilarLabel(candidate.differenceLabel)}
                              </p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">{zh.similarEmpty}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{zh.contrastExpressionsAuto}</p>
                      {manualExpressionAssist.contrastExpressions.length > 0 ? (
                        manualExpressionAssist.contrastExpressions.map((candidate) => (
                          <label
                            key={`contrast-${candidate.text}`}
                            className="flex cursor-pointer items-start gap-2 rounded-lg bg-white p-3"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(manualSelectedMap[normalizePhraseText(candidate.text)])}
                              onChange={() => toggleManualSelected(candidate.text)}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{candidate.text}</p>
                              <p className="text-xs text-muted-foreground">{candidate.differenceLabel}</p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">{zh.noContrastExpressions}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.sentenceMainLabel}</p>
                  <Textarea
                    value={manualSentence}
                    onChange={(event) => setManualSentence(event.target.value)}
                    rows={4}
                    placeholder={zh.sentenceMainPlaceholder}
                  />
                  <p className="text-[11px] text-muted-foreground">{zh.sentenceAutoHint}</p>
                </div>
              </div>
            )}
          </div>

          <SheetFooter>
            <div
              className={`grid gap-2 pb-safe ${
                manualSheetState.footerGridClassName
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                className={appleButtonClassName}
                disabled={manualSheetState.isSaving}
                onClick={() => void handleSaveManualExpression("save")}
              >
                {manualSheetState.primaryActionLabel}
              </Button>
              {manualSheetState.showSecondaryAction ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={manualSheetState.isSaving}
                  onClick={() => void handleSaveManualExpression("save_and_review")}
                >
                  {manualSheetState.secondaryActionLabel}
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={quickAddRelatedOpen}
        onOpenChange={(open) => {
          setQuickAddRelatedOpen(open);
          if (!open && !savingQuickAddRelated) {
            resetQuickAddRelatedForm();
          }
        }}
      >
        <SheetContent
          side="bottom"
          overlayClassName="z-[80]"
          className="z-[81] max-h-[85vh] overflow-y-auto rounded-t-2xl border-0 bg-white"
        >
          <SheetHeader>
            <SheetTitle>{zh.quickAddRelatedTitle}</SheetTitle>
            <SheetDescription>{zh.quickAddRelatedDesc}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-2">
            <button
              type="button"
              className="w-full rounded-xl bg-[rgb(246,246,246)] p-3 text-left transition hover:bg-[rgb(238,240,242)]"
              onClick={() => void handleCopyQuickAddTarget()}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{zh.quickAddTargetLabel}</p>
                  <p className="text-xs text-muted-foreground">{zh.quickAddCopyTarget}</p>
                </div>
                <p className="text-sm font-medium">{focusExpression?.text ?? ""}</p>
              </div>
            </button>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{zh.quickAddTextLabel}</p>
              <Input
                ref={quickAddRelatedInputRef}
                value={quickAddRelatedText}
                onChange={(event) => setQuickAddRelatedText(event.target.value)}
                placeholder={zh.quickAddTextPlaceholder}
              />
              {quickAddRelatedValidationMessage ? (
                <p className="text-xs text-[rgb(185,28,28)]">{quickAddRelatedValidationMessage}</p>
              ) : quickAddRelatedLibraryHint ? (
                <p className="text-xs text-[rgb(8,99,117)]">{quickAddRelatedLibraryHint}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{zh.quickAddRelationTypeLabel}</p>
              <Tabs
                value={quickAddRelatedType}
                onValueChange={(value) =>
                  setQuickAddRelatedType(value === "contrast" ? "contrast" : "similar")
                }
              >
                <TabsList className="w-full overflow-y-hidden">
                  <TabsTrigger value="similar" className="flex-1">
                    {zh.quickAddSimilar}
                  </TabsTrigger>
                  <TabsTrigger value="contrast" className="flex-1">
                    {zh.quickAddContrast}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <SheetFooter>
            <div className="grid gap-2 pb-safe">
              <Button
                type="button"
                variant="ghost"
                className={appleButtonClassName}
                disabled={
                  savingQuickAddRelated ||
                  !quickAddRelatedText.trim() ||
                  Boolean(quickAddRelatedValidationMessage)
                }
                onClick={() => void handleSaveQuickAddRelated()}
              >
                {savingQuickAddRelated ? `${zh.quickAddSubmit}...` : zh.quickAddSubmit}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={similarSheetOpen}
        onOpenChange={(open) => {
          setSimilarSheetOpen(open);
          if (!open && !savingSelectedSimilar) {
            resetGeneratedSimilarSheet();
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-0 bg-white">
          <SheetHeader>
            <SheetTitle>{generatedSimilarSheetState.title}</SheetTitle>
            <SheetDescription>{generatedSimilarSheetState.description}</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-2">
            {generatedSimilarSheetState.showSeedExpression ? (
              <div className="rounded-lg bg-[rgb(246,246,246)] p-2.5">
                <p className="text-xs text-muted-foreground">{generatedSimilarSheetState.centerExpressionLabel}</p>
                <p className="text-sm font-medium">{similarSeedExpression?.text ?? ""}</p>
              </div>
            ) : null}
            {generatedSimilarSheetState.showGenerating ? (
              <p className="text-sm text-muted-foreground">{generatedSimilarSheetState.generatingLabel}</p>
            ) : null}
            {generatedSimilarSheetState.showEmpty ? (
              <p className="text-sm text-muted-foreground">{generatedSimilarSheetState.emptyLabel}</p>
            ) : null}
            {generatedSimilarSheetState.showCandidates ? (
              <div className="space-y-2">
                {generatedSimilarCandidates.map((candidate) => {
                  const normalized = normalizePhraseText(candidate.text);
                  const checked = Boolean(selectedSimilarMap[normalized]);
                  return (
                    <label key={normalized} className="flex cursor-pointer items-start gap-2 rounded-lg bg-[rgb(246,246,246)] p-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => toggleCandidateSelected(candidate.text)}
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{candidate.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {normalizeSimilarLabel(candidate.differenceLabel)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <div className="grid grid-cols-2 gap-2 pb-safe">
              <Button type="button" variant="ghost" className={appleButtonClassName} onClick={() => setSimilarSheetOpen(false)}>
                {generatedSimilarSheetState.closeLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={appleButtonClassName}
                disabled={generatedSimilarSheetState.submitDisabled}
                onClick={() => void saveSelectedSimilarCandidates()}
              >
                {generatedSimilarSheetState.submitLabel}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FocusDetailSheet {...focusDetailSheetProps} {...focusDetailSheetHandlers} />

      <MoveIntoClusterSheet {...moveIntoClusterSheetProps} />

      <ExpressionMapSheet
        open={mapOpen}
        loading={mapLoading}
        error={mapError}
        data={mapData}
        activeClusterId={activeClusterId}
        activeCluster={activeCluster}
        centerExpressionText={centerExpressionText}
        displayedClusterExpressions={displayedClusterExpressions}
        expressionStatusByNormalized={expressionStatusByNormalized}
        addingCluster={addingCluster}
        appleButtonClassName={appleButtonClassName}
        labels={{
          title: zh.mapTitle,
          description: zh.mapDesc,
          loading: zh.mapLoading,
          empty: zh.mapEmpty,
          centerExpression: zh.centerExpression,
          clusterMeaning: zh.clusterMeaning,
          relatedExpressions: zh.relatedExpressions,
          clusterEmpty: zh.clusterEmpty,
          mapLimitedPrefix: zh.mapLimitedPrefix,
          mapLimitedSuffix: zh.mapLimitedSuffix,
          statusUnknown: zh.statusUnknown,
          close: zh.close,
          practiceCluster: zh.practiceCluster,
          addCluster: zh.addCluster,
        }}
        buildDifferenceNote={buildDifferenceNote}
        onOpenChange={setMapOpen}
        onSelectCluster={setActiveClusterId}
        onPracticeCluster={handlePracticeCluster}
        onAddCluster={() => void handleAddClusterToReview()}
      />
    </div>
  );
}

