"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearAllReviewPageCache,
  getReviewPageCache,
  setReviewPageCache,
} from "@/lib/cache/review-page-cache";
import { LoadingButton, LoadingState } from "@/components/shared/action-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";
import {
  completeScenePracticeRunFromApi,
  markScenePracticeModeCompleteFromApi,
  recordScenePracticeAttemptFromApi,
  startScenePracticeRunFromApi,
} from "@/lib/utils/learning-api";
import { getMyPhrasesFromApi } from "@/lib/utils/phrases-api";
import { readReviewSession } from "@/lib/utils/review-session";
import {
  DueScenePracticeReviewItemResponse,
  DueReviewItemResponse,
  getDueReviewItemsFromApi,
  getReviewSummaryFromApi,
  submitPhraseReviewFromApi,
} from "@/lib/utils/review-api";
import {
  buildFallbackExampleSentence,
  buildScenePracticeReviewItemKey,
  buildScenePracticeReviewKeySet,
  mergePrioritizedReviewItems,
  resolveReviewHints,
  resolveReviewSourceLabel,
} from "./review-page-selectors";
import {
  buildAcceptedPracticeAnswers,
  getPracticeAssessment,
  isPracticeAssessmentComplete,
} from "@/lib/shared/scene-practice-assessment";
import {
  assessmentLabelMap,
  buildReviewInlinePracticeSetId,
  getInlinePracticeFeedback,
  getInlinePracticePlaceholder,
  getReviewModeAccentClassName,
  reviewModeLabelMap,
} from "./review-page-messages";
import {
  notifyInlinePracticeCompleted,
  notifyInlinePracticeFailed,
  notifyInlinePracticeMissingAnswer,
  notifyInlinePracticeMissingExpectedAnswer,
  notifyInlinePracticeRecorded,
  notifyPhraseReviewSubmitted,
  notifyReviewLoadFailed,
  notifyReviewSubmitFailed,
} from "./review-page-notify";
import { reviewPageLabels as zh } from "./review-page-labels";
import {
  APPLE_BODY_TEXT,
  APPLE_CARD_INTERACTIVE,
  APPLE_INPUT_PANEL,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_MD,
} from "@/lib/ui/apple-style";

const REVIEW_LIMIT = 20;

const normalizePathname = (pathname?: string | null) => {
  if (typeof pathname !== "string") return "/";
  return pathname.replace(/\/+$/, "") || "/";
};

