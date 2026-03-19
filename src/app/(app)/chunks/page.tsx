"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
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
  manualAddDesc: "\u5148\u9009\u62e9\u8bb0\u5f55\u8868\u8fbe\u6216\u53e5\u5b50\uff0c\u518d\u5feb\u901f\u5b58\u5165\u5b66\u4e60\u5e93\u3002",
  itemTypeLabel: "\u8bb0\u5f55\u7c7b\u578b",
  itemTypeExpression: "\u8bb0\u5f55\u8868\u8fbe",
  itemTypeSentence: "\u8bb0\u5f55\u53e5\u5b50",
  contentTabExpression: "\u8868\u8fbe",
  contentTabSentence: "\u53e5\u5b50",
  expressionTextLabel: "\u8868\u8fbe",
  expressionTextPlaceholder: "call it a day",
  sentenceLabel: "\u53e5\u5b50",
  sentencePlaceholder: "I think I should call it a day.",
  translationLabel: "\u4e2d\u6587\u91ca\u4e49",
  translationPlaceholder: "\u4eca\u5929\u5148\u5230\u8fd9\u91cc / \u6536\u5de5",
  sourceSentenceLabel: "\u4f8b\u53e5 / \u8bed\u5883",
  sentenceMainLabel: "\u53e5\u5b50",
  sentenceMainPlaceholder: "I was exhausted, so I decided to call it a day.",
  usageNoteLabel: "\u4f7f\u7528\u63d0\u793a",
  usageNotePlaceholder:
    "\u4f8b\u5982\uff1a\u9002\u5408\u4ec0\u4e48\u65f6\u5019\u7528\uff1f\u8bed\u6c14\u4e0a\u6709\u4ec0\u4e48\u611f\u89c9\uff1f",
  sourceNoteLabel: "\u8bb0\u5f55\u6765\u6e90",
  sourceNotePlaceholder:
    "\u4f8b\u5982\uff1a\u4f60\u662f\u5728\u54ea\u91cc\u770b\u5230\u5b83\u7684\uff1f\u64ad\u5ba2 / \u89c6\u9891 / \u670b\u53cb\u804a\u5929",
  saveToLibrary: "\u4fdd\u5b58\u5230\u8868\u8fbe\u5e93",
  saveAndReview: "\u4fdd\u5b58\u5e76\u52a0\u5165\u590d\u4e60",
  saveSentence: "\u4fdd\u5b58\u53e5\u5b50",
  saveSentenceReview: "\u4fdd\u5b58\u53e5\u5b50",
  saveSuccess: "\u5df2\u52a0\u5165\u8868\u8fbe\u5e93\uff0c\u53ef\u7a0d\u540e\u8fdb\u5165\u590d\u4e60",
  saveSentenceSuccess: "\u5df2\u4fdd\u5b58\u53e5\u5b50\u5230\u5b66\u4e60\u5e93",
  saveReviewSuccess: "\u5df2\u52a0\u5165\u8868\u8fbe\u5e93\uff0c\u6b63\u5728\u5f00\u59cb\u590d\u4e60",
  saveDuplicateSuccess: "\u8fd9\u4e2a\u8868\u8fbe\u5df2\u7ecf\u5728\u8868\u8fbe\u5e93\u91cc\u4e86\uff0c\u5df2\u66f4\u65b0\u8bb0\u5f55",
  saveSentenceDuplicateSuccess: "\u8fd9\u53e5\u5185\u5bb9\u5df2\u5728\u5b66\u4e60\u5e93\u91cc\uff0c\u5df2\u66f4\u65b0\u8bb0\u5f55",
  saveDuplicateReviewSuccess:
    "\u8fd9\u4e2a\u8868\u8fbe\u5df2\u7ecf\u5728\u8868\u8fbe\u5e93\u91cc\u4e86\uff0c\u6b63\u5728\u5f00\u59cb\u590d\u4e60",
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
    if (!normalized || unique.has(normalized)) continue;
    unique.set(normalized, entry);
  }
  return Array.from(unique.values()).slice(0, 6);
};

