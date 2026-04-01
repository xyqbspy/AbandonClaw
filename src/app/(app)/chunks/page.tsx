"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { clearAllPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { getChunksExpressionMapCache, setChunksExpressionMapCache } from "@/lib/cache/chunks-runtime-cache";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import {
  playChunkAudio,
  regenerateChunkAudioBatch,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";
import { scheduleChunkAudioWarmup } from "@/lib/utils/resource-actions";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import { ExpressionCluster, ExpressionMapResponse } from "@/lib/types/expression-map";
import {
  enrichSimilarExpressionFromApi,
  ManualExpressionAssistResponse,
  PhraseReviewStatus,
  savePhrasesBatchFromApi,
  savePhraseFromApi,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { formatLoadingText, LoadingButton, LoadingState } from "@/components/shared/action-loading";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { Button } from "@/components/ui/button";
import { ExampleSentenceCards } from "@/features/chunks/components/example-sentence-cards";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoveIntoClusterSheet } from "@/features/chunks/components/move-into-cluster-sheet";
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
  APPLE_BANNER_DANGER,
  APPLE_BANNER_INFO,
  APPLE_BADGE_SUCCESS,
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_INPUT_PANEL,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_BUTTON_TEXT_SM,
  APPLE_SURFACE,
} from "@/lib/ui/apple-style";
import {
  buildSavedFocusDetailState,
  buildFocusDetailClosePayload,
  buildFocusDetailSheetState,
  buildGeneratedSimilarSheetState,
  buildManualSheetState,
  buildMoveIntoClusterOpenChangeState,
  buildMoveIntoClusterSheetState,
  buildClusterFilterChange,
  buildChunksSummary,
  resolveDeleteFocusDetailSuccessState,
  resolveClusterFilterExpressionLabel,
  resolveFocusExpressionId,
} from "./chunks-page-logic";
import { buildQuickAddRelatedPayload } from "./chunks-save-contract";
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

import { buildChunksFocusDetailLabels } from "./chunks-focus-detail-messages";
import {
  notifyChunksFocusDetailCandidateSaved,
  notifyChunksFocusDetailCopyTargetFailed,
  notifyChunksFocusDetailCopyTargetSuccess,
  notifyChunksFocusDetailMissingExpression,
  notifyChunksFocusDetailNoSourceSentence,
  notifyChunksFocusDetailQuickAddFailed,
  notifyChunksFocusDetailQuickAddSucceeded,
  notifyChunksFocusDetailQuickAddValidation,
  notifyChunksFocusDetailRegenerateAudioFailed,
  notifyChunksFocusDetailRegenerateAudioSuccess,
  notifyChunksFocusDetailRetryEnrichmentFailed,
  notifyChunksFocusDetailRetryEnrichmentSuccess,
} from "./chunks-focus-detail-notify";
import {
  buildChunksFocusDetailInteractionPresentation,
  buildChunksFocusDetailSheetPresentation,
} from "./chunks-focus-detail-presenters";
import { chunksPageMessages as zh } from "./chunks-page-messages";
import {
  notifyChunksActionMessage,
  notifyChunksActionSucceeded,
  notifyChunksExpressionComposerOpened,
  notifyChunksExpressionMapOpened,
  notifyChunksLoadFailed,
  notifyChunksMissingExpression,
  notifyChunksMissingSentence,
  notifyChunksReviewFamilyStarted,
  notifyChunksReviewStarted,
  notifyChunksSelectAtLeastOne,
  notifyChunksSentenceExpressionSaved,
  notifyChunksSentenceReviewPending,
  notifyChunksSpeechUnsupported,
} from "./chunks-page-notify";

const reviewStatusLabel: Record<PhraseReviewStatus, string> = {
  saved: zh.tabs.saved,
  reviewing: zh.tabs.reviewing,
  mastered: zh.tabs.mastered,
  archived: "\u5df2\u5f52\u6863",
};

const normalizePathname = (pathname?: string | null) => {
  if (typeof pathname !== "string") return "/";
  return pathname.replace(/\/+$/, "") || "/";
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
const appleButtonStrongClassName = `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_SM}`;
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
        <mark className={`inline-block px-[var(--mobile-adapt-space-sm)] py-[2px] font-bold ${APPLE_BADGE_SUCCESS}`}>
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
      <mark className={`inline-block px-[var(--mobile-adapt-space-sm)] py-[2px] font-bold ${APPLE_BADGE_SUCCESS}`}>
        {source.slice(start, end)}
      </mark>
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
  return (
    <ExampleSentenceCards
      examples={examples}
      expression={expression}
      renderSentenceWithExpressionHighlight={renderSentenceWithExpressionHighlight}
      speakLabel={zh.speakSentence}
      onSpeak={options?.onSpeak}
      isSpeakingText={options?.isSpeakingText}
      isLoadingText={options?.isLoadingText}
    />
  );
};