const ExpressionWordMark = ({ children }: { children: ReactNode }) => (
  <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">{children}</span>
);

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<DueReviewItemResponse[]>([]);
  const [scenePracticeItems, setScenePracticeItems] = useState<DueScenePracticeReviewItemResponse[]>([]);
  const [scenePracticeAnswerMap, setScenePracticeAnswerMap] = useState<Record<string, string>>({});
  const [scenePracticeAssessmentMap, setScenePracticeAssessmentMap] = useState<
    Record<string, PracticeAssessmentLevel | null>
  >({});
  const [scenePracticeSubmittingMap, setScenePracticeSubmittingMap] = useState<Record<string, boolean>>(
    {},
  );
  const [isSessionReview, setIsSessionReview] = useState(false);
  const [sessionSource, setSessionSource] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [openingSceneHref, setOpeningSceneHref] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    dueReviewCount: number;
    reviewedTodayCount: number;
    reviewAccuracy: number | null;
    masteredPhraseCount: number;
  } | null>(null);
  const activeLoadTokenRef = useRef(0);

  const loadData = useCallback(async (options?: { preferCache?: boolean }) => {
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
      setScenePracticeItems(due.scenePracticeRows ?? []);
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
      notifyReviewLoadFailed(error instanceof Error ? error.message : zh.loadFailed);
    } finally {
      if (canApply()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData({ preferCache: true });
  }, [loadData]);

  useEffect(() => {
    const handlePullRefresh = async (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
      if (normalizePathname(customEvent.detail?.pathname) !== "/review") return;
      customEvent.detail.handled = true;
      try {
        await clearAllReviewPageCache();
        await loadData({ preferCache: false });
      } catch (error) {
        notifyReviewLoadFailed(error instanceof Error ? error.message : zh.loadFailed);
      }
    };

    window.addEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    return () => {
      window.removeEventListener("app:pull-refresh", handlePullRefresh as EventListener);
    };
  }, [loadData]);

  const current = items[0] ?? null;
  const currentItemId = current?.userPhraseId ?? null;
  useEffect(() => {
    setShowReference(false);
  }, [currentItemId]);

  const exampleSentence = current
    ? current.sourceSentenceText?.trim() || buildFallbackExampleSentence(current.text)
    : "";
  const scenePracticeKeySet = useMemo(
    () => buildScenePracticeReviewKeySet(scenePracticeItems),
    [scenePracticeItems],
  );
  useEffect(() => {
    setScenePracticeAnswerMap((prev) => {
      const nextEntries = Object.entries(prev).filter(([key]) => scenePracticeKeySet.has(key));
      return nextEntries.length === Object.keys(prev).length ? prev : Object.fromEntries(nextEntries);
    });
    setScenePracticeAssessmentMap((prev) => {
      const nextEntries = Object.entries(prev).filter(([key]) => scenePracticeKeySet.has(key));
      return nextEntries.length === Object.keys(prev).length ? prev : Object.fromEntries(nextEntries);
    });
    setScenePracticeSubmittingMap((prev) => {
      const nextEntries = Object.entries(prev).filter(([key]) => scenePracticeKeySet.has(key));
      return nextEntries.length === Object.keys(prev).length ? prev : Object.fromEntries(nextEntries);
    });
  }, [scenePracticeKeySet]);
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
      notifyPhraseReviewSubmitted(zh);
    } catch (error) {
      notifyReviewSubmitFailed(error instanceof Error ? error.message : zh.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const openScene = (href: string) => {
    if (!href || openingSceneHref === href) return;
    setOpeningSceneHref(href);
    window.location.assign(href);
  };

  const submitInlineScenePractice = async (item: DueScenePracticeReviewItemResponse) => {
    const itemKey = buildScenePracticeReviewItemKey(item);
    const answer = scenePracticeAnswerMap[itemKey]?.trim() ?? "";
    if (!answer) {
      notifyInlinePracticeMissingAnswer(zh);
      return;
    }

    const expectedAnswer = item.expectedAnswer?.trim() ?? "";
    if (!expectedAnswer) {
      notifyInlinePracticeMissingExpectedAnswer(zh);
      return;
    }

    const acceptedAnswers = buildAcceptedPracticeAnswers(expectedAnswer);
    const assessment = getPracticeAssessment({
      mode: item.recommendedMode as PracticeMode,
      expected: expectedAnswer,
      answer,
      acceptedAnswers,
    });

    setScenePracticeAssessmentMap((prev) => ({
      ...prev,
      [itemKey]: assessment,
    }));
    setScenePracticeSubmittingMap((prev) => ({
      ...prev,
      [itemKey]: true,
    }));

    const practiceSetId = buildReviewInlinePracticeSetId(item);

    try {
      await startScenePracticeRunFromApi(item.sceneSlug, {
        practiceSetId,
        mode: item.recommendedMode,
        sourceType: "original",
      });

      await recordScenePracticeAttemptFromApi(item.sceneSlug, {
        practiceSetId,
        mode: item.recommendedMode,
        sourceType: "original",
        exerciseId: item.exerciseId,
        sentenceId: item.sentenceId,
        userAnswer: answer,
        assessmentLevel: assessment,
        isCorrect: isPracticeAssessmentComplete(assessment),
        metadata: {
          prompt: item.promptText,
          displayText: item.displayText,
          expectedAnswer,
          hint: item.hint,
          reviewSourceMode: item.sourceMode,
          reviewRecommendedMode: item.recommendedMode,
          reviewInline: true,
        },
      });

      if (isPracticeAssessmentComplete(assessment)) {
        await markScenePracticeModeCompleteFromApi(item.sceneSlug, {
          practiceSetId,
          mode: item.recommendedMode,
        });
        await completeScenePracticeRunFromApi(item.sceneSlug, {
          practiceSetId,
        });
        await clearAllReviewPageCache();
        await loadData({ preferCache: false });
        notifyInlinePracticeCompleted(zh);
      } else {
        await clearAllReviewPageCache();
        await loadData({ preferCache: false });
        notifyInlinePracticeRecorded(zh);
      }
    } catch (error) {
      notifyInlinePracticeFailed(error instanceof Error ? error.message : zh.practiceInlineFailed);
    } finally {
      setScenePracticeSubmittingMap((prev) => ({
        ...prev,
        [itemKey]: false,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={zh.eyebrow} title={zh.title} description={zh.desc} />

      <div className="space-y-1">
        <p className={APPLE_BODY_TEXT}>{primaryHint}</p>
        {sourceLabel ? (
          <p className={`text-xs ${APPLE_META_TEXT}`}>
            {zh.sourcePrefix}：{sourceLabel}
          </p>
        ) : null}
        <p className={APPLE_META_TEXT}>
          {zh.dueNow} {loading ? "..." : summary?.dueReviewCount ?? 0} {zh.statusJoiner} {zh.doneToday}{" "}
          {loading ? "..." : summary?.reviewedTodayCount ?? 0} {zh.statusJoiner} {zh.accuracy}{" "}
          {loading ? "..." : summary?.reviewAccuracy == null ? zh.dash : `${summary.reviewAccuracy}%`}
        </p>
      </div>

      {!loading && scenePracticeItems.length > 0 ? (
        <Card className={APPLE_PANEL_RAISED}>
          <CardHeader>
            <CardTitle className="text-lg">场景练习待复习</CardTitle>
            <p className={APPLE_META_TEXT}>
              这里会优先展示你最近在场景练习里只做到“关键词”或“骨架”的句子，方便继续按推荐题型回练。
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenePracticeItems.map((item) => (
              (() => {
                const itemKey = buildScenePracticeReviewItemKey(item);
                const inlineAssessment = scenePracticeAssessmentMap[itemKey];
                const inlineFeedback = getInlinePracticeFeedback(inlineAssessment, zh);
                const inlineAnswer = scenePracticeAnswerMap[itemKey] ?? "";
                const isSubmittingInline = scenePracticeSubmittingMap[itemKey] === true;
                const placeholder = getInlinePracticePlaceholder(item.recommendedMode as PracticeMode, zh);
                const modeAccentClassName = getReviewModeAccentClassName(
                  item.recommendedMode as PracticeMode,
                );

                return (
                  <div
                    key={`${item.sceneSlug}-${item.sentenceId ?? item.exerciseId}-${item.reviewedAt}`}
                    className={`p-3 ${APPLE_LIST_ITEM}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.sceneTitle}</p>
                      <p className={APPLE_META_TEXT}>
                        当前评估：
                        {assessmentLabelMap[item.assessmentLevel as keyof typeof assessmentLabelMap] ??
                          item.assessmentLevel}{" "}
                        · 建议题型：{reviewModeLabelMap[item.recommendedMode]}
                      </p>
                    </div>
                    {item.displayText ? (
                      <p className="mt-2 text-sm text-foreground">{item.displayText}</p>
                    ) : null}
                    {item.promptText ? (
                      <p className={`mt-1 ${APPLE_META_TEXT}`}>提示：{item.promptText}</p>
                    ) : null}
                    {item.latestAnswer ? (
                      <p className={`mt-1 ${APPLE_META_TEXT}`}>
                        你上次的答案：{item.latestAnswer}
                      </p>
                    ) : null}
                    {item.expectedAnswer ? (
                      <p className={`mt-1 ${APPLE_META_TEXT}`}>
                        参考目标：{item.expectedAnswer}
                      </p>
                    ) : null}

                    <div className={`mt-3 p-3 ${APPLE_PANEL}`}>
                      <div className="space-y-2">
                        <p className={APPLE_META_TEXT}>{zh.practiceAgain}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={APPLE_META_TEXT}>{zh.practiceModePrefix}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${modeAccentClassName}`}>
                            {reviewModeLabelMap[item.recommendedMode]}
                          </span>
                        </div>
                        {item.promptText ? (
                          <div className="rounded-[var(--app-radius-panel)] bg-background/75 p-2">
                            <p className={APPLE_META_TEXT}>{zh.practicePromptPrefix}</p>
                            <p className="mt-1 text-sm text-foreground">{item.promptText}</p>
                          </div>
                        ) : null}
                        {item.hint ? (
                          <p className={APPLE_META_TEXT}>
                            {zh.practiceHintPrefix}：{item.hint}
                          </p>
                        ) : null}
                      </div>
                      {item.recommendedMode === "full_dictation" ? (
                        <textarea
                          className={`mt-2 min-h-28 w-full px-3 py-2 text-sm ${APPLE_INPUT_PANEL}`}
                          placeholder={placeholder}
                          value={inlineAnswer}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setScenePracticeAnswerMap((prev) => ({
                              ...prev,
                              [itemKey]: nextValue,
                            }));
                            if (scenePracticeAssessmentMap[itemKey]) {
                              setScenePracticeAssessmentMap((prev) => ({
                                ...prev,
                                [itemKey]: null,
                              }));
                            }
                          }}
                        />
                      ) : (
                        <input
                          className={`mt-2 h-11 w-full px-3 text-sm ${APPLE_INPUT_PANEL}`}
                          placeholder={placeholder}
                          value={inlineAnswer}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setScenePracticeAnswerMap((prev) => ({
                              ...prev,
                              [itemKey]: nextValue,
                            }));
                            if (scenePracticeAssessmentMap[itemKey]) {
                              setScenePracticeAssessmentMap((prev) => ({
                                ...prev,
                                [itemKey]: null,
                              }));
                            }
                          }}
                        />
                      )}
                      {inlineFeedback ? (
                        <p
                          className={`mt-2 text-xs ${
                            inlineAssessment === "complete"
                              ? "text-emerald-600"
                              : inlineAssessment === "structure"
                                ? "text-sky-700"
                                : inlineAssessment === "keyword"
                                  ? "text-amber-700"
                                  : "text-rose-600"
                          }`}
                        >
                          {inlineFeedback}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <LoadingButton
                          type="button"
                          size="sm"
                          loading={isSubmittingInline}
                          loadingText={`${zh.practiceCheck}...`}
                          onClick={() => void submitInlineScenePractice(item)}
                        >
                          {zh.practiceCheck}
                        </LoadingButton>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSubmittingInline}
                          onClick={() => {
                            setScenePracticeAnswerMap((prev) => ({
                              ...prev,
                              [itemKey]: "",
                            }));
                            setScenePracticeAssessmentMap((prev) => ({
                              ...prev,
                              [itemKey]: null,
                            }));
                          }}
                        >
                          {zh.practiceReset}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <LoadingButton
                        type="button"
                        size="sm"
                        loading={openingSceneHref === `/scene/${item.sceneSlug}?view=practice`}
                        loadingText="进入场景中..."
                        onClick={() => {
                          openScene(`/scene/${item.sceneSlug}?view=practice`);
                        }}
                      >
                        回到场景继续练
                      </LoadingButton>
                      <LoadingButton
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={openingSceneHref === `/scene/${item.sceneSlug}`}
                        loadingText="进入场景中..."
                        onClick={() => {
                          openScene(`/scene/${item.sceneSlug}`);
                        }}
                      >
                        {zh.openSourceScene}
                      </LoadingButton>
                    </div>
                  </div>
                );
              })()
            ))}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingState text={zh.queueLoading} className="py-1" />
      ) : !current ? (
        <Card>
          <CardContent className={`py-8 ${APPLE_META_TEXT}`}>{zh.queueEmpty}</CardContent>
        </Card>
      ) : (
        <Card className={APPLE_CARD_INTERACTIVE}>
          <CardHeader>
            <p className={APPLE_META_TEXT}>
              {zh.trainingGuidePrefix} <ExpressionWordMark>{zh.expressionLabel}</ExpressionWordMark> {zh.trainingGuideSuffix}
            </p>
            <p className={APPLE_META_TEXT}>{trainingHintSubtle}</p>
            <CardTitle className={`text-xl ${APPLE_TITLE_MD}`}>
              <ExpressionWordMark>{zh.expressionLabel}</ExpressionWordMark>：{current.text}
            </CardTitle>
            <p className={`line-clamp-1 ${APPLE_META_TEXT}`}>
              {current.translation ?? zh.noTranslation}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={APPLE_META_TEXT}>{zh.activeRecallHint}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`h-auto justify-start px-0 text-xs ${APPLE_META_TEXT}`}
              onClick={() => setShowReference((prev) => !prev)}
            >
              {showReference ? zh.hideReference : zh.showReference}
            </Button>
            {showReference ? (
              <div className={`p-3 ${APPLE_PANEL}`}>
                <p className={APPLE_META_TEXT}>{zh.exampleLabel}</p>
                <p className={`mt-1 ${APPLE_BODY_TEXT}`}>{exampleSentence}</p>
                {current.usageNote ? (
                  <p className={`mt-2 ${APPLE_META_TEXT}`}>{current.usageNote}</p>
                ) : null}
                {current.sourceSceneSlug ? (
                  <div className="mt-3">
                    <LoadingButton
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={openingSceneHref === `/scene/${current.sourceSceneSlug}`}
                      loadingText="进入场景中..."
                      onClick={() => {
                        openScene(`/scene/${current.sourceSceneSlug}`);
                      }}
                    >
                      {zh.openSourceScene}
                    </LoadingButton>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <LoadingButton
                type="button"
                variant="destructive"
                loading={submitting}
                loadingText={`${zh.againLabel}...`}
                onClick={() => void submit("again")}
              >
                {zh.againLabel}
              </LoadingButton>
              <LoadingButton
                type="button"
                variant="secondary"
                loading={submitting}
                loadingText={`${zh.hardLabel}...`}
                onClick={() => void submit("hard")}
              >
                {zh.hardLabel}
              </LoadingButton>
              <LoadingButton
                type="button"
                loading={submitting}
                loadingText={`${zh.goodLabel}...`}
                onClick={() => void submit("good")}
              >
                {zh.goodLabel}
              </LoadingButton>
            </div>
            <p className={APPLE_META_TEXT}>
              {zh.reviewStats} {current.reviewCount}，{zh.correct} {current.correctCount}，{zh.incorrect}{" "}
              {current.incorrectCount}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
