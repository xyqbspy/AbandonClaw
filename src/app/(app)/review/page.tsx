"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getReviewPageCache, setReviewPageCache } from "@/lib/cache/review-page-cache";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyPhrasesFromApi } from "@/lib/utils/phrases-api";
import { readReviewSession } from "@/lib/utils/review-session";
import {
  DueReviewItemResponse,
  getDueReviewItemsFromApi,
  getReviewSummaryFromApi,
  submitPhraseReviewFromApi,
} from "@/lib/utils/review-api";
import {
  buildFallbackExampleSentence,
  mergePrioritizedReviewItems,
  resolveReviewHints,
  resolveReviewSourceLabel,
} from "./review-page-selectors";
import { reviewPageLabels as zh } from "./review-page-labels";

const REVIEW_LIMIT = 20;

const ExpressionWordMark = ({ children }: { children: ReactNode }) => (
  <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">{children}</span>
);

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

      setItems(
        mergePrioritizedReviewItems({
          prioritizedIds,
          dueRows,
          phraseRows: phraseList?.rows ?? [],
        }),
      );
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
  const sourceLabel = resolveReviewSourceLabel({
    isSessionReview,
    sessionSource,
    labels: {
      fromExpressionLibrary: zh.fromExpressionLibrary,
      fromExpressionMap: zh.fromExpressionMap,
      fromTodayTask: zh.fromTodayTask,
      fromSelected: zh.fromSelected,
    },
  });
  const { primaryHint, trainingHintSubtle } = resolveReviewHints({
    isSessionReview,
    sessionSource,
    labels: {
      defaultHint: zh.defaultHint,
      sessionHint: zh.sessionHint,
      manualSessionHint: zh.manualSessionHint,
      trainingHintSubtle: zh.trainingHintSubtle,
      manualTrainingHintSubtle: zh.manualTrainingHintSubtle,
    },
  });

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