type FocusDetailState = {
  text: string;
  differenceLabel?: string | null;
  kind: "current" | "library-similar" | "suggested-similar" | "contrast";
  savedItem: UserPhraseItemResponse | null;
  assistItem: ManualExpressionAssistResponse["inputItem"] | null;
};

type FocusDetailConfirmAction =
  | "set-cluster-main"
  | "set-standalone-main"
  | "delete-expression";

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
  const [openingSourceSceneSlug, setOpeningSourceSceneSlug] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [expandedSimilarIds, setExpandedSimilarIds] = useState<Record<string, boolean>>({});
  // 手动添加与相似表达
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [manualItemType, setManualItemType] = useState<"expression" | "sentence">("expression");
  const [manualText, setManualText] = useState("");
  const [manualSentence, setManualSentence] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [savingManualMode, setSavingManualMode] = useState<"save" | "save_and_review" | null>(null);
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

  const { loading, phrases, setPhrases, total, loadPhrases } = useChunksListData({
    query,
    reviewFilter,
    contentFilter,
    expressionClusterFilterId,
    onLoadFailed: (message) => {
      notifyChunksLoadFailed(message);
    },
  });

  useEffect(() => {
    const handlePullRefresh = async (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
      if (normalizePathname(customEvent.detail?.pathname) !== "/chunks") return;
      customEvent.detail.handled = true;
      try {
        await clearAllPhraseListCache();
        await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
          preferCache: false,
        });
      } catch (error) {
        notifyChunksLoadFailed(error instanceof Error ? error.message : null);
      }
    };

    window.addEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    return () => {
      window.removeEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    };
  }, [contentFilter, expressionClusterFilterId, loadPhrases, query, reviewFilter]);

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
      notifyChunksLoadFailed(message);
    },
    onCandidateSaved: async ({ focusItem }) => {
      await loadPhrases(query, reviewFilter, contentFilter, expressionClusterFilterId, {
        preferCache: false,
      });
      invalidateSavedRelations([focusItem.userPhraseId]);
      notifyChunksFocusDetailCandidateSaved(zh.addSelectedSimilarSuccess);
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
      notifyChunksLoadFailed(message);
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
      notifyChunksLoadFailed(message);
    },
  });
  const {
    manualExpressionAssist,
    manualAssistLoading,
    manualSelectedMap,
    clearManualExpressionAssist,
    resetManualExpressionComposer,
    toggleManualSelected,
    loadManualExpressionAssist,
    saveManualExpression,
  } = useManualExpressionComposer({
    expressionRows,
    onError: (message) => {
      notifyChunksLoadFailed(message);
    },
    onPartialEnrichFailed: () => {
      notifyChunksLoadFailed(zh.autoEnrichFailedKeepSaved);
    },
  });
  const { savingManualSentence, saveManualSentence } = useManualSentenceComposer({
    onError: (message) => {
      notifyChunksLoadFailed(message);
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
      notifyChunksSentenceReviewPending();
      return;
    }
    if (item.reviewStatus === "mastered" && item.expressionClusterId) {
      const clusterRows = phrases.filter((row) => row.expressionClusterId === item.expressionClusterId);
      if (clusterRows.length > 0) {
        notifyChunksReviewFamilyStarted();
        startReviewSession({
          router,
          source: "expression-library-card",
          expressions: asReviewSessionExpressions(clusterRows),
        });
        return;
      }
    }
    notifyChunksReviewStarted();
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
    notifyChunksExpressionComposerOpened();
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
      notifyChunksSentenceExpressionSaved();
    } catch (error) {
      notifyChunksLoadFailed(error instanceof Error ? error.message : null);
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
  const canDeleteCurrentExpression = Boolean(focusDetail?.savedItem);
  const handleDeleteFocusDetailSuccess = useCallback((result: {
    deletedUserPhraseId: string;
    deletedClusterId: string | null;
    clusterDeleted: boolean;
    nextMainUserPhraseId: string | null;
    nextFocusUserPhraseId: string | null;
  }, refreshedRows: UserPhraseItemResponse[]) => {
    stopTtsPlayback();
    setPlayingText(null);

    const nextState = resolveDeleteFocusDetailSuccessState({
      result,
      refreshedRows,
      focusExpression,
    });

    if (nextState.action === "open" && nextState.nextExpression) {
      setFocusRelationTab("similar");
      void openFocusDetail({
        text: nextState.nextExpression.text,
        kind: "current",
        chainMode: "reset",
      });
      return;
    }

    setFocusDetailOpen(false);
    const closeState = buildFocusDetailClosePayload();
    setFocusDetailActionsOpen(closeState.actionsOpen);
    setFocusDetailTrail(closeState.trail);
    setFocusDetailTab(closeState.tab);
  }, [
    focusExpression,
    openFocusDetail,
    setFocusDetailOpen,
    setFocusDetailTab,
    setFocusDetailTrail,
  ]);
  const {
    detachingClusterMember,
    moveIntoClusterOpen,
    setMoveIntoClusterOpen,
    movingIntoCluster,
    ensuringMoveTargetCluster,
    deletingCurrentExpression,
    detachFocusDetailFromCluster,
    deleteFocusDetailExpression,
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
    onDeleteFocusDetailSuccess: (result, refreshedRows) => {
      handleDeleteFocusDetailSuccess(result, refreshedRows);
    },
    onSuccess: (message) => {
      notifyChunksActionSucceeded(message);
    },
    onError: (message) => {
      notifyChunksLoadFailed(message);
    },
    labels: {
      loadFailed: zh.loadFailed,
      detachClusterMemberSuccess: zh.detachClusterMemberSuccess,
      moveIntoClusterSelectOne: zh.moveIntoClusterSelectOne,
      moveIntoClusterSuccess: zh.moveIntoClusterSuccess,
      moveIntoClusterPartialFailed: zh.moveIntoClusterPartialFailed,
      deleteExpressionSuccess: "已删除当前表达",
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
      const cache = await getChunksExpressionMapCache(
        expression.userPhraseId,
        expression.expressionClusterId,
      );
      if (cache.found && cache.record && !cache.isExpired) {
        setMapData(cache.record.data.map);
        setActiveClusterId(cache.record.data.map.clusters[0]?.id ?? null);
        notifyChunksExpressionMapOpened();
        return;
      }

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
      void setChunksExpressionMapCache({
        sourceUserPhraseId: expression.userPhraseId,
        expressionClusterId: expression.expressionClusterId,
        map: response,
      }).catch(() => {
        // Ignore cache failures.
      });
      notifyChunksExpressionMapOpened();
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
      notifyChunksActionMessage(`${zh.filteredClusterPrefix} ${sourceExpressionText} ${zh.filteredClusterSuffix}`);
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
      notifyChunksSelectAtLeastOne();
    },
    onSuccess: () => {
      notifyChunksActionSucceeded(zh.addSelectedSimilarSuccess);
    },
    onError: (message) => {
      notifyChunksLoadFailed(message);
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
      notifyChunksFocusDetailRetryEnrichmentSuccess();
    } catch (error) {
      setPhrases((prev) =>
        prev.map((row) =>
          row.userPhraseId === item.userPhraseId ? { ...row, aiEnrichmentStatus: "failed" } : row,
        ),
      );
      notifyChunksFocusDetailRetryEnrichmentFailed(error instanceof Error ? error.message : null);
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
        notifyChunksSpeechUnsupported(error instanceof Error ? error.message : null);
      } finally {
        setPlayingText((prev) => (prev === text ? null : prev));
      }
    })();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const warmupItems = phrases.slice(0, 6);
      for (const item of warmupItems) {
        scheduleChunkAudioWarmup([
          item.text.trim(),
          item.exampleSentences[0]?.en?.trim() || item.sourceSentenceText?.trim() || "",
        ]);
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
        scheduleChunkAudioWarmup([(text ?? "").trim()], { limit: 1 });
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
  const focusDetailLabels = useMemo(() => buildChunksFocusDetailLabels(zh), []);

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

  const openSourceScene = (slug: string) => {
    if (!slug || openingSourceSceneSlug === slug) return;
    setOpeningSourceSceneSlug(slug);
    router.push(`/scene/${slug}`);
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
      notifyChunksActionSucceeded(zh.addClusterSuccess);
    } catch (error) {
      notifyChunksLoadFailed(error instanceof Error ? error.message : null);
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
      notifyChunksFocusDetailMissingExpression();
      return;
    }
    if (savingQuickAddRelated) return;
    if (quickAddRelatedValidationMessage) {
      notifyChunksFocusDetailQuickAddValidation(quickAddRelatedValidationMessage);
      return;
    }

    setSavingQuickAddRelated(true);
    try {
      const response = await savePhraseFromApi(
        buildQuickAddRelatedPayload({
          focusExpression,
          text,
          kind: quickAddRelatedType,
        }),
      );
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
      notifyChunksFocusDetailQuickAddSucceeded(
        quickAddRelatedType === "similar"
          ? zh.quickAddSuccessSimilar
          : zh.quickAddSuccessContrast,
      );
    } catch (error) {
      notifyChunksFocusDetailQuickAddFailed(error instanceof Error ? error.message : null);
    } finally {
      setSavingQuickAddRelated(false);
    }
  };

  const handleCopyQuickAddTarget = async () => {
    const text = focusExpression?.text?.trim() ?? "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      notifyChunksFocusDetailCopyTargetSuccess();
    } catch {
      notifyChunksFocusDetailCopyTargetFailed();
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
      notifyChunksFocusDetailNoSourceSentence();
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
      notifyChunksFocusDetailRegenerateAudioSuccess();
    } catch (error) {
      notifyChunksFocusDetailRegenerateAudioFailed(error instanceof Error ? error.message : null);
    } finally {
      setRegeneratingDetailAudio(false);
    }
  };

  const handleSaveManualExpression = async (mode: "save" | "save_and_review") => {
    const text = manualText.trim();
    const sentenceText = manualSentence.trim();
    if (manualItemType === "expression" && !text) {
      notifyChunksMissingExpression();
      return;
    }
    if (manualItemType === "sentence" && !sentenceText) {
      notifyChunksMissingSentence();
      return;
    }
    if (savingManual) return;

    setSavingManualMode(mode);
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
          notifyChunksSelectAtLeastOne();
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
        notifyChunksActionSucceeded(zh.saveReviewSuccess);
        startReviewSession({
          router,
          source: "expression-library-manual-add",
          expressions: reviewSessionExpressions,
        });
      } else {
        if (manualItemType === "sentence") {
          notifyChunksActionSucceeded(zh.saveSentenceSuccess);
        } else {
          notifyChunksActionSucceeded(
            manualExpressionAssist ? zh.addSelectedSimilarSuccess : zh.saveSuccess,
          );
        }
      }

      setAddSheetOpen(false);
      resetManualForm();
    } catch (error) {
      notifyChunksLoadFailed(error instanceof Error ? error.message : null);
    } finally {
      setSavingManual(false);
      setSavingManualMode(null);
    }
  };

  const manualSheetState = buildManualSheetState({
    manualItemType,
    manualExpressionAssist,
    savingManual,
    savingManualMode,
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
  const focusDetailSheetPresentation = buildChunksFocusDetailSheetPresentation({
    focusDetail,
    focusExpression,
    focusAssistData,
    savingFocusCandidateKeys,
    focusAssistLoading,
    savingQuickAddRelated,
    regeneratingDetailAudio,
    retryingEnrichmentIds,
    movingIntoCluster,
    ensuringMoveTargetCluster,
    detachingClusterMember,
    canSetCurrentClusterMain,
    canMoveIntoCurrentCluster,
    canSetStandaloneMain,
    primaryActionLabel: focusDetail?.savedItem
      ? getPrimaryActionLabel(focusDetail.savedItem)
      : undefined,
    appleButtonClassName,
    focusDetailSheetState,
    focusDetailViewModel,
  });
  const focusDetailInteractions = buildChunksFocusDetailInteractionPresentation({
    focusRelationTab,
    focusExpression,
    defaultDifferenceLabel: "相关说法",
  });

  const focusDetailSheetProps = {
    open: focusDetailOpen,
    detail: focusDetail,
    detailTab: focusDetailTab,
    detailLoading: focusDetailLoading,
    detailActionsOpen: focusDetailActionsOpen,
    detailConfirmAction,
    ...focusDetailSheetPresentation,
    canDeleteCurrentExpression,
    deletingCurrentExpression,
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
    onRequestDeleteCurrentExpression: () => {
      if (!focusDetail?.savedItem) return;
      setFocusDetailActionsOpen(false);
      setDetailConfirmAction("delete-expression");
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
      const nextState = focusDetailInteractions.buildTabChangeAction(nextTab);
      setFocusDetailTab(nextState.nextTab);
      setFocusRelationTab(nextState.nextRelationTab);
    },
    onOpenSimilarRow: (row: FocusDetailRelatedItem) => {
      const nextAction = focusDetailInteractions.buildOpenSimilarRowAction(row);
      setFocusRelationTab(nextAction.nextRelationTab);
      void openFocusDetail(nextAction.detailInput);
    },
    onOpenContrastRow: (row: FocusDetailRelatedItem) => {
      const nextAction = focusDetailInteractions.buildOpenContrastRowAction(row);
      setFocusRelationTab(nextAction.nextRelationTab);
      void openFocusDetail(nextAction.detailInput);
    },
    onSaveSimilarRow: (row: FocusDetailRelatedItem) => {
      const nextAction = focusDetailInteractions.buildSaveSimilarRowAction(row);
      if (!nextAction) return;
      void saveFocusCandidate(
        nextAction.focusExpression,
        nextAction.candidate,
        nextAction.relationKind,
      );
    },
    onSaveContrastRow: (row: FocusDetailRelatedItem) => {
      const nextAction = focusDetailInteractions.buildSaveContrastRowAction(row);
      if (!nextAction) return;
      void saveFocusCandidate(
        nextAction.focusExpression,
        nextAction.candidate,
        nextAction.relationKind,
      );
    },
    onCloseConfirm: () => setDetailConfirmAction(null),
    onConfirm: () => {
      if (detailConfirmAction === "set-cluster-main") {
        void setFocusDetailAsClusterMain();
        return;
      }
      if (detailConfirmAction === "delete-expression") {
        void deleteFocusDetailExpression();
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
    <div className="space-y-[var(--mobile-adapt-space-xl)] [@media(max-height:760px)]:space-y-[var(--mobile-adapt-space-md)]">
      <section className="rounded-[var(--app-radius-card)] border border-[var(--app-chunks-hero-border)] bg-[var(--app-chunks-hero-bg)] p-[var(--mobile-adapt-space-md)] shadow-[var(--app-chunks-hero-shadow)] [@media(max-height:760px)]:rounded-[var(--mobile-adapt-overlay-card-radius)] [@media(max-height:760px)]:p-[var(--mobile-adapt-space-sm)]">
        <div className="mb-[var(--mobile-adapt-space-md)] flex items-center gap-[var(--mobile-adapt-space-md)] [@media(max-height:760px)]:mb-[var(--mobile-adapt-space-sm)] [@media(max-height:760px)]:gap-[var(--mobile-adapt-space-sm)]">
          <div className="flex h-[clamp(36px,9vw,42px)] w-[clamp(36px,9vw,42px)] items-center justify-center rounded-[clamp(10px,2.8vw,14px)] bg-[linear-gradient(135deg,var(--app-chunks-hero-icon-start),var(--app-chunks-hero-icon-end))] text-[length:var(--mobile-adapt-font-body-sm)] font-bold text-white">
            AC
          </div>
          <div className="min-w-0">
            <p className="text-[length:var(--mobile-adapt-font-body)] font-semibold text-[var(--app-chunks-hero-title)]">{zh.heroTitle}</p>
            <p className="text-[length:var(--mobile-adapt-font-meta)] text-[var(--app-chunks-hero-subtitle)]">
              {zh.heroSubtitle} · {summary}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-[var(--mobile-adapt-space-md)] top-1/2 size-[clamp(14px,4vw,16px)] -translate-y-1/2 text-[var(--app-chunks-search-icon)]" />
          <Input
            className="h-[var(--mobile-adapt-button-height)] rounded-[var(--mobile-adapt-overlay-card-radius)] border-0 bg-[var(--app-chunks-search-bg)] pl-[calc(var(--mobile-adapt-space-xl)+var(--mobile-adapt-space-sm))] text-[length:var(--mobile-adapt-font-body-sm)] text-[var(--app-chunks-search-text)] shadow-none placeholder:text-[var(--app-chunks-search-placeholder)] focus-visible:ring-2 focus-visible:ring-[var(--app-chunks-search-ring)]"
            placeholder={`${zh.searchPlaceholder} · ${summary}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-[var(--mobile-adapt-space-md)] px-1 [@media(max-height:760px)]:gap-[var(--mobile-adapt-space-sm)]">
        <p className="text-[length:var(--mobile-adapt-font-body)] font-bold text-[var(--app-chunks-section-title)]">{zh.coreSection}</p>
        <div className="flex items-center gap-[var(--mobile-adapt-space-sm)]">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-[var(--mobile-adapt-overlay-card-radius)] bg-[var(--app-chunks-entry-accent-bg)] px-[var(--mobile-adapt-space-lg)] py-[var(--mobile-adapt-space-sm)] text-[length:var(--mobile-adapt-font-body-sm)] font-semibold text-[var(--app-chunks-entry-accent-text)] hover:bg-[var(--app-chunks-entry-accent-hover)]"
            onClick={() => setAddSheetOpen(true)}
          >
            {zh.addLearningContent}
          </Button>
        </div>
      </div>

      <div className="space-y-3 [@media(max-height:760px)]:space-y-1.5">
        <SegmentedControl
          ariaLabel="视图模式"
          value={expressionViewMode}
          onChange={(nextMode) => {
            if (nextMode === "focus") {
              setContentFilter("expression");
              setReviewFilter("all");
            }
            setExpressionViewMode(nextMode);
          }}
          options={[
            { value: "focus", label: zh.viewModeFocus },
            { value: "list", label: zh.viewModeList },
          ]}
        />

        {expressionViewMode === "list" ? (
          <SegmentedControl
            ariaLabel="列表内容类型"
            value={contentFilter}
            onChange={(nextFilter) => {
              setContentFilter(nextFilter);
              setReviewFilter("all");
            }}
            options={[
              { value: "expression", label: zh.contentTabExpression },
              { value: "sentence", label: zh.contentTabSentence },
            ]}
          />
        ) : null}
      </div>

      {!(contentFilter === "expression" && expressionViewMode === "focus") ? (
        <div className={`flex flex-wrap gap-[var(--mobile-adapt-space-sm)] p-[var(--mobile-adapt-space-sm)] ${APPLE_PANEL}`}>
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
                  ? appleButtonStrongClassName
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
        <div className={`flex flex-wrap items-center gap-[var(--mobile-adapt-space-sm)] px-[var(--mobile-adapt-space-md)] py-[var(--mobile-adapt-space-sm)] ${APPLE_PANEL}`}>
          <p className={APPLE_META_TEXT}>{zh.viewingClusterFilter}</p>
          {clusterFilterExpressionLabel ? (
            <p className="text-[length:var(--mobile-adapt-font-meta)] text-foreground/90">
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
          <LoadingState text={zh.listLoading} className="py-[var(--mobile-adapt-space-sm)]" />
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
        <section className="space-y-5">
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
            openingSourceSceneSlug={openingSourceSceneSlug}
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
            openSourceScene={openSourceScene}
          retryAiEnrichment={retryAiEnrichment}
          applyClusterFilter={applyClusterFilter}
          openGenerateSimilarSheet={openGenerateSimilarSheet}
        />
        </section>
      )}

      <Sheet
        open={addSheetOpen}
        onOpenChange={(open) => {
          setAddSheetOpen(open);
          if (!open && !savingManual) resetManualForm();
        }}
      >
        <SheetContent
          side="bottom"
          className={`max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${APPLE_PANEL}`}
        >
          <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
            <SheetTitle>{manualSheetState.title}</SheetTitle>
            <SheetDescription>{manualSheetState.description}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-1">
              <p className={APPLE_META_TEXT}>{manualSheetState.itemTypeLabel}</p>
              <SegmentedControl
                ariaLabel={manualSheetState.itemTypeLabel}
                value={manualItemType}
                onChange={(value) =>
                  setManualItemType(value === "sentence" ? "sentence" : "expression")
                }
                options={[
                  { value: "expression", label: zh.itemTypeExpression },
                  { value: "sentence", label: zh.itemTypeSentence },
                ]}
              />
            </div>

            {manualItemType === "expression" ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <p className={APPLE_META_TEXT}>{zh.expressionTextLabel}</p>
                  <Input
                    className={APPLE_INPUT_PANEL}
                    value={manualText}
                    onChange={(event) => {
                      setManualText(event.target.value);
                      clearManualExpressionAssist();
                    }}
                    placeholder={zh.expressionTextPlaceholder}
                  />
                </div>
                <LoadingButton
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={!manualText.trim()}
                  loading={manualAssistLoading}
                  loadingText={formatLoadingText(zh.generatingSuggestions)}
                  onClick={() => void loadManualExpressionAssist(manualText)}
                >
                  {zh.findMoreRelated}
                </LoadingButton>
                {manualExpressionAssist ? (
                  <div className={`space-y-3 p-3 ${APPLE_PANEL}`}>
                    <div className={`space-y-1 p-3 ${APPLE_LIST_ITEM}`}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={Boolean(manualSelectedMap[normalizePhraseText(manualExpressionAssist.inputItem.text)])}
                          onChange={() => toggleManualSelected(manualExpressionAssist.inputItem.text)}
                        />
                        <div className="space-y-1">
                          <p className={APPLE_META_TEXT}>{zh.currentInputCard}</p>
                          <p className="text-sm font-medium">{manualExpressionAssist.inputItem.text}</p>
                          {manualExpressionAssist.inputItem.translation ? (
                            <p className={APPLE_META_TEXT}>
                              {manualExpressionAssist.inputItem.translation}
                            </p>
                          ) : null}
                          {manualExpressionAssist.inputItem.usageNote ? (
                            <p className={APPLE_META_TEXT}>
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
                      <p className={APPLE_META_TEXT}>{zh.similarExpressionsAuto}</p>
                      {manualExpressionAssist.similarExpressions.length > 0 ? (
                        manualExpressionAssist.similarExpressions.map((candidate) => (
                          <label
                            key={`similar-${candidate.text}`}
                            className={`flex cursor-pointer items-start gap-2 p-3 ${APPLE_LIST_ITEM}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(manualSelectedMap[normalizePhraseText(candidate.text)])}
                              onChange={() => toggleManualSelected(candidate.text)}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{candidate.text}</p>
                              <p className={APPLE_META_TEXT}>
                                {normalizeSimilarLabel(candidate.differenceLabel)}
                              </p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className={APPLE_META_TEXT}>{zh.similarEmpty}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className={APPLE_META_TEXT}>{zh.contrastExpressionsAuto}</p>
                      {manualExpressionAssist.contrastExpressions.length > 0 ? (
                        manualExpressionAssist.contrastExpressions.map((candidate) => (
                          <label
                            key={`contrast-${candidate.text}`}
                            className={`flex cursor-pointer items-start gap-2 p-3 ${APPLE_LIST_ITEM}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={Boolean(manualSelectedMap[normalizePhraseText(candidate.text)])}
                              onChange={() => toggleManualSelected(candidate.text)}
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{candidate.text}</p>
                              <p className={APPLE_META_TEXT}>{candidate.differenceLabel}</p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className={APPLE_META_TEXT}>{zh.noContrastExpressions}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <p className={APPLE_META_TEXT}>{zh.sentenceMainLabel}</p>
                  <Textarea
                    className={APPLE_INPUT_PANEL}
                    value={manualSentence}
                    onChange={(event) => setManualSentence(event.target.value)}
                    rows={4}
                    placeholder={zh.sentenceMainPlaceholder}
                  />
                  <p className={APPLE_META_TEXT}>{zh.sentenceAutoHint}</p>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div
              className={`grid gap-2 pb-safe ${
                manualSheetState.footerGridClassName
              }`}
            >
                <LoadingButton
                  type="button"
                  variant="ghost"
                  className={appleButtonStrongClassName}
                  disabled={manualSheetState.isSaving}
                  loading={manualSheetState.isPrimarySaving}
                  loadingText={formatLoadingText(manualSheetState.primaryActionLabel)}
                  onClick={() => void handleSaveManualExpression("save")}
                >
                {manualSheetState.primaryActionLabel}
              </LoadingButton>
              {manualSheetState.showSecondaryAction ? (
                <LoadingButton
                  type="button"
                  variant="ghost"
                  className={appleButtonClassName}
                  disabled={manualSheetState.isSaving}
                  loading={manualSheetState.isSecondarySaving}
                  loadingText={formatLoadingText(manualSheetState.secondaryActionLabel)}
                  onClick={() => void handleSaveManualExpression("save_and_review")}
                >
                  {manualSheetState.secondaryActionLabel}
                </LoadingButton>
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
          className={`z-[81] max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${APPLE_PANEL}`}
        >
          <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
            <SheetTitle>{zh.quickAddRelatedTitle}</SheetTitle>
            <SheetDescription>{zh.quickAddRelatedDesc}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
            <button
              type="button"
              className={`w-full p-3 text-left transition ${APPLE_LIST_ITEM}`}
              onClick={() => void handleCopyQuickAddTarget()}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className={APPLE_META_TEXT}>{zh.quickAddTargetLabel}</p>
                  <p className={APPLE_META_TEXT}>{zh.quickAddCopyTarget}</p>
                </div>
                <p className="text-sm font-medium">{focusExpression?.text ?? ""}</p>
              </div>
            </button>

            <div className="space-y-1">
              <p className={APPLE_META_TEXT}>{zh.quickAddTextLabel}</p>
              <Input
                className={APPLE_INPUT_PANEL}
                ref={quickAddRelatedInputRef}
                value={quickAddRelatedText}
                onChange={(event) => setQuickAddRelatedText(event.target.value)}
                placeholder={zh.quickAddTextPlaceholder}
              />
              {quickAddRelatedValidationMessage ? (
                <p className={APPLE_BANNER_DANGER}>{quickAddRelatedValidationMessage}</p>
              ) : quickAddRelatedLibraryHint ? (
                <p className={APPLE_BANNER_INFO}>{quickAddRelatedLibraryHint}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <p className={APPLE_META_TEXT}>{zh.quickAddRelationTypeLabel}</p>
              <SegmentedControl
                ariaLabel={zh.quickAddRelationTypeLabel}
                value={quickAddRelatedType}
                onChange={(value) =>
                  setQuickAddRelatedType(value === "contrast" ? "contrast" : "similar")
                }
                options={[
                  { value: "similar", label: zh.quickAddSimilar },
                  { value: "contrast", label: zh.quickAddContrast },
                ]}
              />
            </div>
          </div>

          <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="grid gap-2 pb-safe">
              <LoadingButton
                type="button"
                variant="ghost"
                className={appleButtonStrongClassName}
                disabled={
                  !quickAddRelatedText.trim() ||
                  Boolean(quickAddRelatedValidationMessage)
                }
                loading={savingQuickAddRelated}
                loadingText={formatLoadingText(zh.quickAddSubmit)}
                onClick={() => void handleSaveQuickAddRelated()}
              >
                {zh.quickAddSubmit}
              </LoadingButton>
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
        <SheetContent
          side="bottom"
          className={`max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--app-chunks-sheet-card-border)] bg-[var(--app-chunks-sheet-bg)] ${APPLE_PANEL}`}
        >
          <SheetHeader className="space-y-1 px-4 pb-3 pt-4">
            <SheetTitle>{generatedSimilarSheetState.title}</SheetTitle>
            <SheetDescription>{generatedSimilarSheetState.description}</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-4">
            {generatedSimilarSheetState.showSeedExpression ? (
              <div className={`p-2.5 ${APPLE_PANEL}`}>
                <p className={APPLE_META_TEXT}>{generatedSimilarSheetState.centerExpressionLabel}</p>
                <p className="text-sm font-medium">{similarSeedExpression?.text ?? ""}</p>
              </div>
            ) : null}
            {generatedSimilarSheetState.showGenerating ? (
              <p className={`text-sm ${APPLE_META_TEXT}`}>{generatedSimilarSheetState.generatingLabel}</p>
            ) : null}
            {generatedSimilarSheetState.showEmpty ? (
              <p className={`text-sm ${APPLE_META_TEXT}`}>{generatedSimilarSheetState.emptyLabel}</p>
            ) : null}
            {generatedSimilarSheetState.showCandidates ? (
              <div className="space-y-2">
                {generatedSimilarCandidates.map((candidate) => {
                  const normalized = normalizePhraseText(candidate.text);
                  const checked = Boolean(selectedSimilarMap[normalized]);
                  return (
                    <label key={normalized} className={`flex cursor-pointer items-start gap-2 p-2.5 ${APPLE_LIST_ITEM}`}>
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => toggleCandidateSelected(candidate.text)}
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{candidate.text}</p>
                        <p className={APPLE_META_TEXT}>
                          {normalizeSimilarLabel(candidate.differenceLabel)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>

          <SheetFooter className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="grid grid-cols-2 gap-2 pb-safe">
              <Button type="button" variant="ghost" className={appleButtonClassName} onClick={() => setSimilarSheetOpen(false)}>
                {generatedSimilarSheetState.closeLabel}
              </Button>
              <LoadingButton
                type="button"
                variant="ghost"
                className={appleButtonStrongClassName}
                disabled={generatingSimilarForId !== null}
                loading={savingSelectedSimilar}
                loadingText={formatLoadingText(generatedSimilarSheetState.submitLabel)}
                onClick={() => void saveSelectedSimilarCandidates()}
              >
                {generatedSimilarSheetState.submitLabel}
              </LoadingButton>
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

