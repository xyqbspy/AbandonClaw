"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearAllReviewPageCache,
  getReviewPageCache,
  setReviewPageCache,
} from "@/lib/cache/review-page-cache";
import { LoadingButton, LoadingState } from "@/components/shared/action-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  APPLE_BODY_TEXT,
  APPLE_INPUT_PANEL,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";
import {
  buildAcceptedPracticeAnswers,
  getPracticeAssessment,
  isPracticeAssessmentComplete,
} from "@/lib/shared/scene-practice-assessment";
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
  DueReviewItemResponse,
  DueScenePracticeReviewItemResponse,
  getDueReviewItemsFromApi,
  getReviewSummaryFromApi,
  submitPhraseReviewFromApi,
} from "@/lib/utils/review-api";
import { cn } from "@/lib/utils";
import { reviewPageLabels as zh } from "./review-page-labels";
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
import {
  buildFallbackExampleSentence,
  buildReviewProgressModel,
  buildReviewTaskStageMeta,
  buildScenePracticeReviewItemKey,
  mergePrioritizedReviewItems,
  resolveReviewHints,
  resolveReviewSourceLabel,
  ReviewTaskStage,
} from "./review-page-selectors";

const REVIEW_LIMIT = 20;

const normalizePathname = (pathname?: string | null) => {
  if (typeof pathname !== "string") return "/";
  return pathname.replace(/\/+$/, "") || "/";
};

const stagePanelClassName = "rounded-[24px] border border-[var(--app-border-soft)] bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]";

type ReviewSummary = {
  dueReviewCount: number;
  reviewedTodayCount: number;
  reviewAccuracy: number | null;
  masteredPhraseCount: number;
};

