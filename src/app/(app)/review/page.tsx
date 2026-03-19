"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getReviewPageCache, setReviewPageCache } from "@/lib/cache/review-page-cache";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyPhrasesFromApi, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { readReviewSession } from "@/lib/utils/review-session";
import {
  DueReviewItemResponse,
  getDueReviewItemsFromApi,
  getReviewSummaryFromApi,
  submitPhraseReviewFromApi,
} from "@/lib/utils/review-api";

const zh = {
  loadFailed: "\u52a0\u8f7d\u590d\u4e60\u6570\u636e\u5931\u8d25\u3002",
  submitFailed: "\u63d0\u4ea4\u590d\u4e60\u5931\u8d25\u3002",
  submitOk: "\u5df2\u8bb0\u5f55\u590d\u4e60\u7ed3\u679c\u3002",
  eyebrow: "\u590d\u4e60",
  title: "\u5de9\u56fa\u5df2\u4fdd\u5b58\u8868\u8fbe",
  desc: "\u628a\u5df2\u4fdd\u5b58\u8868\u8fbe\u8dd1\u8fdb\u771f\u5b9e\u590d\u4e60\u95ed\u73af\uff0c\u6301\u7eed\u5f62\u6210\u53ef\u8f93\u51fa\u80fd\u529b\u3002",
  dueNow: "\u5f53\u524d\u5f85\u590d\u4e60",
  doneToday: "\u4eca\u65e5\u5df2\u590d\u4e60",
  accuracy: "\u590d\u4e60\u6b63\u786e\u7387",
  statusJoiner: "\u00b7",
  trainingGuidePrefix: "\u5148\u5728\u5fc3\u91cc\u8bf4\u4e00\u53e5\uff0c\u518d\u5224\u65ad\u4f60\u73b0\u5728\u7684",
  trainingGuideSuffix: "\u719f\u6089\u7a0b\u5ea6",
  trainingHintSubtle: "\u522b\u6025\u7740\u770b\u53c2\u8003\u53e5\uff0c\u5148\u81ea\u5df1\u8bd5\u4e00\u4e0b",
  expressionLabel: "\u8868\u8fbe",
  exampleLabel: "\u53c2\u8003\u53e5",
  showReference: "\u60f3\u4e0d\u8d77\u6765\uff1f\u770b\u53c2\u8003\u53e5",
  hideReference: "\u6536\u8d77\u53c2\u8003\u53e5",
  activeRecallHint: "\u5728\u5fc3\u91cc\u8bf4\u4e00\u904d\uff0c\u6216\u7528\u4f60\u81ea\u5df1\u7684\u8bdd\u8bd5\u7740\u6539\u5199\u4e00\u53e5",
  againLabel: "\u4e0d\u4f1a",
  hardLabel: "\u6709\u70b9\u96be",
  goodLabel: "\u4f1a\u7528\u4e86",
  queueLoading: "\u590d\u4e60\u961f\u5217\u52a0\u8f7d\u4e2d...",
  queueEmpty: "\u5f53\u524d\u6ca1\u6709\u5230\u671f\u5f85\u590d\u4e60\u9879\uff0c\u7a0d\u540e\u518d\u6765\u5de9\u56fa\u3002",
  noTranslation: "\u6682\u65e0\u7ffb\u8bd1",
  sourceSentence: "\u6765\u6e90\u53e5\u5b50\uff1a",
  reviewStats: "\u590d\u4e60\u6b21\u6570",
  correct: "\u6b63\u786e",
  incorrect: "\u9519\u8bef",
  dash: "\u2014",
  sessionHint: "\u6b63\u5728\u590d\u4e60\u4f60\u521a\u9009\u4e2d\u7684\u8868\u8fbe\u3002",
  manualSessionHint: "\u521a\u8bb0\u4e0b\u8fd9\u4e2a\u8868\u8fbe\uff0c\u73b0\u5728\u8bd5\u7740\u81ea\u5df1\u7528\u4e00\u4e0b\u3002",
  manualTrainingHintSubtle:
    "\u8fd9\u662f\u4f60\u521a\u6536\u85cf\u7684\u8868\u8fbe\uff0c\u5148\u522b\u770b\u53c2\u8003\u53e5\uff0c\u8bd5\u7740\u8bf4\u4e00\u53e5",
  fromExpressionLibrary: "\u6765\u81ea\u8868\u8fbe\u5e93",
  fromExpressionMap: "\u6765\u81ea\u8868\u8fbe\u5730\u56fe",
  fromTodayTask: "\u6765\u81ea\u4eca\u65e5\u4efb\u52a1",
  fromSelected: "\u6765\u81ea\u4f60\u7684\u9009\u4e2d\u8868\u8fbe",
  sourcePrefix: "\u6765\u6e90",
  defaultHint: "\u6b63\u5728\u8fdb\u884c\u5f53\u524d\u5230\u671f\u8868\u8fbe\u590d\u4e60\u3002",
};

