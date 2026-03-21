"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { TtsActionButton } from "@/components/audio/tts-action-button";
import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { playChunkAudio, stopTtsPlayback } from "@/lib/utils/tts-api";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import {
  detachExpressionClusterMemberFromApi,
  ensureExpressionClusterForPhraseFromApi,
  moveExpressionClusterMemberFromApi,
  setExpressionClusterMainFromApi,
} from "@/lib/utils/expression-clusters-api";
import { ExpressionCluster, ExpressionMapResponse } from "@/lib/types/expression-map";
import {
  enrichSimilarExpressionFromApi,
  enrichSimilarExpressionsBatchFromApi,
  generateManualExpressionAssistFromApi,
  generateManualSentenceAssistFromApi,
  getPhraseRelationsBatchFromApi,
  getPhraseRelationsFromApi,
  generateSimilarExpressionsFromApi,
  getMyPhrasesFromApi,
  ManualExpressionAssistResponse,
  PhraseReviewStatus,
  savePhrasesBatchFromApi,
  SimilarExpressionCandidateResponse,
  savePhraseFromApi,
  UserPhraseRelationItemResponse,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  MoveIntoClusterSheet,
} from "@/features/chunks/components/move-into-cluster-sheet";
import { FocusDetailActions } from "@/features/chunks/components/focus-detail-actions";
import { FocusDetailConfirm } from "@/features/chunks/components/focus-detail-confirm";
import { FocusDetailContent } from "@/features/chunks/components/focus-detail-content";
import { ClusterFocusList } from "@/features/chunks/components/cluster-focus-list";
import {
  MoveIntoClusterCandidate,
  MoveIntoClusterGroup,
  SavedRelationRowsBySourceId,
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

const overlapScore = (a: string, b: string) => {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
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

type SavedRelatedExpressionItem = {
  row: UserPhraseItemResponse;
  relationType: "similar" | "contrast";
};

type SavedRelationCacheEntry = {
  loaded: boolean;
  rows: UserPhraseRelationItemResponse[];
};

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
  const clusterFromQuery = searchParams.get("cluster")?.trim() ?? "";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<PhraseReviewStatus | "all">("all");
  const [contentFilter, setContentFilter] = useState<"expression" | "sentence">("expression");
  const [expressionViewMode, setExpressionViewMode] = useState<"list" | "focus">("focus");
  const [expressionClusterFilterId, setExpressionClusterFilterId] = useState<string>(clusterFromQuery);
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");

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
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [manualItemType, setManualItemType] = useState<"expression" | "sentence">("expression");
  const [manualText, setManualText] = useState("");
  const [manualSentence, setManualSentence] = useState("");
  const [manualExpressionAssist, setManualExpressionAssist] = useState<ManualExpressionAssistResponse | null>(null);
  const [manualAssistLoading, setManualAssistLoading] = useState(false);
  const [manualSelectedMap, setManualSelectedMap] = useState<Record<string, boolean>>({});
  const [savingManual, setSavingManual] = useState(false);
  const [savingSentenceExpressionKey, setSavingSentenceExpressionKey] = useState<string | null>(
    null,
  );
  const [savedSentenceExpressionKeys, setSavedSentenceExpressionKeys] = useState<
    Record<string, boolean>
  >({});
  const [similarSheetOpen, setSimilarSheetOpen] = useState(false);
  const [similarSeedExpression, setSimilarSeedExpression] = useState<UserPhraseItemResponse | null>(null);
  const [generatingSimilarForId, setGeneratingSimilarForId] = useState<string | null>(null);
  const [generatedSimilarCandidates, setGeneratedSimilarCandidates] = useState<
    SimilarExpressionCandidateResponse[]
  >([]);
  const [selectedSimilarMap, setSelectedSimilarMap] = useState<Record<string, boolean>>({});
  const [savingSelectedSimilar, setSavingSelectedSimilar] = useState(false);
  const [retryingEnrichmentIds, setRetryingEnrichmentIds] = useState<Record<string, boolean>>({});
  const [focusExpressionId, setFocusExpressionId] = useState<string>("");
  const [focusAssistLoading, setFocusAssistLoading] = useState(false);
  const [focusAssistData, setFocusAssistData] = useState<ManualExpressionAssistResponse | null>(null);
  const [focusRelationTab, setFocusRelationTab] = useState<"similar" | "contrast">("similar");
  const [expandedFocusMainId, setExpandedFocusMainId] = useState<string | null>(null);
  const [focusRelationActiveText, setFocusRelationActiveText] = useState("");
  const [savingFocusCandidateKey, setSavingFocusCandidateKey] = useState<string | null>(null);
  const [detachingClusterMember, setDetachingClusterMember] = useState(false);
  const [detailConfirmAction, setDetailConfirmAction] = useState<FocusDetailConfirmAction | null>(null);
  const [moveIntoClusterOpen, setMoveIntoClusterOpen] = useState(false);
  const [movingIntoCluster, setMovingIntoCluster] = useState(false);
  const [ensuringMoveTargetCluster, setEnsuringMoveTargetCluster] = useState(false);
  const [expandedMoveIntoClusterGroups, setExpandedMoveIntoClusterGroups] = useState<Record<string, boolean>>({});
  const [selectedMoveIntoClusterMap, setSelectedMoveIntoClusterMap] = useState<Record<string, boolean>>({});
  const [focusDetailOpen, setFocusDetailOpen] = useState(false);
  const [focusDetailLoading, setFocusDetailLoading] = useState(false);
  const [focusDetail, setFocusDetail] = useState<FocusDetailState | null>(null);
  const [focusDetailTab, setFocusDetailTab] = useState<FocusDetailTabValue>("info");
  const [focusDetailActionsOpen, setFocusDetailActionsOpen] = useState(false);
  const [focusDetailTrail, setFocusDetailTrail] = useState<FocusDetailTrailItem[]>([]);
  const [savedRelationCache, setSavedRelationCache] = useState<Record<string, SavedRelationCacheEntry>>({});
  const [savedRelationLoadingKey, setSavedRelationLoadingKey] = useState<string | null>(null);
  const [focusRelationsBootstrapDone, setFocusRelationsBootstrapDone] = useState(false);
  const pendingRelationRequestIdsRef = useRef<Set<string>>(new Set());

  const activeLoadTokenRef = useRef(0);

  useEffect(
    () => () => {
      stopTtsPlayback();
    },
    [],
  );

  const loadPhrases = async (
    nextQuery: string,
    nextFilter: PhraseReviewStatus | "all",
    nextContentFilter: "expression" | "sentence",
    nextExpressionClusterFilterId: string,
    options?: { preferCache?: boolean },
  ) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const preferCache = options?.preferCache ?? false;
    if (!preferCache) setListDataSource("none");
    setLoading(true);

    let hasCacheFallback = false;
    const canApply = () => activeLoadTokenRef.current === token;

    const requestParams = {
      query: nextQuery.trim(),
      limit: 100,
      page: 1,
      status: "saved" as const,
      reviewStatus: nextFilter,
      learningItemType: nextContentFilter,
      expressionClusterId: nextExpressionClusterFilterId || undefined,
    };

    if (preferCache) {
      try {
        const cache = await getPhraseListCache({
          query: requestParams.query,
          status: requestParams.status,
          reviewStatus: requestParams.reviewStatus,
          learningItemType: requestParams.learningItemType,
          expressionClusterId: requestParams.expressionClusterId,
          page: requestParams.page,
          limit: requestParams.limit,
        });
        if (canApply() && cache.found && cache.record) {
          hasCacheFallback = true;
          setPhrases(cache.record.data.rows);
          setTotal(cache.record.data.total);
          setListDataSource("cache");
          setLoading(false);
        }
      } catch {
        // Ignore cache failure.
      }
    }

    try {
      const result = await getMyPhrasesFromApi(requestParams);
      if (!canApply()) return;
      setPhrases(result.rows);
      setTotal(result.total);
      setListDataSource("network");
      setLoading(false);
      void setPhraseListCache(
        {
          query: requestParams.query,
          status: requestParams.status,
          reviewStatus: requestParams.reviewStatus,
          learningItemType: requestParams.learningItemType,
          expressionClusterId: requestParams.expressionClusterId,
          page: requestParams.page,
          limit: requestParams.limit,
        },
        result,
      ).catch(() => {
        // Non-blocking.
      });
    } catch (error) {
      if (!canApply()) return;
      if (!hasCacheFallback) {
        toast.error(error instanceof Error ? error.message : zh.loadFailed);
        setPhrases([]);
        setTotal(0);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: true,
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, reviewFilter, contentFilter, expressionClusterFilterId]);

  useEffect(() => {
    setExpressionClusterFilterId(clusterFromQuery);
  }, [clusterFromQuery]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[expression-library][cache-debug]", {
      source: listDataSource,
      count: phrases.length,
      filter: reviewFilter,
      contentFilter,
      expressionClusterFilterId,
    });
  }, [listDataSource, phrases.length, reviewFilter, contentFilter, expressionClusterFilterId]);

  const summary = useMemo(() => {
    if (loading) return zh.loading;
    return `${zh.total} ${total} ${zh.items}`;
  }, [loading, total]);

  const activeCluster = useMemo(() => {
    if (!mapData || !activeClusterId) return null;
    return mapData.clusters.find((cluster) => cluster.id === activeClusterId) ?? null;
  }, [activeClusterId, mapData]);

  const expressionStatusByNormalized = useMemo(() => {
    const map = new Map<string, PhraseReviewStatus>();
    for (const row of phrases) {
      map.set(normalizePhraseText(row.text), row.reviewStatus);
    }
    return map;
  }, [phrases]);

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
    const resolvedId = focusExpressionId ? resolveFocusMainExpressionIdForRow(focusExpressionId) : "";
    return (
      focusMainExpressionRows.find((row) => row.userPhraseId === resolvedId) ??
      focusMainExpressionRows[0]
    );
  }, [focusExpressionId, focusMainExpressionRows, resolveFocusMainExpressionIdForRow]);

  useEffect(() => {
    if (contentFilter !== "expression") return;
    if (focusMainExpressionRows.length === 0) {
      setFocusExpressionId("");
      setFocusAssistData(null);
      return;
    }
    const resolvedId = focusExpressionId ? resolveFocusMainExpressionIdForRow(focusExpressionId) : "";
    if (!resolvedId || !focusMainExpressionRows.some((row) => row.userPhraseId === resolvedId)) {
      setFocusExpressionId(focusMainExpressionRows[0].userPhraseId);
      return;
    }
    if (resolvedId !== focusExpressionId) {
      setFocusExpressionId(resolvedId);
    }
  }, [contentFilter, focusExpressionId, focusMainExpressionRows, resolveFocusMainExpressionIdForRow]);

  useEffect(() => {
    setFocusAssistData(null);
    setFocusRelationTab("similar");
  }, [focusExpressionId]);

  const clusterFilterExpressionLabel = useMemo(() => {
    if (!expressionClusterFilterId) return "";
    const row = phrases.find(
      (item) =>
        item.learningItemType === "expression" &&
        item.expressionClusterId === expressionClusterFilterId,
    );
    return row?.text ?? "";
  }, [expressionClusterFilterId, phrases]);

  const centerExpressionText = useMemo(() => {
    if (!activeCluster) return mapSourceExpression?.text ?? "";
    const sourceSceneId = mapData?.sourceSceneId ?? null;
    const candidates = Array.from(
      new Set(activeCluster.expressions.map((text) => text.trim()).filter(Boolean)),
    );
    if (candidates.length === 0) return mapSourceExpression?.text ?? activeCluster.anchor;

    const scored = candidates.map((text) => {
      const normalized = normalizePhraseText(text);
      const userRow = phraseByNormalized.get(normalized) ?? null;
      const nodes = activeCluster.nodes.filter(
        (node) => normalizePhraseText(node.text) === normalized,
      );
      let score = 0;
      if (nodes.some((node) => node.sourceType === "original" && node.sourceSceneId === sourceSceneId)) {
        score += 600;
      }
      if (userRow) {
        score += 260;
        score += Math.min(80, userRow.reviewCount * 10);
      }
      if (userRow?.sourceSceneSlug && mapSourceExpression?.sourceSceneSlug) {
        if (userRow.sourceSceneSlug === mapSourceExpression.sourceSceneSlug) score += 80;
      }
      const tokenCount = Math.max(1, tokenize(text).length);
      score += Math.max(0, 40 - tokenCount * 6);
      score += Math.max(0, 40 - text.length);
      return { text, normalized, score };
    });

    scored.sort((a, b) => b.score - a.score || a.normalized.localeCompare(b.normalized));
    return scored[0]?.text ?? mapSourceExpression?.text ?? activeCluster.anchor;
  }, [activeCluster, mapData?.sourceSceneId, mapSourceExpression, phraseByNormalized]);

  const displayedClusterExpressions = useMemo(() => {
    if (!activeCluster) return [] as string[];
    const center = centerExpressionText || activeCluster.anchor;
    const uniqueExpressions = Array.from(
      new Set(activeCluster.expressions.map((text) => text.trim()).filter(Boolean)),
    );
    const sourceSceneId = mapData?.sourceSceneId ?? null;

    const scored = uniqueExpressions.map((text) => {
      const normalized = normalizePhraseText(text);
      const row = phraseByNormalized.get(normalized) ?? null;
      const nodes = activeCluster.nodes.filter(
        (node) => normalizePhraseText(node.text) === normalized,
      );
      let score = 0;
      if (normalized === normalizePhraseText(center)) score += 1000;
      score += overlapScore(center, text) * 120;
      if (row) score += 100;
      if (row?.reviewCount) score += Math.min(20, row.reviewCount);
      if (nodes.some((node) => node.sourceType === "original" && node.sourceSceneId === sourceSceneId)) {
        score += 50;
      }
      score += Math.max(0, 18 - Math.abs(text.length - center.length));
      return { text, normalized, score };
    });

    scored.sort((a, b) => b.score - a.score || a.normalized.localeCompare(b.normalized));
    return scored.slice(0, 8).map((item) => item.text);
  }, [activeCluster, centerExpressionText, mapData?.sourceSceneId, phraseByNormalized]);

  const getPrimaryActionLabel = (item: UserPhraseItemResponse) => {
    if (item.learningItemType === "sentence") return zh.sentenceReviewPending;
    if (item.reviewStatus === "reviewing") return zh.continueReview;
    if (item.reviewStatus === "mastered") {
      return item.expressionClusterId ? zh.reviewFamily : zh.revisitOne;
    }
    return zh.startReview;
  };

  const loadFocusAssist = useCallback(async (item: UserPhraseItemResponse) => {
    if (item.learningItemType !== "expression") return;
    setFocusAssistLoading(true);
    try {
      const response = await generateManualExpressionAssistFromApi({
        text: item.text,
        existingExpressions: expressionRows.map((row) => row.text),
      });
      setFocusAssistData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
      setFocusAssistData(null);
    } finally {
      setFocusAssistLoading(false);
    }
  }, [expressionRows]);

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
    setManualExpressionAssist(null);
    setManualSelectedMap({});
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

  const saveFocusCandidate = async (
    focusItem: UserPhraseItemResponse,
    candidate: SimilarExpressionCandidateResponse,
    kind: "similar" | "contrast",
  ) => {
    const key = `${kind}:${normalizePhraseText(candidate.text)}`;
    if (savingFocusCandidateKey === key) return;
    setSavingFocusCandidateKey(key);
    try {
      const response = await savePhraseFromApi({
        text: candidate.text,
        learningItemType: "expression",
        sourceType: "manual",
        sourceNote: kind === "similar" ? "focus-similar-ai" : "focus-contrast-ai",
        sourceSentenceText: focusItem.sourceSentenceText ?? undefined,
        sourceChunkText: candidate.text,
        expressionClusterId: kind === "similar" ? focusItem.expressionClusterId ?? undefined : undefined,
        relationSourceUserPhraseId: focusItem.userPhraseId,
        relationType: kind,
      });
      await enrichSimilarExpressionFromApi({
        userPhraseId: response.userPhrase.id,
        baseExpression: focusItem.text,
        differenceLabel: candidate.differenceLabel,
      });
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      setSavedRelationCache((current) => {
        const next = { ...current };
        delete next[focusItem.userPhraseId];
        return next;
      });
      toast.success(zh.addSelectedSimilarSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setSavingFocusCandidateKey(null);
    }
  };

  // 表达簇动作
  const resetMoveIntoClusterSelection = useCallback(() => {
    setExpandedMoveIntoClusterGroups({});
    setSelectedMoveIntoClusterMap({});
  }, []);

  const detachFocusDetailFromCluster = async () => {
    const savedItem = focusDetail?.savedItem;
    const clusterId = savedItem?.expressionClusterId ?? "";
    if (!savedItem || !clusterId) return;

    setDetachingClusterMember(true);
    try {
      await detachExpressionClusterMemberFromApi({
        clusterId,
        userPhraseId: savedItem.userPhraseId,
        createNewCluster: true,
      });
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      setSavedRelationCache((current) => {
        const next = { ...current };
        delete next[savedItem.userPhraseId];
        if (focusExpression?.userPhraseId) {
          delete next[focusExpression.userPhraseId];
        }
        return next;
      });
      toast.success(zh.detachClusterMemberSuccess);
      setDetailConfirmAction(null);
      setFocusDetailOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setDetachingClusterMember(false);
    }
  };

  const setFocusDetailAsClusterMain = async () => {
    const detailText = focusDetail?.text ?? "";
    if (!detailText) return;

    const saved = phraseByNormalized.get(normalizePhraseText(detailText));
    if (!saved) return;

    try {
      if (saved.expressionClusterId) {
        await setExpressionClusterMainFromApi({
          clusterId: saved.expressionClusterId,
          mainUserPhraseId: saved.userPhraseId,
        });
      }
      assignFocusMainExpression(saved);
      setFocusDetailActionsOpen(false);
      setDetailConfirmAction(null);
      setFocusDetailOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    }
  };

  const handleMoveSelectedIntoCurrentCluster = async () => {
    const targetClusterId = focusExpression?.expressionClusterId ?? "";
    const targetMainUserPhraseId = focusExpression?.userPhraseId ?? "";
    if (!targetClusterId || !targetMainUserPhraseId) return;

    const selectedCandidates = moveIntoClusterCandidates.filter(
      (candidate) => selectedMoveIntoClusterMap[candidate.row.userPhraseId],
    );
    if (selectedCandidates.length === 0) {
      toast.error(zh.moveIntoClusterSelectOne);
      return;
    }

    setMovingIntoCluster(true);
    let successCount = 0;
    let mergedClusterCount = 0;
    let movedMemberCount = 0;
    let attachedMemberCount = 0;
    const coveredSourceClusterIds = new Set<string>();
    const failedMessages: string[] = [];

    try {
      for (const candidate of selectedCandidates) {
        if (candidate.sourceClusterId && coveredSourceClusterIds.has(candidate.sourceClusterId)) {
          continue;
        }

        try {
          const result = await moveExpressionClusterMemberFromApi({
            targetClusterId,
            userPhraseId: candidate.row.userPhraseId,
            targetMainUserPhraseId,
          });
          successCount += 1;
          if (result.action === "merged_cluster") {
            mergedClusterCount += 1;
            if (candidate.sourceClusterId) {
              coveredSourceClusterIds.add(candidate.sourceClusterId);
            }
          } else if (result.action === "moved_member") {
            movedMemberCount += 1;
          } else {
            attachedMemberCount += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : zh.loadFailed;
          if (message.includes("already belongs to the target cluster")) {
            continue;
          }
          failedMessages.push(`${candidate.row.text}：${message}`);
        }
      }

      if (successCount > 0) {
        await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
          preferCache: false,
        });
        setSavedRelationCache((current) => {
          const next = { ...current };
          if (focusExpression?.userPhraseId) {
            delete next[focusExpression.userPhraseId];
          }
          for (const candidate of selectedCandidates) {
            delete next[candidate.row.userPhraseId];
          }
          return next;
        });

        const summary = [
          mergedClusterCount ? `${mergedClusterCount}\u4e2a\u6574\u7c07` : "",
          movedMemberCount ? `${movedMemberCount}\u4e2a\u5b50\u8868\u8fbe` : "",
          attachedMemberCount ? `${attachedMemberCount}\u4e2a\u72ec\u7acb\u8868\u8fbe` : "",
        ]
          .filter(Boolean)
          .join("\u3001");
        toast.success(
          `${zh.moveIntoClusterSuccess} ${successCount} \u9879${summary ? `\uff08${summary}\uff09` : ""}`,
        );
        setMoveIntoClusterOpen(false);
        resetMoveIntoClusterSelection();
      }

      if (failedMessages.length > 0) {
        toast.error(`${zh.moveIntoClusterPartialFailed}\uff1a${failedMessages[0]}`);
      }
    } finally {
      setMovingIntoCluster(false);
    }
  };

  const openMoveIntoCurrentCluster = async () => {
    if (!focusExpression || moveIntoClusterCandidates.length === 0) return;

    setFocusDetailActionsOpen(false);
    resetMoveIntoClusterSelection();

    if (!focusExpression.expressionClusterId) {
      setEnsuringMoveTargetCluster(true);
      try {
        await ensureExpressionClusterForPhraseFromApi({
          userPhraseId: focusExpression.userPhraseId,
          title: focusExpression.text,
        });
        await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
          preferCache: false,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : zh.loadFailed);
        return;
      } finally {
        setEnsuringMoveTargetCluster(false);
      }
    }

    setMoveIntoClusterOpen(true);
  };

  const focusDetailClusterMemberCount = useMemo(() => {
    const clusterId = focusDetail?.savedItem?.expressionClusterId ?? null;
    if (!clusterId) return 0;
    return clusterMembersByClusterId.get(clusterId)?.length ?? 0;
  }, [clusterMembersByClusterId, focusDetail?.savedItem?.expressionClusterId]);

  const canMoveIntoCurrentCluster = Boolean(focusExpression) && moveIntoClusterCandidates.length > 0;
  const savedRelationRowsBySourceId: SavedRelationRowsBySourceId = useMemo(
    () => Object.fromEntries(Object.entries(savedRelationCache).map(([key, value]) => [key, value.rows])),
    [savedRelationCache],
  );
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
  const showFocusDetailActions = canMoveIntoCurrentCluster || canSetCurrentClusterMain || canSetStandaloneMain;

  // Focus 详情打开与链路切换
  const openFocusDetail = async (params: {
    text: string;
    differenceLabel?: string;
    kind: FocusDetailState["kind"];
    initialTab?: FocusDetailTabValue;
    chainMode?: "reset" | "append";
  }) => {
    setFocusDetailTab(params.initialTab ?? "info");
    setFocusDetailActionsOpen(false);
    const savedItem = phraseByNormalized.get(normalizePhraseText(params.text)) ?? null;
    const nextTrailItem: FocusDetailTrailItem = {
      userPhraseId: savedItem?.userPhraseId ?? null,
      text: params.text,
      differenceLabel: params.differenceLabel ?? null,
      kind: params.kind,
      tab: params.initialTab ?? "info",
    };
    setFocusDetailTrail((current) => {
      if (params.chainMode !== "append") return [nextTrailItem];
      const next = [...current];
      const duplicateIndex = next.findIndex(
        (item) =>
          normalizePhraseText(item.text) === normalizePhraseText(params.text) &&
          item.kind === params.kind,
      );
      if (duplicateIndex >= 0) {
        return next.slice(0, duplicateIndex + 1).map((item, index) =>
          index === duplicateIndex ? nextTrailItem : item,
        );
      }
      return [...next, nextTrailItem];
    });
    setFocusDetailOpen(true);
    setFocusDetail({
      text: params.text,
      differenceLabel: params.differenceLabel ?? null,
      kind: params.kind,
      savedItem,
      assistItem: null,
    });

    if (savedItem) return;

    setFocusDetailLoading(true);
    try {
      const response = await generateManualExpressionAssistFromApi({
        text: params.text,
        existingExpressions: expressionRows.map((row) => row.text),
      });
      setFocusDetail((current) =>
        current && normalizePhraseText(current.text) === normalizePhraseText(params.text)
          ? {
              ...current,
              assistItem: response.inputItem,
              savedItem:
                phraseByNormalized.get(normalizePhraseText(params.text)) ?? current.savedItem,
            }
          : current,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setFocusDetailLoading(false);
    }
  };

  const openFocusSiblingDetail = (direction: -1 | 1) => {
    const sourceItems =
      focusRelationTab === "contrast"
        ? focusContrastItems
        : focusSimilarItems;
    if (!focusDetail || sourceItems.length === 0) return;

    const currentIndex = sourceItems.findIndex(
      (item) => normalizePhraseText(item.text) === normalizePhraseText(focusDetail.text),
    );
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + sourceItems.length) % sourceItems.length;
    const nextItem = sourceItems[nextIndex];
    if (!nextItem) return;
    void openFocusDetail({
      text: nextItem.text,
      differenceLabel: nextItem.differenceLabel,
      kind: nextItem.kind,
      initialTab: focusDetailTab === "contrast" ? "contrast" : focusDetailTab === "similar" ? "similar" : "info",
      chainMode: "append",
    });
  };

  const reopenFocusTrailItem = useCallback(
    (index: number) => {
      const target = focusDetailTrail[index];
      if (!target) return;
      if (target.userPhraseId) {
        setFocusExpressionId(resolveFocusMainExpressionIdForRow(target.userPhraseId));
      }
      setFocusDetailTab(target.tab);
      setFocusDetailTrail((current) => current.slice(0, index + 1));
      const savedItem = phraseByNormalized.get(normalizePhraseText(target.text)) ?? null;
      setFocusDetailOpen(true);
      setFocusDetail({
        text: target.text,
        differenceLabel: target.differenceLabel ?? null,
        kind: target.kind,
        savedItem,
        assistItem: null,
      });
    },
    [focusDetailTrail, phraseByNormalized, resolveFocusMainExpressionIdForRow],
  );

  useEffect(() => {
    if (contentFilter !== "expression" || expressionRows.length === 0) return;
    const pendingIds = expressionRows
      .map((row) => row.userPhraseId)
      .filter(
        (userPhraseId) =>
          !savedRelationCache[userPhraseId]?.loaded &&
          !pendingRelationRequestIdsRef.current.has(userPhraseId),
      );
    if (pendingIds.length === 0) return;

    for (const userPhraseId of pendingIds) {
      pendingRelationRequestIdsRef.current.add(userPhraseId);
    }

    let cancelled = false;
    void getPhraseRelationsBatchFromApi(pendingIds)
      .then((response) => {
        if (cancelled) return;
        const grouped = new Map<string, UserPhraseRelationItemResponse[]>();
        for (const row of response.rows) {
          const bucket = grouped.get(row.sourceUserPhraseId) ?? [];
          bucket.push(row);
          grouped.set(row.sourceUserPhraseId, bucket);
        }
        setSavedRelationCache((current) => {
          const next = { ...current };
          for (const userPhraseId of pendingIds) {
            next[userPhraseId] = {
              loaded: true,
              rows: grouped.get(userPhraseId) ?? [],
            };
          }
          return next;
        });
        setFocusRelationsBootstrapDone(true);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : zh.loadFailed);
        setSavedRelationCache((current) => {
          const next = { ...current };
          for (const userPhraseId of pendingIds) {
            next[userPhraseId] = {
              loaded: true,
              rows: [],
            };
          }
          return next;
        });
        setFocusRelationsBootstrapDone(true);
      })
      .finally(() => {
        for (const userPhraseId of pendingIds) {
          pendingRelationRequestIdsRef.current.delete(userPhraseId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentFilter, expressionRows, savedRelationCache]);

  useEffect(() => {
    if (contentFilter !== "expression") {
      setFocusRelationsBootstrapDone(false);
      return;
    }
    if (expressionRows.length === 0) {
      setFocusRelationsBootstrapDone(true);
      return;
    }
    const hasPending = expressionRows.some(
      (row) =>
        !savedRelationCache[row.userPhraseId]?.loaded ||
        pendingRelationRequestIdsRef.current.has(row.userPhraseId),
    );
    if (!hasPending) {
      setFocusRelationsBootstrapDone(true);
    }
  }, [contentFilter, expressionRows, savedRelationCache]);

  useEffect(() => {
    const userPhraseId = focusDetail?.savedItem?.userPhraseId ?? "";
    if (!userPhraseId) return;
    if (savedRelationCache[userPhraseId]?.loaded) return;
    if (pendingRelationRequestIdsRef.current.has(userPhraseId)) return;
    if (contentFilter === "expression" && expressionViewMode === "focus") {
      return;
    }

    let cancelled = false;
    pendingRelationRequestIdsRef.current.add(userPhraseId);
    setSavedRelationLoadingKey(userPhraseId);

    void getPhraseRelationsFromApi(userPhraseId)
      .then((response) => {
        if (cancelled) return;
        setSavedRelationCache((current) => ({
          ...current,
          [userPhraseId]: {
            loaded: true,
            rows: response.rows,
          },
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : zh.loadFailed);
        setSavedRelationCache((current) => ({
          ...current,
          [userPhraseId]: {
            loaded: true,
            rows: [],
          },
        }));
      })
      .finally(() => {
        pendingRelationRequestIdsRef.current.delete(userPhraseId);
        if (cancelled) return;
        setSavedRelationLoadingKey((current) => (current === userPhraseId ? null : current));
      });

    return () => {
      cancelled = true;
    };
  }, [
    contentFilter,
    expressionViewMode,
    focusDetail?.savedItem?.userPhraseId,
    focusRelationsBootstrapDone,
    savedRelationCache,
  ]);

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
    const normalized = clusterId.trim();
    if (!normalized) return;
    setExpressionClusterFilterId(normalized);
    setQuery("");
    setContentFilter("expression");
    setReviewFilter("all");
    const params = new URLSearchParams(searchParams.toString());
    params.set("cluster", normalized);
    router.replace(`/chunks?${params.toString()}`);
    if (sourceExpressionText) {
      toast.message(`${zh.filteredClusterPrefix} ${sourceExpressionText} ${zh.filteredClusterSuffix}`);
    }
  };

  const clearClusterFilter = () => {
    setExpressionClusterFilterId("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cluster");
    const suffix = params.toString();
    router.replace(`/chunks${suffix ? `?${suffix}` : ""}`);
  };

  const openGenerateSimilarSheet = async (item: UserPhraseItemResponse) => {
    if (item.learningItemType !== "expression") return;
    if (generatingSimilarForId === item.userPhraseId) return;
    setGeneratingSimilarForId(item.userPhraseId);
    setSimilarSeedExpression(item);
    setGeneratedSimilarCandidates([]);
    setSelectedSimilarMap({});
    setSimilarSheetOpen(true);
    try {
      const existingExpressions = expressionRows.map((row) => row.text);
      const response = await generateSimilarExpressionsFromApi({
        baseExpression: item.text,
        existingExpressions,
      });
      setGeneratedSimilarCandidates(response.candidates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setGeneratingSimilarForId(null);
    }
  };

  const toggleCandidateSelected = (candidateText: string) => {
    const key = normalizePhraseText(candidateText);
    if (!key) return;
    setSelectedSimilarMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedSimilarCandidates = useMemo(
    () =>
      generatedSimilarCandidates.filter((candidate) =>
        Boolean(selectedSimilarMap[normalizePhraseText(candidate.text)]),
      ),
    [generatedSimilarCandidates, selectedSimilarMap],
  );

  const saveSelectedSimilarCandidates = async () => {
    if (!similarSeedExpression || savingSelectedSimilar) return;
    if (selectedSimilarCandidates.length === 0) {
      toast.message(zh.selectAtLeastOne);
      return;
    }
    setSavingSelectedSimilar(true);
    try {
      const baseSaveResult = await savePhraseFromApi({
        text: similarSeedExpression.text,
        expressionClusterId:
          similarSeedExpression.expressionClusterId ??
          `create-cluster:${similarSeedExpression.userPhraseId}`,
        sourceType: similarSeedExpression.sourceType,
        sourceSceneSlug: similarSeedExpression.sourceSceneSlug ?? undefined,
        sourceSentenceText: similarSeedExpression.sourceSentenceText ?? undefined,
        sourceChunkText: similarSeedExpression.text,
        translation: similarSeedExpression.translation ?? undefined,
      });
      const clusterId = baseSaveResult.expressionClusterId;
      if (!clusterId) {
        throw new Error("未能为主表达创建同类表达组。");
      }

      const batchResult = await savePhrasesBatchFromApi({
        items: selectedSimilarCandidates.map((candidate) => ({
          text: candidate.text,
          expressionClusterId: clusterId,
          sourceType: "manual" as const,
          sourceNote: "similar-ai-mvp",
          sourceSentenceText: similarSeedExpression.sourceSentenceText ?? undefined,
          sourceChunkText: candidate.text,
          relationSourceUserPhraseId: similarSeedExpression.userPhraseId,
          relationType: "similar" as const,
        })),
      });
      const savedResponses = batchResult.items;

      void enrichSimilarExpressionsBatchFromApi({
        items: savedResponses.map((response, index) => {
          const candidate = selectedSimilarCandidates[index];
          return {
            userPhraseId: response.userPhrase.id,
            baseExpression: similarSeedExpression.text,
            differenceLabel: normalizeSimilarLabel(candidate?.differenceLabel),
          };
        }),
      }).finally(() => {
        window.setTimeout(() => {
          void loadPhrases(query, reviewFilter, contentFilter, clusterId, { preferCache: false });
        }, 600);
      });

      await loadPhrases(query, reviewFilter, contentFilter, clusterId, { preferCache: false });
      applyClusterFilter(clusterId, similarSeedExpression.text);
      setSimilarSheetOpen(false);
      toast.success(zh.addSelectedSimilarSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setSavingSelectedSimilar(false);
    }
  };

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
    if (playingText === text) {
      stopTtsPlayback();
      setPlayingText(null);
      return;
    }
    void (async () => {
      stopTtsPlayback();
      setPlayingText(text);
      try {
        await playChunkAudio({ chunkText: text });
      } catch {
        toast.message(zh.speechUnsupported);
      } finally {
        setPlayingText((prev) => (prev === text ? null : prev));
      }
    })();
  };

  const getReviewActionHint = (status: PhraseReviewStatus) => {
    if (status === "reviewing") return zh.reviewActionReviewingHint;
    if (status === "mastered") return zh.reviewActionMasteredHint;
    return zh.reviewActionSavedHint;
  };

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
    setManualExpressionAssist(null);
    setManualSelectedMap({});
  };

  const toggleManualSelected = (text: string) => {
    const key = normalizePhraseText(text);
    if (!key) return;
    setManualSelectedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadManualExpressionAssist = async () => {
    const text = manualText.trim();
    if (!text) {
      toast.error(zh.missingExpression);
      return;
    }
    if (manualAssistLoading) return;

    setManualAssistLoading(true);
    try {
      const response = await generateManualExpressionAssistFromApi({
        text,
        existingExpressions: expressionRows.map((row) => row.text),
      });
      setManualExpressionAssist(response);
      setManualSelectedMap({
        [normalizePhraseText(response.inputItem.text)]: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setManualAssistLoading(false);
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
        const assist = await generateManualSentenceAssistFromApi({ text: sentenceText });
        const response = await savePhraseFromApi({
          learningItemType: "sentence",
          sentenceText,
          translation: assist.sentenceItem.translation || undefined,
          usageNote: assist.sentenceItem.usageNote || undefined,
          sourceType: "manual",
          sourceSentenceText: sentenceText,
          sourceChunkText:
            assist.sentenceItem.extractedExpressions.join(" | ") || undefined,
        });

        reviewSessionExpressions = [
          {
            userPhraseId: response.userPhrase.id,
            text: sentenceText,
          },
        ];
      } else if (!manualExpressionAssist) {
        const response = await savePhraseFromApi({
          text,
          learningItemType: "expression",
          sourceType: "manual",
          sourceChunkText: text,
        });
        try {
          await enrichSimilarExpressionFromApi({
            userPhraseId: response.userPhrase.id,
          });
        } catch (enrichError) {
          console.warn("[phrases] auto enrich after manual save failed", enrichError);
          toast.error(zh.autoEnrichFailedKeepSaved);
        }
        reviewSessionExpressions = [
          {
            userPhraseId: response.userPhrase.id,
            text,
          },
        ];
      } else {
        const baseKey = normalizePhraseText(manualExpressionAssist.inputItem.text);
        const selectedBase = Boolean(manualSelectedMap[baseKey]);
        const selectedSimilar = manualExpressionAssist.similarExpressions.filter((candidate) =>
          Boolean(manualSelectedMap[normalizePhraseText(candidate.text)]),
        );
        const selectedContrast = manualExpressionAssist.contrastExpressions.filter((candidate) =>
          Boolean(manualSelectedMap[normalizePhraseText(candidate.text)]),
        );

        if (!selectedBase && selectedSimilar.length === 0 && selectedContrast.length === 0) {
          toast.message(zh.selectAtLeastOne);
          setSavingManual(false);
          return;
        }

        const savedForEnrich: Array<{ userPhraseId: string; text: string; differenceLabel?: string }> = [];
        let baseUserPhraseId: string | null = null;
        let familyId: string | null = null;

        if (selectedBase) {
          const baseResponse = await savePhraseFromApi({
            text: manualExpressionAssist.inputItem.text,
            learningItemType: "expression",
            translation: manualExpressionAssist.inputItem.translation || undefined,
            usageNote: manualExpressionAssist.inputItem.usageNote || undefined,
            expressionClusterId:
              selectedSimilar.length > 0 ? `create-cluster:${baseKey}` : undefined,
            sourceType: "manual",
            sourceSentenceText: manualExpressionAssist.inputItem.examples[0]?.en || undefined,
            sourceChunkText: manualExpressionAssist.inputItem.text,
          });
          familyId = baseResponse.expressionClusterId;
          await enrichSimilarExpressionFromApi({
            userPhraseId: baseResponse.userPhrase.id,
            baseExpression: manualExpressionAssist.inputItem.text,
          });
          baseUserPhraseId = baseResponse.userPhrase.id;
          reviewSessionExpressions.push({
            userPhraseId: baseResponse.userPhrase.id,
            text: manualExpressionAssist.inputItem.text,
          });
        }

        if (selectedSimilar.length > 0) {
          let remainingSimilar = selectedSimilar;
          if (!familyId) {
            const seedCandidate = selectedSimilar[0];
            const seedResponse = await savePhraseFromApi({
              text: seedCandidate.text,
              sourceType: "manual",
              sourceNote: "manual-similar-ai",
              sourceSentenceText: manualExpressionAssist.inputItem.examples[0]?.en || undefined,
              sourceChunkText: seedCandidate.text,
            });
            familyId = seedResponse.expressionClusterId;
            savedForEnrich.push({
              userPhraseId: seedResponse.userPhrase.id,
              text: seedCandidate.text,
              differenceLabel: seedCandidate.differenceLabel,
            });
            reviewSessionExpressions.push({
              userPhraseId: seedResponse.userPhrase.id,
              text: seedCandidate.text,
            });
            remainingSimilar = selectedSimilar.slice(1);
          }

          if (!familyId) {
            throw new Error("未能创建同类表达组。");
          }

          const batchItems = remainingSimilar.map((candidate) => ({
            text: candidate.text,
            expressionClusterId: familyId as string,
            sourceType: "manual" as const,
            sourceNote: "manual-similar-ai",
            sourceSentenceText: manualExpressionAssist.inputItem.examples[0]?.en || undefined,
            sourceChunkText: candidate.text,
            relationSourceUserPhraseId: baseUserPhraseId ?? undefined,
            relationType: baseUserPhraseId ? ("similar" as const) : undefined,
          }));
          if (batchItems.length === 0) {
            // Seed candidate already handled above.
          } else {
          const batchResult = await savePhrasesBatchFromApi({
            items: batchItems,
          });
          savedForEnrich.push(
            ...batchResult.items.map((response, index) => ({
              userPhraseId: response.userPhrase.id,
              text: remainingSimilar[index].text,
              differenceLabel: remainingSimilar[index].differenceLabel,
            })),
          );
          reviewSessionExpressions.push(
            ...batchResult.items.map((response, index) => ({
              userPhraseId: response.userPhrase.id,
              text: remainingSimilar[index].text,
            })),
          );
          }
        }

        if (selectedContrast.length > 0) {
          const batchResult = await savePhrasesBatchFromApi({
            items: selectedContrast.map((candidate) => ({
              text: candidate.text,
              sourceType: "manual" as const,
              sourceNote: "manual-contrast-ai",
              sourceSentenceText: manualExpressionAssist.inputItem.examples[0]?.en || undefined,
              sourceChunkText: candidate.text,
              relationSourceUserPhraseId: baseUserPhraseId ?? undefined,
              relationType: baseUserPhraseId ? ("contrast" as const) : undefined,
            })),
          });
          savedForEnrich.push(
            ...batchResult.items.map((response, index) => ({
              userPhraseId: response.userPhrase.id,
              text: selectedContrast[index].text,
              differenceLabel: selectedContrast[index].differenceLabel,
            })),
          );
          reviewSessionExpressions.push(
            ...batchResult.items.map((response, index) => ({
              userPhraseId: response.userPhrase.id,
              text: selectedContrast[index].text,
            })),
          );
        }

        if (savedForEnrich.length > 0) {
          await enrichSimilarExpressionsBatchFromApi({
            items: savedForEnrich.map((item) => ({
              userPhraseId: item.userPhraseId,
              baseExpression: manualExpressionAssist.inputItem.text,
              differenceLabel: item.differenceLabel,
            })),
          });
        }
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
            <Card key={item.userPhraseId} className={`h-full overflow-hidden ${APPLE_SURFACE}`}>
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
                        {item.learningItemType === "sentence" ? zh.sentenceUnit : zh.expressionUnit}
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-snug">
                        {item.text}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {item.translation ??
                          (item.aiEnrichmentStatus === "pending"
                            ? zh.learningInfoPending
                            : item.aiEnrichmentStatus === "failed"
                              ? zh.learningInfoFailed
                              : zh.noTranslation)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                      <Badge variant="secondary">{reviewStatusLabel[item.reviewStatus]}</Badge>
                      {item.aiEnrichmentStatus === "pending" ? (
                        <Badge variant="outline">{zh.learningInfoPending}</Badge>
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
                  expandedCardIds[item.userPhraseId]
                    ? "max-h-[780px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <CardContent className="space-y-3.5 p-3 pt-2.5 pb-2">
                  {item.learningItemType === "sentence" ? (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.usageHint}</p>
                        <p className="line-clamp-2 text-sm text-foreground/90">{getUsageHint(item)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.sentenceSource}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {item.sourceSceneSlug ? item.sourceSceneSlug : zh.sentenceSourceFallback}
                        </p>
                        <p className="text-xs text-muted-foreground">{zh.sentenceUnitHint}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{zh.sentenceExpressions}</p>
                        <p className="text-[11px] text-muted-foreground">{zh.sentenceExpressionsHint}</p>
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
                                    className={`${APPLE_BUTTON_BASE} h-5 px-1.5 py-0 text-[11px]`}
                                    disabled={isSaved || isSaving}
                                    onClick={() => void saveExpressionFromSentence(item, expression)}
                                  >
                                    {isSaved
                                      ? zh.sentenceSavedExpression
                                      : isSaving
                                        ? `${zh.sentenceSaveExpression}...`
                                        : zh.sentenceSaveExpression}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{zh.sentenceNoExpressions}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {item.aiEnrichmentStatus === "pending" ? (
                        <div className="space-y-1 rounded-lg bg-[rgb(246,246,246)] p-2.5">
                          <p className="text-xs text-muted-foreground">{zh.learningInfoPending}</p>
                          <p className="text-sm font-medium text-foreground">{item.text}</p>
                          <p className="text-xs text-muted-foreground">{zh.learningInfoPendingHint}</p>
                          <p className="text-xs text-muted-foreground">
                            {zh.reviewStage}：{getReviewActionHint(item.reviewStatus)}
                          </p>
                          {pendingSimilarDiffLabel ? (
                            <p className="text-xs text-muted-foreground">
                              {zh.similarExpressions}：{pendingSimilarDiffLabel}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.translationLabel}</p>
                        <p className="line-clamp-2 text-sm text-foreground/90">
                          {item.translation ??
                            (item.aiEnrichmentStatus === "pending"
                              ? zh.learningInfoPending
                              : item.aiEnrichmentStatus === "failed"
                                ? zh.learningInfoFailed
                                : zh.noTranslation)}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.usageHint}</p>
                        <p className="line-clamp-2 text-sm text-foreground/90">{getUsageHint(item)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">{zh.sourceSentence}</p>
                          <TtsActionButton
                            active={
                              playingText ===
                              (item.exampleSentences[0]?.en ?? item.sourceSentenceText ?? "").trim()
                            }
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            iconClassName="size-3"
                            onClick={() =>
                              handlePronounceSentence(
                                item.exampleSentences[0]?.en ?? item.sourceSentenceText,
                              )
                            }
                            label={zh.speakSentence}
                          />
                        </div>
                        {item.exampleSentences.length > 0 ? (
                          renderExampleSentenceCards(item.exampleSentences, item.text, {
                            onSpeak: handlePronounceSentence,
                            isSpeakingText: (text) =>
                              Boolean(text) &&
                              (playingText === text.trim() || ttsPlaybackState.text === text.trim()),
                          })
                        ) : (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {item.sourceSentenceText
                              ? renderSentenceWithExpressionHighlight(item.sourceSentenceText, item.text)
                              : item.aiEnrichmentStatus === "pending"
                                ? zh.learningInfoPending
                                : zh.noSourceSentence}
                          </p>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.semanticFocusLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.semanticFocus ??
                            (item.aiEnrichmentStatus === "pending"
                              ? zh.semanticFocusPending
                              : zh.diffRelated)}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.typicalScenarioLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.typicalScenario ??
                            (item.aiEnrichmentStatus === "pending"
                              ? zh.typicalScenarioPending
                              : zh.diffRelated)}
                        </p>
                      </div>
                      <div className="space-y-1.5 rounded-lg bg-[rgb(246,246,246)] p-2.5">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between text-left"
                          onClick={() => toggleSimilarExpanded(item.userPhraseId)}
                          aria-expanded={isSimilarExpanded}
                        >
                          <p className="text-xs text-muted-foreground">{zh.similarExpressions}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {isSimilarExpanded ? zh.hideSimilar : zh.showSimilar}
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
                                {zh.viewAllSimilar}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">{zh.similarEmpty}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={`h-7 text-xs ${appleButtonClassName}`}
                                disabled={generatingSimilarForId === item.userPhraseId}
                                onClick={() => void openGenerateSimilarSheet(item)}
                              >
                                {generatingSimilarForId === item.userPhraseId
                                  ? `${zh.generatingSimilar}...`
                                  : zh.findMoreSimilar}
                              </Button>
                            </div>
                          )
                        ) : null}
                      </div>
                    </>
                  )}
                  {item.sourceType === "manual" ? (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{zh.manualRecorded}</p>
                      {item.sourceNote ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {zh.sourceNoteDisplay}：{item.sourceNote}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{zh.reviewStage}</p>
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
                        {expandedIds[item.userPhraseId] ? zh.collapseDetail : zh.expandDetail}
                      </Button>
                      {expandedIds[item.userPhraseId] ? (
                        <div className="space-y-1.5 pt-0.5">
                          <p className="text-xs text-muted-foreground">{zh.inThisSentence}</p>
                          <p className="text-sm text-foreground/90">
                            {item.translation ?? zh.noTranslation}
                          </p>
                          <p className="text-xs text-muted-foreground">{zh.commonUsage}</p>
                          <p className="text-sm text-muted-foreground">{item.usageNote}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 px-3 py-2.5">
                  {item.learningItemType === "sentence" ? (
                    <>
                      {/* TODO: Re-enable one-click extraction after stable server-side chunk detection is available. */}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={appleButtonClassName}
                        onClick={() => openExpressionComposerFromSentence()}
                      >
                        {zh.sentenceRecordExpression}
                      </Button>
                    </>
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
                          ? zh.mapUnavailable
                          : mapOpeningForId === item.userPhraseId
                            ? zh.mapPending
                            : zh.openMap}
                      </Button>
                      {item.sourceSceneSlug ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={appleButtonClassName}
                          onClick={() => router.push(`/scene/${item.sourceSceneSlug}`)}
                        >
                          {zh.sourceScene}
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
                            ? `${zh.retryEnrichment}...`
                            : zh.retryEnrichment}
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
            <SheetTitle>{zh.manualAddTitle}</SheetTitle>
            <SheetDescription>{zh.manualAddDesc}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{zh.itemTypeLabel}</p>
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
                      setManualExpressionAssist(null);
                      setManualSelectedMap({});
                    }}
                    placeholder={zh.expressionTextPlaceholder}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={manualAssistLoading || !manualText.trim()}
                  onClick={() => void loadManualExpressionAssist()}
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
                manualItemType === "sentence" ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                className={appleButtonClassName}
                disabled={savingManual}
                onClick={() => void handleSaveManualExpression("save")}
              >
                {savingManual
                  ? `${
                      manualItemType === "sentence"
                        ? zh.saveSentence
                        : manualExpressionAssist
                          ? zh.saveSelectedExpressions
                          : zh.saveToLibrary
                    }...`
                  : manualItemType === "sentence"
                    ? zh.saveSentence
                    : manualExpressionAssist
                      ? zh.saveSelectedExpressions
                      : zh.saveToLibrary}
              </Button>
              {manualItemType === "expression" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={savingManual}
                  onClick={() => void handleSaveManualExpression("save_and_review")}
                >
                  {savingManual ? `${zh.saveAndReview}...` : zh.saveAndReview}
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={similarSheetOpen}
        onOpenChange={(open) => {
          setSimilarSheetOpen(open);
          if (!open && !savingSelectedSimilar) {
            setGeneratedSimilarCandidates([]);
            setSelectedSimilarMap({});
            setSimilarSeedExpression(null);
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-0 bg-white">
          <SheetHeader>
            <SheetTitle>{zh.generatedSimilarTitle}</SheetTitle>
            <SheetDescription>{zh.generatedSimilarDesc}</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-2">
            {similarSeedExpression ? (
              <div className="rounded-lg bg-[rgb(246,246,246)] p-2.5">
                <p className="text-xs text-muted-foreground">{zh.centerExpression}</p>
                <p className="text-sm font-medium">{similarSeedExpression.text}</p>
              </div>
            ) : null}
            {generatingSimilarForId ? (
              <p className="text-sm text-muted-foreground">{zh.generatingSimilar}...</p>
            ) : null}
            {!generatingSimilarForId && generatedSimilarCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{zh.noGeneratedSimilar}</p>
            ) : null}
            {!generatingSimilarForId && generatedSimilarCandidates.length > 0 ? (
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
                {zh.close}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={appleButtonClassName}
                disabled={savingSelectedSimilar || generatingSimilarForId !== null}
                onClick={() => void saveSelectedSimilarCandidates()}
              >
                {savingSelectedSimilar ? `${zh.addSelectedSimilar}...` : zh.addSelectedSimilar}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={focusDetailOpen}
        onOpenChange={(open) => {
          setFocusDetailOpen(open);
          if (!open) {
            setFocusDetailActionsOpen(false);
            setFocusDetailTrail([]);
            setFocusDetailTab("info");
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="flex !h-[88dvh] !min-h-[88dvh] !max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-2xl border-0 bg-white md:!h-[88vh] md:!min-h-[88vh] md:!max-h-[88vh]"
        >
          <SheetHeader className="shrink-0 border-b border-[rgb(236,238,240)] px-4 pb-3 pt-4">
            <div className="space-y-3">
              <SheetTitle className="truncate">{zh.detailTitle}</SheetTitle>
              <div className="flex items-center justify-between gap-3">
                {focusDetailTrail.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${appleButtonClassName} h-8 min-w-0 gap-1 px-2 sm:px-3`}
                    onClick={() => reopenFocusTrailItem(focusDetailTrail.length - 2)}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="hidden sm:inline">{zh.detailBackToCurrent}</span>
                  </Button>
                ) : (
                  <div className="h-8 w-8 sm:w-20" aria-hidden="true" />
                )}
                <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
                  {focusDetail?.kind === "current" &&
                  focusDetail?.savedItem &&
                  focusExpression &&
                  normalizePhraseText(focusDetail.text) === normalizePhraseText(focusExpression.text) &&
                  focusAssistData === null ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={appleButtonClassName}
                      disabled={focusDetailLoading || focusAssistLoading}
                      onClick={() => {
                        if (!focusDetail.savedItem) return;
                        void loadFocusAssist(focusDetail.savedItem);
                      }}
                    >
                      {focusAssistLoading ? `${zh.detailFindRelations}...` : zh.detailFindRelations}
                    </Button>
                  ) : (
                    <div className="hidden h-9 min-w-[120px] sm:block" aria-hidden="true" />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${appleButtonClassName} ${
                      focusDetail &&
                      focusDetail.kind !== "current" &&
                      (focusRelationTab === "contrast" ? focusContrastItems.length : focusSimilarItems.length) > 1
                        ? ""
                        : "invisible pointer-events-none"
                    }`}
                    onClick={() => openFocusSiblingDetail(-1)}
                  >
                    {zh.detailPrev}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${appleButtonClassName} ${
                      focusDetail &&
                      focusDetail.kind !== "current" &&
                      (focusRelationTab === "contrast" ? focusContrastItems.length : focusSimilarItems.length) > 1
                        ? ""
                        : "invisible pointer-events-none"
                    }`}
                    onClick={() => openFocusSiblingDetail(1)}
                  >
                    {zh.detailNext}
                  </Button>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden px-4 pb-4 pt-4">
            {focusDetail ? (
              (() => {
                const isCurrentFocusMainDetail =
                  focusDetail.kind === "current" &&
                  focusExpression &&
                  normalizePhraseText(focusDetail.text) === normalizePhraseText(focusExpression.text);
                const activeAssistItem =
                  isCurrentFocusMainDetail
                    ? focusAssistData?.inputItem ?? focusDetail.assistItem
                    : focusDetail.assistItem;
                const generatedContrastRows =
                  isCurrentFocusMainDetail
                    ? focusAssistData?.contrastExpressions ?? []
                    : [];
                const persistedRelations = focusDetail.savedItem
                  ? savedRelationCache[focusDetail.savedItem.userPhraseId]?.rows ?? []
                  : [];
                const savedRelatedRows = (() => {
                  const items: SavedRelatedExpressionItem[] = [];
                  const seen = new Set<string>();

                  const pushItem = (row: UserPhraseItemResponse, relationType: "similar" | "contrast") => {
                    const normalized = normalizePhraseText(row.text);
                    if (!normalized || seen.has(normalized)) return;
                    seen.add(normalized);
                    items.push({ row, relationType });
                  };

                  for (const relation of persistedRelations) {
                    pushItem(relation.item, relation.relationType);
                  }

                  if (focusDetail.savedItem?.expressionClusterId) {
                    for (const row of clusterMembersByClusterId.get(focusDetail.savedItem.expressionClusterId) ?? []) {
                      if (row.userPhraseId === focusDetail.savedItem.userPhraseId) continue;
                      if (isContrastDerivedExpression(row.sourceNote)) continue;
                      pushItem(row, "similar");
                    }
                  }

                  return items;
                })();
                const similarDetailRows = savedRelatedRows.filter(
                  ({ relationType }) => relationType === "similar",
                );
                const contrastDetailRows = [
                  ...savedRelatedRows.filter(({ relationType }) => relationType === "contrast"),
                  ...generatedContrastRows
                    .map((candidate) => {
                      const saved =
                        phraseByNormalized.get(normalizePhraseText(candidate.text)) ?? null;
                      return saved
                        ? {
                            row: saved,
                            relationType: "contrast" as const,
                          }
                        : null;
                    })
                    .filter(
                      (
                        item,
                      ): item is { row: UserPhraseItemResponse; relationType: "contrast" } =>
                        Boolean(item),
                    ),
                ].filter(
                  ({ row }, index, array) =>
                    array.findIndex(
                      (candidate) =>
                        normalizePhraseText(candidate.row.text) === normalizePhraseText(row.text),
                    ) === index,
                );
                const isSavedRelatedLoading =
                  Boolean(focusDetail.savedItem?.userPhraseId) &&
                  savedRelationLoadingKey === focusDetail.savedItem?.userPhraseId;
                const detailSpeakText = focusDetail.text.trim();
                const isDetailSpeaking =
                  Boolean(detailSpeakText) &&
                  (playingText === detailSpeakText || ttsPlaybackState.text === detailSpeakText);

                return (
                  <FocusDetailContent
                    detail={focusDetail}
                    activeAssistItem={activeAssistItem}
                    focusDetailTab={focusDetailTab}
                    focusDetailLoading={focusDetailLoading}
                    isDetailSpeaking={isDetailSpeaking}
                    detailSpeakText={detailSpeakText}
                    similarRows={similarDetailRows.map(({ row }) => row)}
                    contrastRows={contrastDetailRows.map(({ row }) => row)}
                    isSavedRelatedLoading={isSavedRelatedLoading}
                    usageHint={
                      focusDetail.savedItem
                        ? getUsageHint(focusDetail.savedItem)
                        : activeAssistItem?.usageNote || zh.usageHintFallback
                    }
                    typicalScenario={
                      focusDetail.savedItem?.typicalScenario ??
                      activeAssistItem?.typicalScenario ??
                      zh.typicalScenarioPending
                    }
                    semanticFocus={
                      focusDetail.savedItem?.semanticFocus ??
                      activeAssistItem?.semanticFocus ??
                      zh.semanticFocusPending
                    }
                    reviewHint={
                      focusDetail.savedItem
                        ? getReviewActionHint(focusDetail.savedItem.reviewStatus)
                        : "可先加入表达库，再决定是否加入复习。"
                    }
                    exampleCards={
                      renderExampleSentenceCards(
                        focusDetail.savedItem?.exampleSentences ??
                          activeAssistItem?.examples ??
                          [],
                        focusDetail.text,
                        {
                          onSpeak: handlePronounceSentence,
                          isSpeakingText: (text) =>
                            Boolean(text) &&
                            (playingText === text.trim() || ttsPlaybackState.text === text.trim()),
                        },
                      ) ?? null
                    }
                    labels={{
                      speakSentence: zh.speakSentence,
                      candidateBadge: zh.detailCandidateBadge,
                      noTranslation: zh.noTranslation,
                      loading: zh.detailLoading,
                      tabInfo: zh.detailTabInfo,
                      tabSimilar: zh.detailTabSavedSimilar,
                      tabContrast: zh.detailTabContrast,
                      commonUsage: zh.commonUsage,
                      typicalScenario: zh.typicalScenarioLabel,
                      semanticFocus: zh.semanticFocusLabel,
                      reviewStage: zh.reviewStage,
                      usageHintFallback: zh.usageHintFallback,
                      typicalScenarioPending: zh.typicalScenarioPending,
                      semanticFocusPending: zh.semanticFocusPending,
                      reviewHintFallback: "可先加入表达库，再决定是否加入复习。",
                      sourceSentence: zh.sourceSentence,
                      noSourceSentence: zh.noSourceSentence,
                      similarHint: zh.detailSimilarHint,
                      emptySimilar: zh.focusEmptySimilar,
                      contrastHint: zh.detailContrastHint,
                      emptyContrast: zh.noContrastExpressions,
                    }}
                    onSpeak={handlePronounceSentence}
                    onTabChange={(nextTab) => {
                      setFocusDetailTab(nextTab);
                      if (nextTab === "similar" || nextTab === "contrast") {
                        setFocusRelationTab(nextTab);
                      }
                    }}
                    onOpenSimilarRow={(row) => {
                      setFocusRelationTab("similar");
                      void openFocusDetail({
                        text: row.text,
                        kind: "library-similar",
                        chainMode: "append",
                      });
                    }}
                    onOpenContrastRow={(row) => {
                      setFocusRelationTab("contrast");
                      void openFocusDetail({
                        text: row.text,
                        kind: "contrast",
                        chainMode: "append",
                      });
                    }}
                  />
                );
              })()
            ) : null}
          </div>

          <SheetFooter className="shrink-0 border-t border-[rgb(236,238,240)] px-4 pb-safe pt-3">
            <div className="flex items-center justify-between gap-2">
              <FocusDetailActions
                open={focusDetailActionsOpen}
                show={Boolean(focusDetail && showFocusDetailActions)}
                canSetCurrentClusterMain={canSetCurrentClusterMain}
                canMoveIntoCurrentCluster={canMoveIntoCurrentCluster}
                canSetStandaloneMain={canSetStandaloneMain}
                movingIntoCluster={movingIntoCluster}
                ensuringMoveTargetCluster={ensuringMoveTargetCluster}
                detachingClusterMember={detachingClusterMember}
                hasFocusDetailText={Boolean(focusDetail?.text)}
                appleButtonClassName={appleButtonClassName}
                labels={{
                  moreActions: zh.detailMoreActions,
                  openAsMain: zh.detailOpenAsMain,
                  moveIntoCluster: zh.moveIntoCluster,
                  detachClusterMember: zh.detachClusterMember,
                }}
                onToggleOpen={() => setFocusDetailActionsOpen((current) => !current)}
                onRequestSetCurrentClusterMain={() => {
                  setFocusDetailActionsOpen(false);
                  setDetailConfirmAction("set-cluster-main");
                }}
                onRequestMoveIntoCluster={() => {
                  void openMoveIntoCurrentCluster();
                }}
                onRequestSetStandaloneMain={() => {
                  if (!focusDetail?.savedItem?.expressionClusterId) return;
                  setFocusDetailActionsOpen(false);
                  setDetailConfirmAction("set-standalone-main");
                }}
              />

              {focusDetail?.savedItem ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  onClick={() => {
                    startReviewFromCard(focusDetail.savedItem as UserPhraseItemResponse);
                    setFocusDetailOpen(false);
                  }}
                >
                  {getPrimaryActionLabel(focusDetail.savedItem)}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={
                    !focusExpression ||
                    !focusDetail ||
                    savingFocusCandidateKey ===
                      `${focusDetail.kind === "contrast" ? "contrast" : "similar"}:${normalizePhraseText(focusDetail.text)}`
                  }
                  onClick={() => {
                    if (!focusExpression || !focusDetail) return;
                    void saveFocusCandidate(
                      focusExpression,
                      {
                        text: focusDetail.text,
                        differenceLabel: focusDetail.differenceLabel ?? "相关说法",
                      },
                      focusDetail.kind === "contrast" ? "contrast" : "similar",
                    );
                  }}
                >
                  {zh.addThisExpression}
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <MoveIntoClusterSheet
        open={moveIntoClusterOpen}
        focusExpression={focusExpression}
        groups={moveIntoClusterGroups}
        expandedGroups={expandedMoveIntoClusterGroups}
        selectedMap={selectedMoveIntoClusterMap}
        submitting={movingIntoCluster}
        appleButtonClassName={appleButtonClassName}
        labels={{
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
          selected: "已选",
          unselected: "未选",
          covered: "已覆盖",
        }}
        onOpenChange={(open) => {
          setMoveIntoClusterOpen(open);
          if (!open) {
            resetMoveIntoClusterSelection();
          }
        }}
        onToggleGroupExpand={toggleMoveIntoClusterGroupExpand}
        onToggleGroupSelect={toggleMoveIntoClusterGroupSelect}
        onToggleCandidate={toggleMoveIntoClusterCandidate}
        onSubmit={() => void handleMoveSelectedIntoCurrentCluster()}
      />

      <FocusDetailConfirm
        open={Boolean(detailConfirmAction && focusDetail?.savedItem)}
        title={
          detailConfirmAction === "set-cluster-main"
            ? zh.detailOpenAsMainConfirmTitle
            : zh.detachClusterMemberConfirmTitle
        }
        description={
          detailConfirmAction === "set-cluster-main"
            ? zh.detailOpenAsMainConfirmDesc
            : zh.detachClusterMemberConfirmDesc
        }
        text={focusDetail?.savedItem?.text ?? ""}
        translation={focusDetail?.savedItem?.translation ?? null}
        confirmLabel={zh.confirmContinue}
        cancelLabel={zh.confirmCancel}
        submitting={detachingClusterMember}
        appleButtonClassName={appleButtonClassName}
        onClose={() => setDetailConfirmAction(null)}
        onConfirm={() => {
          if (detailConfirmAction === "set-cluster-main") {
            void setFocusDetailAsClusterMain();
            return;
          }
          void detachFocusDetailFromCluster();
        }}
      />

      <Sheet open={mapOpen} onOpenChange={setMapOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-0 bg-white">
          <SheetHeader>
            <SheetTitle>{zh.mapTitle}</SheetTitle>
            <SheetDescription>{zh.mapDesc}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-2">
            {mapLoading ? <p className="text-sm text-muted-foreground">{zh.mapLoading}</p> : null}
            {!mapLoading && mapError ? <p className="text-sm text-destructive">{mapError}</p> : null}
            {!mapLoading && !mapError && mapData?.clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">{zh.mapEmpty}</p>
            ) : null}

            {!mapLoading && !mapError && mapData?.clusters.length ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {mapData.clusters.map((cluster) => (
                    <Button
                      key={cluster.id}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={`${appleButtonClassName} ${
                        activeClusterId === cluster.id
                          ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                          : ""
                      }`}
                      onClick={() => setActiveClusterId(cluster.id)}
                    >
                      {cluster.anchor}
                    </Button>
                  ))}
                </div>

                {activeCluster ? (
                  <div className="space-y-3 rounded-xl bg-[rgb(246,246,246)] p-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{zh.centerExpression}</p>
                      <p className="text-sm font-medium">{centerExpressionText || activeCluster.anchor}</p>
                      <p className="text-xs text-muted-foreground">
                        {zh.clusterMeaning}\uff1a{activeCluster.meaning}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">{zh.relatedExpressions}</p>
                    <div className="space-y-2">
                      {displayedClusterExpressions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{zh.clusterEmpty}</p>
                      ) : (
                        displayedClusterExpressions.map((text) => {
                          const normalized = normalizePhraseText(text);
                          const status = expressionStatusByNormalized.get(normalized);
                          const statusText = status ? reviewStatusLabel[status] : zh.statusUnknown;
                          const note = buildDifferenceNote(
                            centerExpressionText || activeCluster.anchor,
                            text,
                          );
                          return (
                            <div key={text} className="rounded-lg bg-[rgb(246,246,246)] p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">{text}</p>
                                <Badge variant={status ? "secondary" : "outline"}>{statusText}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {activeCluster.expressions.length > displayedClusterExpressions.length ? (
                      <p className="text-xs text-muted-foreground">
                        {zh.mapLimitedPrefix} {displayedClusterExpressions.length} {zh.mapLimitedSuffix}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <div className="grid grid-cols-3 gap-2 pb-safe">
              <Button type="button" variant="ghost" className={appleButtonClassName} onClick={() => setMapOpen(false)}>
                {zh.close}
              </Button>
              <Button type="button" variant="ghost" className={appleButtonClassName} onClick={handlePracticeCluster}>
                {zh.practiceCluster}
              </Button>
              <Button type="button" variant="ghost" className={appleButtonClassName} disabled={addingCluster} onClick={() => void handleAddClusterToReview()}>
                {addingCluster ? `${zh.addCluster}...` : zh.addCluster}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