type SceneFeedbackState = {
  assessment: PracticeAssessmentLevel;
  completed: boolean;
};

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<DueReviewItemResponse[]>([]);
  const [scenePracticeItems, setScenePracticeItems] = useState<DueScenePracticeReviewItemResponse[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [isSessionReview, setIsSessionReview] = useState(false);
  const [sessionSource, setSessionSource] = useState<string | null>(null);
  const [openingSceneHref, setOpeningSceneHref] = useState<string | null>(null);
  const [taskStage, setTaskStage] = useState<ReviewTaskStage>("recall");
  const [showReference, setShowReference] = useState(false);
  const [phraseDraft, setPhraseDraft] = useState("");
  const [scenePracticeAnswer, setScenePracticeAnswer] = useState("");
  const [sceneFeedback, setSceneFeedback] = useState<SceneFeedbackState | null>(null);
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
          const nextRows =
            prioritizedIds.length > 0
              ? mergePrioritizedReviewItems({
                  prioritizedIds,
                  dueRows: cachedRows,
                  phraseRows: [],
                })
              : cachedRows;
          setItems(nextRows);
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

      const nextRows =
        prioritizedIds.length > 0
          ? mergePrioritizedReviewItems({
              prioritizedIds,
              dueRows: due.rows,
              phraseRows: phraseList?.rows ?? [],
            })
          : due.rows;

      setItems(nextRows);
      setScenePracticeItems(due.scenePracticeRows ?? []);
      setSummary(nextSummary);
      void setReviewPageCache(
        {
          rows: due.rows,
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

  const currentScenePracticeItem = scenePracticeItems[0] ?? null;
  const currentPhraseItem = items[0] ?? null;
  const activeTaskKind = currentScenePracticeItem ? "scene_practice" : currentPhraseItem ? "phrase_review" : null;
  const activeTaskKey =
    currentScenePracticeItem != null
      ? `scene:${buildScenePracticeReviewItemKey(currentScenePracticeItem)}`
      : currentPhraseItem != null
        ? `phrase:${currentPhraseItem.userPhraseId}`
        : "empty";

  useEffect(() => {
    setTaskStage("recall");
    setShowReference(false);
    setPhraseDraft("");
    setScenePracticeAnswer("");
    setSceneFeedback(null);
  }, [activeTaskKey]);

  const progressModel = useMemo(
    () =>
      buildReviewProgressModel({
        summary,
        scenePracticeCount: scenePracticeItems.length,
      }),
    [scenePracticeItems.length, summary],
  );
  const stageMeta =
    activeTaskKind == null
      ? null
      : buildReviewTaskStageMeta({
          taskKind: activeTaskKind,
          stage: taskStage,
        });
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

  const currentPhraseExampleSentence = currentPhraseItem
    ? currentPhraseItem.sourceSentenceText?.trim() || buildFallbackExampleSentence(currentPhraseItem.text)
    : "";

  const refreshAfterScenePractice = useCallback(async () => {
    await clearAllReviewPageCache();
    await loadData({ preferCache: false });
  }, [loadData]);

  const submitPhraseReview = async (result: "again" | "hard" | "good") => {
    if (!currentPhraseItem || submitting) return;
    setSubmitting(true);
    try {
      const response = await submitPhraseReviewFromApi({
        userPhraseId: currentPhraseItem.userPhraseId,
        reviewResult: result,
        source: "review_page",
      });
      const nextItems = items.filter((item) => item.userPhraseId !== currentPhraseItem.userPhraseId);
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

  const submitScenePractice = async () => {
    if (!currentScenePracticeItem || submitting) return;
    const answer = scenePracticeAnswer.trim();
    if (!answer) {
      notifyInlinePracticeMissingAnswer(zh);
      return;
    }

    const expectedAnswer = currentScenePracticeItem.expectedAnswer?.trim() ?? "";
    if (!expectedAnswer) {
      notifyInlinePracticeMissingExpectedAnswer(zh);
      return;
    }

    setSubmitting(true);
    try {
      const assessment = getPracticeAssessment({
        mode: currentScenePracticeItem.recommendedMode as PracticeMode,
        expected: expectedAnswer,
        answer,
        acceptedAnswers: buildAcceptedPracticeAnswers(expectedAnswer),
      });
      const practiceSetId = buildReviewInlinePracticeSetId(currentScenePracticeItem);

      await startScenePracticeRunFromApi(currentScenePracticeItem.sceneSlug, {
        practiceSetId,
        mode: currentScenePracticeItem.recommendedMode,
        sourceType: "original",
      });
      await recordScenePracticeAttemptFromApi(currentScenePracticeItem.sceneSlug, {
        practiceSetId,
        mode: currentScenePracticeItem.recommendedMode,
        sourceType: "original",
        exerciseId: currentScenePracticeItem.exerciseId,
        sentenceId: currentScenePracticeItem.sentenceId,
        userAnswer: answer,
        assessmentLevel: assessment,
        isCorrect: isPracticeAssessmentComplete(assessment),
        metadata: {
          prompt: currentScenePracticeItem.promptText,
          displayText: currentScenePracticeItem.displayText,
          expectedAnswer,
          hint: currentScenePracticeItem.hint,
          reviewSourceMode: currentScenePracticeItem.sourceMode,
          reviewRecommendedMode: currentScenePracticeItem.recommendedMode,
          reviewInline: true,
        },
      });

      if (isPracticeAssessmentComplete(assessment)) {
        await markScenePracticeModeCompleteFromApi(currentScenePracticeItem.sceneSlug, {
          practiceSetId,
          mode: currentScenePracticeItem.recommendedMode,
        });
        await completeScenePracticeRunFromApi(currentScenePracticeItem.sceneSlug, {
          practiceSetId,
        });
        notifyInlinePracticeCompleted(zh);
      } else {
        notifyInlinePracticeRecorded(zh);
      }

      setSceneFeedback({
        assessment,
        completed: isPracticeAssessmentComplete(assessment),
      });
      setTaskStage("feedback");
    } catch (error) {
      notifyInlinePracticeFailed(error instanceof Error ? error.message : zh.practiceInlineFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const openScene = (href: string) => {
    if (!href || openingSceneHref === href) return;
    setOpeningSceneHref(href);
    window.location.assign(href);
  };

  const renderSummaryCards = () => (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-[18px] bg-white/88 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
        <p className={APPLE_META_TEXT}>{zh.dueNow}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">
          {loading ? "..." : progressModel.dueReviewCount + scenePracticeItems.length}
        </p>
      </div>
      <div className="rounded-[18px] bg-white/88 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
        <p className={APPLE_META_TEXT}>{zh.doneToday}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">
          {loading ? "..." : progressModel.reviewedTodayCount}
        </p>
      </div>
      <div className="rounded-[18px] bg-white/88 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
        <p className={APPLE_META_TEXT}>{zh.accuracy}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">
          {loading ? "..." : progressModel.accuracyText}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-28">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#eef5ff_0%,#f8fafc_72%,#ffffff_100%)] p-5 shadow-[0_22px_60px_rgba(37,99,235,0.12)] ring-1 ring-sky-100">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {zh.streakSummary}
          </span>
        </div>
        <PageHeader eyebrow={zh.eyebrow} title={zh.title} description={zh.desc} />
        <div className="mt-5 space-y-4">
          <div>
            <div className={`mb-2 flex items-center justify-between text-xs ${APPLE_META_TEXT}`}>
              <span>{zh.progressLabel}</span>
              <span>
                {progressModel.completedCount}/{Math.max(progressModel.totalCount, 1)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#2563eb)] transition-all"
                style={{ width: `${progressModel.progressPercent}%` }}
              />
            </div>
          </div>
          {renderSummaryCards()}
        </div>
      </section>

      <div className="space-y-2">
        <p className={APPLE_BODY_TEXT}>{primaryHint}</p>
        {sourceLabel ? (
          <p className={`text-xs ${APPLE_META_TEXT}`}>
            {zh.sourcePrefix}：{sourceLabel}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className={stagePanelClassName}>
          <LoadingState text={zh.queueLoading} />
        </div>
      ) : activeTaskKind == null || stageMeta == null ? (
        <Card className={APPLE_PANEL_RAISED}>
          <CardContent className="py-10">
            <p className={`text-center ${APPLE_META_TEXT}`}>{zh.queueEmpty}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className={stagePanelClassName}>
            <div className="mb-4 inline-flex rounded-xl bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
              {stageMeta.stepTag}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{stageMeta.title}</h2>
            <p className={`mt-2 ${APPLE_META_TEXT}`}>{trainingHintSubtle}</p>

            {activeTaskKind === "scene_practice" && currentScenePracticeItem ? (
              <div className="mt-6 space-y-4">
                <div className={`rounded-[20px] p-4 ${APPLE_PANEL}`}>
                  <p className={APPLE_META_TEXT}>{zh.sceneScenarioLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {currentScenePracticeItem.sceneTitle}
                  </p>
                  {currentScenePracticeItem.displayText ? (
                    <p className="mt-3 text-base leading-7 text-foreground">
                      {currentScenePracticeItem.displayText}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={APPLE_META_TEXT}>{zh.practiceModePrefix}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        getReviewModeAccentClassName(
                          currentScenePracticeItem.recommendedMode as PracticeMode,
                        ),
                      )}
                    >
                      {reviewModeLabelMap[currentScenePracticeItem.recommendedMode]}
                    </span>
                  </div>
                  {currentScenePracticeItem.promptText ? (
                    <div className="mt-3">
                      <p className={APPLE_META_TEXT}>{zh.scenePromptLabel}</p>
                      <p className="mt-1 text-sm text-foreground">
                        {currentScenePracticeItem.promptText}
                      </p>
                    </div>
                  ) : null}
                  {currentScenePracticeItem.hint ? (
                    <div className="mt-3">
                      <p className={APPLE_META_TEXT}>{zh.sceneHintLabel}</p>
                      <p className="mt-1 text-sm text-foreground">{currentScenePracticeItem.hint}</p>
                    </div>
                  ) : null}
                  {taskStage !== "practice" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-4 h-auto px-0 text-sm font-medium text-slate-600"
                      onClick={() => setShowReference((prev) => !prev)}
                    >
                      {showReference ? zh.hideReference : zh.showReference}
                    </Button>
                  ) : null}
                  {showReference && currentScenePracticeItem.expectedAnswer ? (
                    <div className="mt-3 rounded-[18px] bg-white p-4 shadow-sm">
                      <p className={APPLE_META_TEXT}>{zh.sceneExpectedLabel}</p>
                      <p className="mt-1 text-base font-medium text-foreground">
                        {currentScenePracticeItem.expectedAnswer}
                      </p>
                    </div>
                  ) : null}
                </div>

                {taskStage === "practice" ? (
                  <div className={`rounded-[20px] p-4 ${APPLE_PANEL}`}>
                    <p className={APPLE_META_TEXT}>{zh.scenePracticeLabel}</p>
                    {currentScenePracticeItem.recommendedMode === "full_dictation" ? (
                      <textarea
                        className={`mt-3 min-h-28 w-full px-4 py-3 text-sm ${APPLE_INPUT_PANEL}`}
                        placeholder={getInlinePracticePlaceholder(
                          currentScenePracticeItem.recommendedMode as PracticeMode,
                          zh,
                        )}
                        value={scenePracticeAnswer}
                        onChange={(event) => setScenePracticeAnswer(event.target.value)}
                      />
                    ) : (
                      <input
                        className={`mt-3 h-12 w-full px-4 text-sm ${APPLE_INPUT_PANEL}`}
                        placeholder={getInlinePracticePlaceholder(
                          currentScenePracticeItem.recommendedMode as PracticeMode,
                          zh,
                        )}
                        value={scenePracticeAnswer}
                        onChange={(event) => setScenePracticeAnswer(event.target.value)}
                      />
                    )}
                  </div>
                ) : null}

                {taskStage === "feedback" && sceneFeedback ? (
                  <div className="space-y-4">
                    <div className={`rounded-[20px] p-4 ${APPLE_PANEL}`}>
                      <p className={APPLE_META_TEXT}>{zh.sceneFeedbackLabel}</p>
                      <p
                        className={cn(
                          "mt-2 text-base font-medium",
                          sceneFeedback.assessment === "complete"
                            ? "text-emerald-600"
                            : sceneFeedback.assessment === "structure"
                              ? "text-sky-700"
                              : sceneFeedback.assessment === "keyword"
                                ? "text-amber-700"
                                : "text-rose-600",
                        )}
                      >
                        {getInlinePracticeFeedback(sceneFeedback.assessment, zh)}
                      </p>
                      <p className={`mt-3 ${APPLE_META_TEXT}`}>
                        当前记录：
                        {sceneFeedback.assessment === "complete"
                          ? " 已达到整句完成"
                          : ` ${assessmentLabelMap[
                              sceneFeedback.assessment as keyof typeof assessmentLabelMap
                            ] ?? sceneFeedback.assessment}`}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{zh.sceneTodoTitle}</p>
                      <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{zh.sceneTodoBody}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : currentPhraseItem ? (
              <div className="mt-6 space-y-4">
                <div className={`rounded-[20px] p-4 ${APPLE_PANEL}`}>
                  <p className={APPLE_META_TEXT}>{zh.phraseScenarioLabel}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{currentPhraseItem.text}</p>
                  <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>
                    {currentPhraseItem.translation ?? zh.noTranslation}
                  </p>
                </div>

                <div className="rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">{zh.activeRecallHint}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-4 h-auto px-0 text-sm font-medium text-slate-600"
                    onClick={() => setShowReference((prev) => !prev)}
                  >
                    {showReference ? zh.hideReference : zh.showReference}
                  </Button>
                  {showReference ? (
                    <div className="mt-3 rounded-[18px] bg-white p-4 shadow-sm">
                      <p className={APPLE_META_TEXT}>{zh.phraseReferenceLabel}</p>
                      <p className={`mt-1 ${APPLE_BODY_TEXT}`}>{currentPhraseExampleSentence}</p>
                      {currentPhraseItem.usageNote ? (
                        <p className={`mt-2 ${APPLE_META_TEXT}`}>{currentPhraseItem.usageNote}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className={`mt-3 text-sm ${APPLE_META_TEXT}`}>{zh.phraseReferenceHint}</p>
                  )}
                </div>

                {taskStage === "practice" ? (
                  <div className={`rounded-[20px] p-4 ${APPLE_PANEL}`}>
                    <p className={APPLE_META_TEXT}>{zh.phraseDraftLabel}</p>
                    <textarea
                      className={`mt-3 min-h-28 w-full px-4 py-3 text-sm ${APPLE_INPUT_PANEL}`}
                      placeholder={zh.phraseDraftPlaceholder}
                      value={phraseDraft}
                      onChange={(event) => setPhraseDraft(event.target.value)}
                    />
                  </div>
                ) : null}

                {taskStage === "feedback" ? (
                  <div className="space-y-4">
                    <div className={`rounded-[20px] p-4 ${APPLE_PANEL}`}>
                      <p className={APPLE_META_TEXT}>{zh.phraseFeedbackLabel}</p>
                      <p className="mt-2 text-sm text-slate-700">{zh.phraseScoringHint}</p>
                      <p className={`mt-3 text-sm ${APPLE_META_TEXT}`}>
                        {zh.reviewStats} {currentPhraseItem.reviewCount}，{zh.correct}{" "}
                        {currentPhraseItem.correctCount}，{zh.incorrect} {currentPhraseItem.incorrectCount}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{zh.phraseFeedbackTodoTitle}</p>
                      <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{zh.phraseFeedbackTodoBody}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {activeTaskKind === "scene_practice" && currentScenePracticeItem ? (
            <div className="flex flex-wrap gap-3">
              <LoadingButton
                type="button"
                variant="outline"
                loading={openingSceneHref === `/scene/${currentScenePracticeItem.sceneSlug}`}
                loadingText="进入场景中..."
                onClick={() => openScene(`/scene/${currentScenePracticeItem.sceneSlug}`)}
              >
                {zh.openSourceScene}
              </LoadingButton>
              <LoadingButton
                type="button"
                variant="outline"
                loading={openingSceneHref === `/scene/${currentScenePracticeItem.sceneSlug}?view=practice`}
                loadingText="进入场景中..."
                onClick={() => openScene(`/scene/${currentScenePracticeItem.sceneSlug}?view=practice`)}
              >
                {zh.openScenePractice}
              </LoadingButton>
            </div>
          ) : currentPhraseItem?.sourceSceneSlug ? (
            <div className="flex flex-wrap gap-3">
              <LoadingButton
                type="button"
                variant="outline"
                loading={openingSceneHref === `/scene/${currentPhraseItem.sourceSceneSlug}`}
                loadingText="进入场景中..."
                onClick={() => openScene(`/scene/${currentPhraseItem.sourceSceneSlug}`)}
              >
                {zh.openSourceScene}
              </LoadingButton>
            </div>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {activeTaskKind === "phrase_review" && taskStage === "feedback" ? (
                <div className="grid grid-cols-3 gap-2">
                  <LoadingButton
                    type="button"
                    variant="destructive"
                    loading={submitting}
                    loadingText={`${zh.againLabel}...`}
                    onClick={() => void submitPhraseReview("again")}
                  >
                    {zh.againLabel}
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    variant="secondary"
                    loading={submitting}
                    loadingText={`${zh.hardLabel}...`}
                    onClick={() => void submitPhraseReview("hard")}
                  >
                    {zh.hardLabel}
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    loading={submitting}
                    loadingText={`${zh.goodLabel}...`}
                    onClick={() => void submitPhraseReview("good")}
                  >
                    {zh.goodLabel}
                  </LoadingButton>
                </div>
              ) : null}

              {activeTaskKind === "scene_practice" ? (
                taskStage === "recall" ? (
                  <LoadingButton type="button" className="h-14 rounded-full text-base" onClick={() => setTaskStage("practice")}>
                    {zh.sceneRecallCta}
                  </LoadingButton>
                ) : taskStage === "practice" ? (
                  <LoadingButton
                    type="button"
                    className="h-14 rounded-full text-base"
                    loading={submitting}
                    loadingText={`${zh.practiceCheck}...`}
                    onClick={() => void submitScenePractice()}
                  >
                    {zh.practiceCheck}
                  </LoadingButton>
                ) : (
                  <LoadingButton
                    type="button"
                    className="h-14 rounded-full text-base"
                    loading={submitting}
                    loadingText={`${zh.sceneNextCta}...`}
                    onClick={() => void refreshAfterScenePractice()}
                  >
                    {sceneFeedback?.completed ? zh.sceneNextCta : zh.sceneRetryCta}
                  </LoadingButton>
                )
              ) : taskStage === "recall" ? (
                <LoadingButton
                  type="button"
                  className="h-14 rounded-full text-base"
                  onClick={() => {
                    setShowReference(true);
                    setTaskStage("practice");
                  }}
                >
                  {zh.phraseRevealCta}
                </LoadingButton>
              ) : taskStage === "practice" ? (
                <LoadingButton
                  type="button"
                  className="h-14 rounded-full text-base"
                  onClick={() => setTaskStage("feedback")}
                >
                  {zh.phraseFeedbackCta}
                </LoadingButton>
              ) : (
                <div className={`rounded-full px-4 py-3 text-center text-sm ${APPLE_META_TEXT}`}>
                  选择一个复习判断后会自动进入下一项。
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
