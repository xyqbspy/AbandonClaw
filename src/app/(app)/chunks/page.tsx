"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import { ExpressionFamily, ExpressionMapResponse } from "@/lib/types/expression-map";
import {
  getMyPhrasesFromApi,
  PhraseReviewStatus,
  savePhraseFromApi,
  UserPhraseItemResponse,
} from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const zh = {
  loadFailed: "\u52a0\u8f7d\u8868\u8fbe\u5931\u8d25\u3002",
  loading: "\u52a0\u8f7d\u4e2d...",
  total: "\u5171",
  items: "\u6761",
  eyebrow: "Expression",
  title: "Expression Library",
  desc: "\u5728\u8fd9\u91cc\u7ba1\u7406\u4f60\u7684\u5df2\u4fdd\u5b58\u8868\u8fbe\uff0c\u5e76\u4ece\u8868\u8fbe\u7ec4\u76f4\u63a5\u8fdb\u5165\u590d\u4e60\u3002",
  searchPlaceholder: "\u641c\u7d22\u5df2\u4fdd\u5b58\u8868\u8fbe",
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
  openMap: "\u76f8\u5173\u8868\u8fbe",
  mapPending: "\u76f8\u5173\u8868\u8fbe\u751f\u6210\u4e2d",
  mapUnavailable: "\u6682\u65e0\u76f8\u5173\u8868\u8fbe",
  sourceScene: "\u6765\u6e90\u573a\u666f",
  expandDetail: "\u67e5\u770b\u89e3\u6790",
  collapseDetail: "\u6536\u8d77",
  inThisSentence: "\u5728\u8fd9\u53e5\u91cc",
  commonUsage: "\u5e38\u89c1\u7528\u6cd5",
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
  familyMeaning: "\u7ec4\u542b\u4e49",
  practiceFamily: "\u7ec3\u8fd9\u4e00\u7ec4",
  addFamily: "\u52a0\u5165\u590d\u4e60",
  addFamilySuccess: "\u8be5\u7ec4\u8868\u8fbe\u5df2\u52a0\u5165\u590d\u4e60\u6c60\u3002",
  familyEmpty: "\u8be5\u7ec4\u6682\u65e0\u8868\u8fbe\u3002",
  statusUnknown: "\u672a\u52a0\u5165\u590d\u4e60",
  diffSame: "\u4e2d\u5fc3\u8868\u8fbe",
  diffRelated: "\u76f8\u5173\u8868\u8fbe",
  diffColloquial: "\u66f4\u53e3\u8bed",
  diffSpecific: "\u66f4\u5177\u4f53",
  diffRecoverRoutine: "\u66f4\u504f\u6062\u590d\u89c4\u5f8b",
  diffRestart: "\u66f4\u504f\u91cd\u65b0\u5f00\u59cb",
  mapLimitedPrefix: "\u4ec5\u5c55\u793a\u6700\u76f8\u5173\u7684",
  mapLimitedSuffix: "\u6761",
  close: "\u5173\u95ed",
};

const reviewStatusLabel: Record<PhraseReviewStatus, string> = {
  saved: zh.tabs.saved,
  reviewing: zh.tabs.reviewing,
  mastered: zh.tabs.mastered,
  archived: "\u5df2\u5f52\u6863",
};

const asReviewSessionExpressions = (rows: UserPhraseItemResponse[]) =>
  rows.map((row) => ({
    userPhraseId: row.userPhraseId,
    text: row.text,
    expressionFamilyId: row.expressionFamilyId,
  }));