export default function ChunksPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<PhraseReviewStatus | "all">("all");
  const [contentFilter, setContentFilter] = useState<"expression" | "sentence">("expression");
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
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [manualItemType, setManualItemType] = useState<"expression" | "sentence">("expression");
  const [manualText, setManualText] = useState("");
  const [manualSentence, setManualSentence] = useState("");
  const [manualTranslation, setManualTranslation] = useState("");
  const [manualSourceSentence, setManualSourceSentence] = useState("");
  const [manualUsageNote, setManualUsageNote] = useState("");
  const [manualSourceNote, setManualSourceNote] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [savingSentenceExpressionKey, setSavingSentenceExpressionKey] = useState<string | null>(
    null,
  );
  const [savedSentenceExpressionKeys, setSavedSentenceExpressionKeys] = useState<
    Record<string, boolean>
  >({});

  const activeLoadTokenRef = useRef(0);

  const loadPhrases = async (
    nextQuery: string,
    nextFilter: PhraseReviewStatus | "all",
    nextContentFilter: "expression" | "sentence",
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
      learningItemType: nextContentFilter,
    };

    if (preferCache) {
      try {
        const cache = await getPhraseListCache({
          query: requestParams.query,
          status: requestParams.status,
          reviewStatus: requestParams.reviewStatus,
          learningItemType: requestParams.learningItemType,
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
          learningItemType: requestParams.learningItemType,
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
      void loadPhrases(query, reviewFilter, contentFilter, { preferCache: true });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, reviewFilter, contentFilter]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[expression-library][cache-debug]", {
      source: listDataSource,
      count: phrases.length,
      filter: reviewFilter,
      contentFilter,
    });
  }, [listDataSource, phrases.length, reviewFilter, contentFilter]);

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
    if (item.learningItemType === "sentence") return zh.sentenceReviewPending;
    if (item.reviewStatus === "reviewing") return zh.continueReview;
    if (item.reviewStatus === "mastered") {
      return item.expressionFamilyId ? zh.reviewFamily : zh.revisitOne;
    }
    return zh.startReview;
  };

  const startReviewFromCard = (item: UserPhraseItemResponse) => {
    if (item.learningItemType === "sentence") {
      toast.message(zh.sentenceReviewPending);
      return;
    }
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

  const openExpressionComposerFromSentence = (item: UserPhraseItemResponse) => {
    setManualItemType("expression");
    setManualText("");
    setManualSourceSentence(item.text);
    setManualTranslation(item.translation ?? "");
    setManualUsageNote("");
    setManualSourceNote(item.sourceNote ?? "");
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

  const openExpressionMap = async (expression: UserPhraseItemResponse) => {
    if (expression.learningItemType === "sentence") return;
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

  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getUsageHint = (item: UserPhraseItemResponse) => {
    const raw = (item.usageNote ?? "").trim();
    if (raw.length === 0) return zh.usageHintFallback;
    if (raw.length <= 70) return raw;
    return `${raw.slice(0, 70)}...`;
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
        await loadPhrases(query, reviewFilter, contentFilter, { preferCache: false });
      }
      toast.success(zh.addFamilySuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      setAddingFamily(false);
    }
  };

  const resetManualForm = () => {
    setManualItemType("expression");
    setManualText("");
    setManualSentence("");
    setManualTranslation("");
    setManualSourceSentence("");
    setManualUsageNote("");
    setManualSourceNote("");
  };

  const handleSaveManualExpression = async (mode: "save" | "save_and_review") => {
    const text = manualText.trim();
    const sentenceText =
      manualItemType === "sentence"
        ? manualSentence.trim()
        : manualSourceSentence.trim();
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
      const response = await savePhraseFromApi({
        text: text || undefined,
        learningItemType: manualItemType,
        sentenceText: sentenceText || undefined,
        translation: manualTranslation.trim() || undefined,
        usageNote: manualUsageNote.trim() || undefined,
        sourceType: "manual",
        sourceNote: manualSourceNote.trim() || undefined,
        sourceSentenceText: sentenceText || undefined,
        sourceChunkText: text || undefined,
      });

      const nextContentFilter =
        manualItemType === "sentence" ? "sentence" : contentFilter;
      if (nextContentFilter !== contentFilter) {
        setContentFilter(nextContentFilter);
      }
      await loadPhrases(query, reviewFilter, nextContentFilter, { preferCache: false });
      if (mode === "save_and_review" && manualItemType === "expression") {
        toast.success(response.created ? zh.saveReviewSuccess : zh.saveDuplicateReviewSuccess);
        startReviewSession({
          router,
          source: "expression-library-manual-add",
          expressions: [
            {
              userPhraseId: response.userPhrase.id,
              text,
            },
          ],
        });
      } else {
        if (manualItemType === "sentence") {
          toast.success(
            response.created ? zh.saveSentenceSuccess : zh.saveSentenceDuplicateSuccess,
          );
        } else {
          toast.success(response.created ? zh.saveSuccess : zh.saveDuplicateSuccess);
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
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{summary}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setAddSheetOpen(true)}>
            {zh.addExpression}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={contentFilter === "expression" ? "default" : "outline"}
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
          variant={contentFilter === "sentence" ? "default" : "outline"}
          onClick={() => {
            setContentFilter("sentence");
            setReviewFilter("all");
          }}
        >
          {zh.contentTabSentence}
        </Button>
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
          {phrases.map((item) => {
            const sentenceExpressions =
              item.learningItemType === "sentence" ? extractExpressionsFromSentenceItem(item) : [];
            return (
            <Card key={item.userPhraseId} className="h-full overflow-hidden">
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
                        {item.translation ?? zh.noTranslation}
                      </p>
                    </div>
                    <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                      <Badge variant="secondary">{reviewStatusLabel[item.reviewStatus]}</Badge>
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
                className={`overflow-hidden border-t border-border/50 transition-all duration-200 ${
                  expandedCardIds[item.userPhraseId]
                    ? "max-h-[560px] opacity-100"
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
                                  className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1"
                                >
                                  <span className="text-xs text-foreground">{expression}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1.5 text-[11px]"
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
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.usageHint}</p>
                        <p className="line-clamp-2 text-sm text-foreground/90">{getUsageHint(item)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{zh.sourceSentence}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {item.sourceSentenceText
                            ? renderSentenceWithExpressionHighlight(item.sourceSentenceText, item.text)
                            : zh.noSourceSentence}
                        </p>
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
                <CardFooter className="flex flex-wrap gap-2 border-t border-border/40 px-3 py-2.5">
                  {item.learningItemType === "sentence" ? (
                    <>
                      {/* TODO: Re-enable one-click extraction after stable server-side chunk detection is available. */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => openExpressionComposerFromSentence(item)}
                      >
                        {zh.sentenceRecordExpression}
                      </Button>
                    </>
                  ) : (
                    <>
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
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
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
                <TabsList className="w-full">
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
                    onChange={(event) => setManualText(event.target.value)}
                    placeholder={zh.expressionTextPlaceholder}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.translationLabel}</p>
                  <Input
                    value={manualTranslation}
                    onChange={(event) => setManualTranslation(event.target.value)}
                    placeholder={zh.translationPlaceholder}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.sourceSentenceLabel}</p>
                  <Textarea
                    value={manualSourceSentence}
                    onChange={(event) => setManualSourceSentence(event.target.value)}
                    rows={3}
                    placeholder={zh.sentencePlaceholder}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.usageNoteLabel}</p>
                  <Textarea
                    value={manualUsageNote}
                    onChange={(event) => setManualUsageNote(event.target.value)}
                    rows={3}
                    placeholder={zh.usageNotePlaceholder}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.sourceNoteLabel}</p>
                  <Input
                    value={manualSourceNote}
                    onChange={(event) => setManualSourceNote(event.target.value)}
                    placeholder={zh.sourceNotePlaceholder}
                  />
                </div>
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
                  <p className="text-[11px] text-muted-foreground">{zh.sentenceRecordFormHint}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.translationLabel}</p>
                  <Input
                    value={manualTranslation}
                    onChange={(event) => setManualTranslation(event.target.value)}
                    placeholder={zh.translationPlaceholder}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.usageNoteLabel}</p>
                  <Textarea
                    value={manualUsageNote}
                    onChange={(event) => setManualUsageNote(event.target.value)}
                    rows={3}
                    placeholder={zh.usageNotePlaceholder}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{zh.sourceNoteLabel}</p>
                  <Input
                    value={manualSourceNote}
                    onChange={(event) => setManualSourceNote(event.target.value)}
                    placeholder={zh.sourceNotePlaceholder}
                  />
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
                variant="outline"
                disabled={savingManual}
                onClick={() => void handleSaveManualExpression("save")}
              >
                {savingManual
                  ? `${manualItemType === "sentence" ? zh.saveSentence : zh.saveToLibrary}...`
                  : manualItemType === "sentence"
                    ? zh.saveSentence
                    : zh.saveToLibrary}
              </Button>
              {manualItemType === "expression" ? (
                <Button
                  type="button"
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