const buildFallbackExampleSentence = (expression: string) =>
  `I can use "${expression}" in a real sentence.`;
const REVIEW_LIMIT = 20;

const ExpressionWordMark = ({ children }: { children: ReactNode }) => (
  <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">{children}</span>
);

const toDueItemFromSavedPhrase = (
  row: UserPhraseItemResponse,
): DueReviewItemResponse | null => {
  if (!(row.reviewStatus === "saved" || row.reviewStatus === "reviewing")) return null;
  return {
    userPhraseId: row.userPhraseId,
    phraseId: row.phraseId,
    text: row.text,
    translation: row.translation,
    usageNote: row.usageNote,
    sourceSceneSlug: row.sourceSceneSlug,
    sourceSentenceText: row.sourceSentenceText,
    expressionFamilyId: row.expressionFamilyId,
    reviewStatus: row.reviewStatus,
    reviewCount: row.reviewCount,
    correctCount: row.correctCount,
    incorrectCount: row.incorrectCount,
    nextReviewAt: row.nextReviewAt,
  };
};

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<DueReviewItemResponse[]>([]);
  const [isSessionReview, setIsSessionReview] = useState(false);
  const [sessionSource, setSessionSource] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [summary, setSummary] = useState<{
    dueReviewCount: number;
    reviewedTodayCount: number;
    reviewAccuracy: number | null;
    masteredPhraseCount: number;
  } | null>(null);
  const activeLoadTokenRef = useRef(0);

  const loadData = async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const canApply = () => activeLoadTokenRef.current === token;
    const preferCache = options?.preferCache ?? false;
    setLoading(true);
    try {
      const session = readReviewSession();
      const prioritizedIds = session?.expressionUserPhraseIds ?? [];
      if (canApply()) {
        setIsSessionReview(prioritizedIds.length > 0);
        setSessionSource(session?.source ?? null);
      }

      if (preferCache) {
        const cache = await getReviewPageCache(REVIEW_LIMIT);
        if (canApply() && cache.found && cache.record) {
          const cachedRows = cache.record.data.rows;
          if (prioritizedIds.length > 0) {
            const byId = new Map(cachedRows.map((item) => [item.userPhraseId, item]));
            const reordered: DueReviewItemResponse[] = [];
            const added = new Set<string>();
            for (const id of prioritizedIds) {
              const row = byId.get(id);
              if (!row || added.has(row.userPhraseId)) continue;
              reordered.push(row);
              added.add(row.userPhraseId);
            }
            for (const row of cachedRows) {
              if (added.has(row.userPhraseId)) continue;
              reordered.push(row);
              added.add(row.userPhraseId);
            }
            setItems(reordered);
          } else {
            setItems(cachedRows);
          }
          setSummary(cache.record.data.summary);
          setLoading(false);
        }
      }

      const [due, nextSummary, phraseList] = await Promise.all([
        getDueReviewItemsFromApi(REVIEW_LIMIT),
        getReviewSummaryFromApi(),
        prioritizedIds.length > 0
          ? getMyPhrasesFromApi({
              page: 1,
              limit: 100,
              status: "saved",
              reviewStatus: "all",
            })
          : Promise.resolve(null),
      ]);
      if (!canApply()) return;

      const dueRows = due.rows;
      if (prioritizedIds.length === 0) {
        setItems(dueRows);
        setSummary(nextSummary);
        void setReviewPageCache(
          {
            rows: dueRows,
            total: due.total,
            summary: nextSummary,
          },
          REVIEW_LIMIT,
        );
        return;
      }

      const dueById = new Map(dueRows.map((item) => [item.userPhraseId, item]));
      const supplementalById = new Map<string, DueReviewItemResponse>();
      for (const row of phraseList?.rows ?? []) {
        const mapped = toDueItemFromSavedPhrase(row);
        if (!mapped) continue;
        supplementalById.set(mapped.userPhraseId, mapped);
      }

      const merged: DueReviewItemResponse[] = [];
      const added = new Set<string>();

      for (const id of prioritizedIds) {
        const dueItem = dueById.get(id) ?? supplementalById.get(id) ?? null;
        if (!dueItem) continue;
        if (added.has(dueItem.userPhraseId)) continue;
        merged.push(dueItem);
        added.add(dueItem.userPhraseId);
      }

      for (const dueItem of dueRows) {
        if (added.has(dueItem.userPhraseId)) continue;
        merged.push(dueItem);
        added.add(dueItem.userPhraseId);
      }

      setItems(merged);
      setSummary(nextSummary);
      void setReviewPageCache(
        {
          rows: dueRows,
          total: due.total,
          summary: nextSummary,
        },
        REVIEW_LIMIT,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      if (canApply()) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData({ preferCache: true });
  }, []);

  const current = items[0] ?? null;
  const currentItemId = current?.userPhraseId ?? null;
  useEffect(() => {
    setShowReference(false);
  }, [currentItemId]);

  const exampleSentence = current
    ? current.sourceSentenceText?.trim() || buildFallbackExampleSentence(current.text)
    : "";
  const sourceLabel = (() => {
    if (!isSessionReview) return null;
    if (sessionSource === "expression-library-manual-add") return zh.fromExpressionLibrary;
    if (sessionSource === "expression-library-card") return zh.fromExpressionLibrary;
    if (sessionSource === "expression-map-family" || sessionSource === "expression-map-single") {
      return zh.fromExpressionMap;
    }
    if (sessionSource === "today-task") return zh.fromTodayTask;
    return zh.fromSelected;
  })();
  const primaryHint = (() => {
    if (!isSessionReview) return zh.defaultHint;
    if (sessionSource === "expression-library-manual-add") return zh.manualSessionHint;
    return zh.sessionHint;
  })();
  const trainingHintSubtle =
    sessionSource === "expression-library-manual-add"
      ? zh.manualTrainingHintSubtle
      : zh.trainingHintSubtle;

  const submit = async (result: "again" | "hard" | "good") => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      const response = await submitPhraseReviewFromApi({
        userPhraseId: current.userPhraseId,
        reviewResult: result,
        source: "review_page",
      });
      const nextItems = items.filter((item) => item.userPhraseId !== current.userPhraseId);
      setItems(nextItems);
      setSummary(response.summary);
      void setReviewPageCache(
        {
          rows: nextItems,
          total: Math.max(response.summary.dueReviewCount, nextItems.length),
          summary: response.summary,
        },
        REVIEW_LIMIT,
      );
      toast.success(zh.submitOk);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : zh.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={zh.eyebrow} title={zh.title} description={zh.desc} />

      <div className="space-y-1">
        <p className="text-sm text-foreground/90">{primaryHint}</p>
        {sourceLabel ? (
          <p className="text-xs text-muted-foreground">
            {zh.sourcePrefix}：{sourceLabel}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {zh.dueNow} {loading ? "..." : summary?.dueReviewCount ?? 0} {zh.statusJoiner} {zh.doneToday}{" "}
          {loading ? "..." : summary?.reviewedTodayCount ?? 0} {zh.statusJoiner} {zh.accuracy}{" "}
          {loading ? "..." : summary?.reviewAccuracy == null ? zh.dash : `${summary.reviewAccuracy}%`}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{zh.queueLoading}</p>
      ) : !current ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{zh.queueEmpty}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              {zh.trainingGuidePrefix} <ExpressionWordMark>{zh.expressionLabel}</ExpressionWordMark> {zh.trainingGuideSuffix}
            </p>
            <p className="text-xs text-muted-foreground">{trainingHintSubtle}</p>
            <CardTitle className="text-xl">
              <ExpressionWordMark>{zh.expressionLabel}</ExpressionWordMark>：{current.text}
            </CardTitle>
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {current.translation ?? zh.noTranslation}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{zh.activeRecallHint}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-auto justify-start px-0 text-xs text-muted-foreground"
              onClick={() => setShowReference((prev) => !prev)}
            >
              {showReference ? zh.hideReference : zh.showReference}
            </Button>
            {showReference ? (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{zh.exampleLabel}</p>
                <p className="mt-1 text-sm">{exampleSentence}</p>
                {current.usageNote ? (
                  <p className="mt-2 text-xs text-muted-foreground">{current.usageNote}</p>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => void submit("again")}
              >
                {zh.againLabel}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => void submit("hard")}
              >
                {zh.hardLabel}
              </Button>
              <Button type="button" disabled={submitting} onClick={() => void submit("good")}>
                {zh.goodLabel}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {zh.reviewStats} {current.reviewCount}，{zh.correct} {current.correctCount}，{zh.incorrect}{" "}
              {current.incorrectCount}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