const filterRowsByFamilyExpressions = (
  rows: UserPhraseItemResponse[],
  family: ExpressionFamily,
  selected: UserPhraseItemResponse | null,
) => {
  const familyTextSet = new Set(family.expressions.map((text) => normalizePhraseText(text)));
  const selectedFamilyId = selected?.expressionFamilyId ?? null;
  return rows.filter((row) => {
    if (selectedFamilyId && row.expressionFamilyId && row.expressionFamilyId === selectedFamilyId) {
      return true;
    }
    return familyTextSet.has(normalizePhraseText(row.text));
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

const buildDifferenceNote = (centerExpression: string, targetExpression: string) => {
  const center = normalizePhraseText(centerExpression);
  const target = normalizePhraseText(targetExpression);
  if (!center || !target) return zh.diffRelated;
  if (center === target) return zh.diffSame;

  const centerTokens = tokenize(centerExpression);
  const targetTokens = tokenize(targetExpression);
  if (hasAnyToken(targetTokens, ["back", "routine", "rhythm", "normal", "track"])) {
    return zh.diffRecoverRoutine;
  }
  if (hasAnyToken(targetTokens, ["restart", "reset", "again", "fresh", "begin", "start", "over"])) {
    return zh.diffRestart;
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

export default function ChunksPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<PhraseReviewStatus | "all">("all");
  const [listDataSource, setListDataSource] = useState<"none" | "cache" | "network">("none");

  const [mapOpen, setMapOpen] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<ExpressionMapResponse | null>(null);
  const [mapSourceExpression, setMapSourceExpression] = useState<UserPhraseItemResponse | null>(
    null,
  );
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [addingFamily, setAddingFamily] = useState(false);
  const [mapOpeningForId, setMapOpeningForId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const activeLoadTokenRef = useRef(0);

  const loadPhrases = async (
    nextQuery: string,
    nextFilter: PhraseReviewStatus | "all",
    options?: { preferCache?: boolean },
  ) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const preferCache = options?.preferCache ?? false;
    if (!preferCache) setListDataSource("none");
    setLoading(true);

    let networkApplied = false;
    let hasCacheFallback = false;
    const canApply = () => activeLoadTokenRef.current === token;

    const requestParams = {
      query: nextQuery.trim(),
      limit: 100,
      page: 1,
      status: "saved" as const,
      reviewStatus: nextFilter,
    };

    if (preferCache) {
      try {
        const cache = await getPhraseListCache({
          query: requestParams.query,
          status: requestParams.status,
          reviewStatus: requestParams.reviewStatus,
          page: requestParams.page,
          limit: requestParams.limit,
        });
        if (canApply() && cache.found && cache.record) {
          hasCacheFallback = true;
          setPhrases(cache.record.data.rows);
          setTotal(cache.record.data.total);
          setListDataSource("cache");
          setLoading(false);
          if (!cache.isExpired) {
            networkApplied = true;
          }
        }
      } catch {
        // Ignore cache failure.
      }
    }

    if (networkApplied) return;
    try {
      const result = await getMyPhrasesFromApi(requestParams);
      if (!canApply()) return;
      networkApplied = true;
      setPhrases(result.rows);
      setTotal(result.total);
      setListDataSource("network");
      setLoading(false);
      void setPhraseListCache(
        {
          query: requestParams.query,
          status: requestParams.status,
          reviewStatus: requestParams.reviewStatus,
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
      void loadPhrases(query, reviewFilter, { preferCache: true });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, reviewFilter]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[expression-library][cache-debug]", {
      source: listDataSource,
      count: phrases.length,
      filter: reviewFilter,
    });
  }, [listDataSource, phrases.length, reviewFilter]);

  const summary = useMemo(() => {
    if (loading) return zh.loading;
    return `${zh.total} ${total} ${zh.items}`;
  }, [loading, total]);

  const activeFamily = useMemo(() => {
    if (!mapData || !activeFamilyId) return null;
    return mapData.families.find((family) => family.id === activeFamilyId) ?? null;
  }, [activeFamilyId, mapData]);

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

  const centerExpressionText = useMemo(() => {
    if (!activeFamily) return mapSourceExpression?.text ?? "";
    const sourceSceneId = mapData?.sourceSceneId ?? null;
    const candidates = Array.from(
      new Set(activeFamily.expressions.map((text) => text.trim()).filter(Boolean)),
    );
    if (candidates.length === 0) return mapSourceExpression?.text ?? activeFamily.anchor;

    const scored = candidates.map((text) => {
      const normalized = normalizePhraseText(text);
      const userRow = phraseByNormalized.get(normalized) ?? null;
      const nodes = activeFamily.nodes.filter(
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
    return scored[0]?.text ?? mapSourceExpression?.text ?? activeFamily.anchor;
  }, [activeFamily, mapData?.sourceSceneId, mapSourceExpression, phraseByNormalized]);

  const displayedFamilyExpressions = useMemo(() => {
    if (!activeFamily) return [] as string[];
    const center = centerExpressionText || activeFamily.anchor;
    const uniqueExpressions = Array.from(
      new Set(activeFamily.expressions.map((text) => text.trim()).filter(Boolean)),
    );
    const sourceSceneId = mapData?.sourceSceneId ?? null;

    const scored = uniqueExpressions.map((text) => {
      const normalized = normalizePhraseText(text);
      const row = phraseByNormalized.get(normalized) ?? null;
      const nodes = activeFamily.nodes.filter(
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
  }, [activeFamily, centerExpressionText, mapData?.sourceSceneId, phraseByNormalized]);

  const getPrimaryActionLabel = (item: UserPhraseItemResponse) => {
    if (item.reviewStatus === "reviewing") return zh.continueReview;
    if (item.reviewStatus === "mastered") {
      return item.expressionFamilyId ? zh.reviewFamily : zh.revisitOne;
    }
    return zh.startReview;
  };

  const startReviewFromCard = (item: UserPhraseItemResponse) => {
    if (item.reviewStatus === "mastered" && item.expressionFamilyId) {
      const familyRows = phrases.filter((row) => row.expressionFamilyId === item.expressionFamilyId);
      if (familyRows.length > 0) {
        toast.success(zh.reviewFamilyFeedback);
        startReviewSession({
          router,
          source: "expression-library-card",
          expressions: asReviewSessionExpressions(familyRows),
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

  const openExpressionMap = async (expression: UserPhraseItemResponse) => {
    setMapOpeningForId(expression.userPhraseId);
    setMapOpen(true);
    setMapLoading(true);
    setMapError(null);
    setMapData(null);
    setMapSourceExpression(expression);
    setActiveFamilyId(null);
    try {
      const grouped = expression.expressionFamilyId
        ? phrases.filter((row) => row.expressionFamilyId === expression.expressionFamilyId)
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
      setActiveFamilyId(response.families[0]?.id ?? null);
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

  const getUsageHint = (item: UserPhraseItemResponse) => {
    const raw = (item.usageNote ?? "").trim();
    if (raw.length === 0) return zh.usageHintFallback;
    if (raw.length <= 70) return raw;
    return `${raw.slice(0, 70)}...`;
  };

  const getReviewStageHint = (status: PhraseReviewStatus) => {
    if (status === "reviewing") return zh.reviewStageReviewingHint;
    if (status === "mastered") return zh.reviewStageMasteredHint;
    return zh.reviewStageSavedHint;
  };

  const getReviewActionHint = (status: PhraseReviewStatus) => {
    if (status === "reviewing") return zh.reviewActionReviewingHint;
    if (status === "mastered") return zh.reviewActionMasteredHint;
    return zh.reviewActionSavedHint;
  };

  const handlePracticeFamily = () => {
    if (!activeFamily) return;
    const selectedRows = filterRowsByFamilyExpressions(phrases, activeFamily, mapSourceExpression);
    if (selectedRows.length > 0) {
      startReviewSession({
        router,
        source: "expression-map-family",
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

  const handleAddFamilyToReview = async () => {
    if (!activeFamily || !mapSourceExpression || addingFamily) return;
    setAddingFamily(true);
    try {
      const familyId = mapSourceExpression.expressionFamilyId ?? activeFamily.id;
      const existingNormalized = new Set(phrases.map((row) => normalizePhraseText(row.text)));
      const tasks = Array.from(
        new Set(activeFamily.expressions.map((text) => text.trim()).filter(Boolean)),
      )
        .slice(0, 20)
        .filter((text) => !existingNormalized.has(normalizePhraseText(text)))
        .map((text) =>
          savePhraseFromApi({
            text,
            sourceSceneSlug: mapSourceExpression.sourceSceneSlug ?? undefined,
            sourceSentenceText: mapSourceExpression.sourceSentenceText ?? undefined,
            sourceChunkText: text,
            expressionFamilyId: familyId,
          }),
        );

      if (tasks.length > 0) {
        await Promise.all(tasks);
        await loadPhrases(query, reviewFilter, { preferCache: false });
      }
      toast.success(zh.addFamilySuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setAddingFamily(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={zh.eyebrow} title={zh.title} description={zh.desc} />

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
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>

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
            variant={reviewFilter === tab.key ? "default" : "outline"}
            onClick={() => setReviewFilter(tab.key as PhraseReviewStatus | "all")}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{zh.listLoading}</p>
      ) : phrases.length === 0 ? (
        <EmptyState title={zh.emptyTitle} description={zh.emptyDesc} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {phrases.map((item) => (
            <Card key={item.userPhraseId} className="h-full">
              <CardHeader className="space-y-2">
                <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{zh.expressionUnit}</p>
                  <p className="mt-1 text-lg font-semibold leading-snug">{item.text}</p>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.translation ?? zh.noTranslation}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.usageHint}</p>
                  <p className="line-clamp-2 text-sm text-foreground/90">{getUsageHint(item)}</p>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground/80">{zh.sourceSentence}</p>
                  <p className="line-clamp-2">
                    {item.sourceSentenceText
                      ? renderSentenceWithExpressionHighlight(item.sourceSentenceText, item.text)
                      : zh.noSourceSentence}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{reviewStatusLabel[item.reviewStatus]}</Badge>
                    <p className="text-xs text-muted-foreground">{zh.reviewStage}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getReviewStageHint(item.reviewStatus)}
                  </p>
                  <p className="mt-1 text-xs text-foreground/80">{getReviewActionHint(item.reviewStatus)}</p>
                </div>
                {item.usageNote && item.usageNote.trim().length > 70 ? (
                  <div className="space-y-1">
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
                      <div className="space-y-2 rounded-lg border border-border/60 p-2.5">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{zh.inThisSentence}</p>
                          <p className="text-sm text-foreground/90">
                            {item.translation ?? zh.noTranslation}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{zh.commonUsage}</p>
                          <p className="text-sm text-muted-foreground">{item.usageNote}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => startReviewFromCard(item)}
                >
                  {getPrimaryActionLabel(item)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!item.expressionFamilyId}
                  onClick={() => void openExpressionMap(item)}
                >
                  {!item.expressionFamilyId
                    ? zh.mapUnavailable
                    : mapOpeningForId === item.userPhraseId
                      ? zh.mapPending
                      : zh.openMap}
                </Button>
                {item.sourceSceneSlug ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/scene/${item.sourceSceneSlug}`)}
                  >
                    {zh.sourceScene}
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={mapOpen} onOpenChange={setMapOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{zh.mapTitle}</SheetTitle>
            <SheetDescription>{zh.mapDesc}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-2">
            {mapLoading ? <p className="text-sm text-muted-foreground">{zh.mapLoading}</p> : null}
            {!mapLoading && mapError ? <p className="text-sm text-destructive">{mapError}</p> : null}
            {!mapLoading && !mapError && mapData?.families.length === 0 ? (
              <p className="text-sm text-muted-foreground">{zh.mapEmpty}</p>
            ) : null}

            {!mapLoading && !mapError && mapData?.families.length ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {mapData.families.map((family) => (
                    <Button
                      key={family.id}
                      type="button"
                      size="sm"
                      variant={activeFamilyId === family.id ? "default" : "outline"}
                      onClick={() => setActiveFamilyId(family.id)}
                    >
                      {family.anchor}
                    </Button>
                  ))}
                </div>

                {activeFamily ? (
                  <div className="space-y-3 rounded-xl border border-border/70 p-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{zh.centerExpression}</p>
                      <p className="text-sm font-medium">{centerExpressionText || activeFamily.anchor}</p>
                      <p className="text-xs text-muted-foreground">
                        {zh.familyMeaning}\uff1a{activeFamily.meaning}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">{zh.relatedExpressions}</p>
                    <div className="space-y-2">
                      {displayedFamilyExpressions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{zh.familyEmpty}</p>
                      ) : (
                        displayedFamilyExpressions.map((text) => {
                          const normalized = normalizePhraseText(text);
                          const status = expressionStatusByNormalized.get(normalized);
                          const statusText = status ? reviewStatusLabel[status] : zh.statusUnknown;
                          const note = buildDifferenceNote(
                            centerExpressionText || activeFamily.anchor,
                            text,
                          );
                          return (
                            <div key={text} className="rounded-lg border border-border/60 p-2.5">
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
                    {activeFamily.expressions.length > displayedFamilyExpressions.length ? (
                      <p className="text-xs text-muted-foreground">
                        {zh.mapLimitedPrefix} {displayedFamilyExpressions.length} {zh.mapLimitedSuffix}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <div className="grid grid-cols-3 gap-2 pb-safe">
              <Button type="button" variant="outline" onClick={() => setMapOpen(false)}>
                {zh.close}
              </Button>
              <Button type="button" variant="secondary" onClick={handlePracticeFamily}>
                {zh.practiceFamily}
              </Button>
              <Button type="button" disabled={addingFamily} onClick={() => void handleAddFamilyToReview()}>
                {addingFamily ? `${zh.addFamily}...` : zh.addFamily}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
