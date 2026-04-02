"use client";

import { useCallback, useMemo, useState } from "react";
import { clearAllReviewPageCache, setReviewPageCache } from "@/lib/cache/review-page-cache";
import { LoadingButton, LoadingContent } from "@/components/shared/action-loading";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { APPLE_BODY_TEXT, APPLE_META_TEXT } from "@/lib/ui/apple-style";
import {
  buildAcceptedPracticeAnswers,
  getPracticeAssessment,
  isPracticeAssessmentComplete,
} from "@/lib/shared/scene-practice-assessment";
import { PracticeMode } from "@/lib/types/learning-flow";
import {
  completeScenePracticeRunFromApi,
  markScenePracticeModeCompleteFromApi,
  recordScenePracticeAttemptFromApi,
  startScenePracticeRunFromApi,
} from "@/lib/utils/learning-api";
import {
  DueReviewItemResponse,
  DueScenePracticeReviewItemResponse,
} from "@/lib/utils/review-api";
import { submitPhraseReviewFromApi } from "@/lib/utils/review-api";
import { reviewPageLabels as zh } from "./review-page-labels";
import { buildReviewInlinePracticeSetId } from "./review-page-messages";
import {
  notifyInlinePracticeCompleted,
  notifyInlinePracticeFailed,
  notifyInlinePracticeMissingAnswer,
  notifyInlinePracticeMissingExpectedAnswer,
  notifyInlinePracticeRecorded,
  notifyPhraseReviewSubmitted,
  notifyReviewSubmitFailed,
} from "./review-page-notify";
import {
  buildFallbackExampleSentence,
  buildPhraseRewritePrompts,
  buildReviewProgressModel,
  buildReviewTaskStageMeta,
  getReviewSchedulingReason,
  PhraseRewritePrompt,
  resolveReviewHints,
  resolveReviewSourceLabel,
  ReviewTaskStage,
} from "./review-page-selectors";
import { ReviewPageStagePanel } from "./review-page-stage-panel";
import { ReviewPageSummaryCards } from "./review-page-summary-cards";
import { ReviewSummary, useReviewPageData } from "./use-review-page-data";
import { cn } from "@/lib/utils";

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
  const [phraseRecognition, setPhraseRecognition] = useState<"recognized" | "unknown" | null>(null);
  const [phraseOutputConfidence, setPhraseOutputConfidence] =
    useState<"high" | "low" | null>(null);
  const [phraseRewritePromptId, setPhraseRewritePromptId] =
    useState<PhraseRewritePrompt["id"]>("self");
  const [phraseRewriteDraft, setPhraseRewriteDraft] = useState("");
  const [phraseDraft, setPhraseDraft] = useState("");
  const [scenePracticeAnswer, setScenePracticeAnswer] = useState("");
  const [sceneFeedback, setSceneFeedback] = useState<{
    assessment: "incorrect" | "keyword" | "structure" | "complete";
    completed: boolean;
  } | null>(null);
  const resetTaskState = useCallback(() => {
    setTaskStage("recall");
    setShowReference(false);
    setPhraseRecognition(null);
    setPhraseOutputConfidence(null);
    setPhraseRewritePromptId("self");
    setPhraseRewriteDraft("");
    setPhraseDraft("");
    setScenePracticeAnswer("");
    setSceneFeedback(null);
  }, []);
  const { loadData } = useReviewPageData({
    setLoading,
    setItems,
    setScenePracticeItems,
    setSummary,
    setIsSessionReview,
    setSessionSource,
    onQueueHydrated: resetTaskState,
  });

  const currentScenePracticeItem = scenePracticeItems[0] ?? null;
  const currentPhraseItem = items[0] ?? null;
  const activeTaskKind = currentScenePracticeItem
    ? "scene_practice"
    : currentPhraseItem
      ? "phrase_review"
      : null;
  const phraseRewritePrompts = useMemo(() => buildPhraseRewritePrompts(), []);

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
    ? currentPhraseItem.sourceSentenceText?.trim() ||
      buildFallbackExampleSentence(currentPhraseItem.text)
    : "";
  const currentRewritePrompt =
    phraseRewritePrompts.find((prompt) => prompt.id === phraseRewritePromptId) ??
    phraseRewritePrompts[0];
  const currentPhraseSchedulingReason = currentPhraseItem
    ? getReviewSchedulingReason(currentPhraseItem)
    : null;
  const phraseCanContinueFromConfidence =
    phraseRecognition != null && phraseOutputConfidence != null;
  const phraseCanContinueFromRewrite = phraseRewriteDraft.trim().length > 0;
  const phraseCanContinueFromPractice = phraseDraft.trim().length > 0;
  const footerPrimaryButtonClassName = buttonVariants({
    className: "h-14 rounded-full text-base",
  });
  const footerSecondaryButtonClassName = buttonVariants({
    variant: "secondary",
    className: "w-full",
  });
  const footerDangerButtonClassName = buttonVariants({
    variant: "destructive",
    className: "w-full",
  });

  const refreshAfterScenePractice = useCallback(async () => {
    resetTaskState();
    await clearAllReviewPageCache();
    await loadData({ preferCache: false });
  }, [loadData, resetTaskState]);

  const submitPhraseReview = async (result: "again" | "hard" | "good") => {
    if (!currentPhraseItem || submitting) return;
    setSubmitting(true);
    try {
      const response = await submitPhraseReviewFromApi({
        userPhraseId: currentPhraseItem.userPhraseId,
        reviewResult: result,
        source: "review_page",
        recognitionState:
          phraseRecognition === "recognized"
            ? "recognized"
            : phraseRecognition === "unknown"
              ? "unknown"
              : undefined,
        outputConfidence:
          phraseOutputConfidence === "high"
            ? "high"
            : phraseOutputConfidence === "low"
              ? "low"
              : undefined,
        fullOutputStatus: phraseDraft.trim() ? "completed" : "not_started",
      });
      const nextItems = items.filter((item) => item.userPhraseId !== currentPhraseItem.userPhraseId);
      resetTaskState();
      setItems(nextItems);
      setSummary(response.summary);
      void setReviewPageCache(
        {
          rows: nextItems,
          total: Math.max(response.summary.dueReviewCount, nextItems.length),
          summary: response.summary,
        },
        20,
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
          <ReviewPageSummaryCards
            dueCount={progressModel.dueReviewCount + scenePracticeItems.length}
            reviewedTodayCount={progressModel.reviewedTodayCount}
            accuracyText={progressModel.accuracyText}
            loading={loading}
            dueLabel={zh.dueNow}
            doneLabel={zh.doneToday}
            accuracyLabel={zh.accuracy}
          />
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

      <ReviewPageStagePanel
        loading={loading}
        activeTaskKind={activeTaskKind}
        stageMeta={stageMeta}
        trainingHintSubtle={trainingHintSubtle}
        currentScenePracticeItem={currentScenePracticeItem}
        currentPhraseItem={currentPhraseItem}
        currentPhraseSchedulingReason={currentPhraseSchedulingReason}
        currentPhraseExampleSentence={currentPhraseExampleSentence}
        currentRewritePrompt={currentRewritePrompt}
        phraseRewritePrompts={phraseRewritePrompts}
        phraseRewritePromptId={phraseRewritePromptId}
        phraseRewriteDraft={phraseRewriteDraft}
        phraseDraft={phraseDraft}
        phraseRecognition={phraseRecognition}
        phraseOutputConfidence={phraseOutputConfidence}
        scenePracticeAnswer={scenePracticeAnswer}
        sceneFeedback={sceneFeedback}
        showReference={showReference}
        taskStage={taskStage}
        labels={zh}
        setShowReference={setShowReference}
        setPhraseRecognition={setPhraseRecognition}
        setPhraseOutputConfidence={setPhraseOutputConfidence}
        setPhraseRewritePromptId={setPhraseRewritePromptId}
        setPhraseRewriteDraft={setPhraseRewriteDraft}
        setPhraseDraft={setPhraseDraft}
        setScenePracticeAnswer={setScenePracticeAnswer}
      />

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
          {currentPhraseItem.sourceSceneAvailable ? (
            <LoadingButton
              type="button"
              variant="outline"
              loading={openingSceneHref === `/scene/${currentPhraseItem.sourceSceneSlug}`}
              loadingText="进入场景中..."
              onClick={() => openScene(`/scene/${currentPhraseItem.sourceSceneSlug}`)}
            >
              {zh.openSourceScene}
            </LoadingButton>
          ) : (
            <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              <p className="font-medium">{zh.sourceSceneUnavailable}</p>
              <p className="text-xs text-amber-600">{zh.sourceSceneUnavailableHint}</p>
            </div>
          )}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {activeTaskKind === "phrase_review" && taskStage === "feedback" ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={footerDangerButtonClassName}
                disabled={submitting}
                onClick={() => void submitPhraseReview("again")}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.againLabel}...`}>
                  {zh.againLabel}
                </LoadingContent>
              </button>
              <button
                type="button"
                className={footerSecondaryButtonClassName}
                disabled={submitting}
                onClick={() => void submitPhraseReview("hard")}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.hardLabel}...`}>
                  {zh.hardLabel}
                </LoadingContent>
              </button>
              <button
                type="button"
                className={cn(footerPrimaryButtonClassName, "w-full")}
                disabled={submitting}
                onClick={() => void submitPhraseReview("good")}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.goodLabel}...`}>
                  {zh.goodLabel}
                </LoadingContent>
              </button>
            </div>
          ) : null}

          {activeTaskKind === "scene_practice" ? (
            taskStage === "recall" ? (
              <button
                type="button"
                className={footerPrimaryButtonClassName}
                onClick={() => setTaskStage("practice")}
              >
                {zh.sceneRecallCta}
              </button>
            ) : taskStage === "practice" ? (
              <button
                type="button"
                className={footerPrimaryButtonClassName}
                disabled={submitting}
                onClick={() => void submitScenePractice()}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.practiceCheck}...`}>
                  {zh.practiceCheck}
                </LoadingContent>
              </button>
            ) : (
              <button
                type="button"
                className={footerPrimaryButtonClassName}
                disabled={submitting}
                onClick={() => void refreshAfterScenePractice()}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.sceneNextCta}...`}>
                  {sceneFeedback?.completed ? zh.sceneNextCta : zh.sceneRetryCta}
                </LoadingContent>
              </button>
            )
          ) : taskStage === "recall" ? (
            <button
              type="button"
              className={footerPrimaryButtonClassName}
              onClick={() => {
                setShowReference(true);
                setTaskStage("confidence");
              }}
            >
              {zh.phraseConfidenceCta}
            </button>
          ) : taskStage === "confidence" ? (
            <button
              type="button"
              className={footerPrimaryButtonClassName}
              disabled={!phraseCanContinueFromConfidence}
              onClick={() => setTaskStage("rewrite")}
            >
              {zh.phraseRewriteCta}
            </button>
          ) : taskStage === "rewrite" ? (
            <button
              type="button"
              className={footerPrimaryButtonClassName}
              disabled={!phraseCanContinueFromRewrite}
              onClick={() => setTaskStage("practice")}
            >
              {zh.phraseOutputCta}
            </button>
          ) : taskStage === "practice" ? (
            <button
              type="button"
              className={footerPrimaryButtonClassName}
              disabled={!phraseCanContinueFromPractice}
              onClick={() => setTaskStage("feedback")}
            >
              {zh.phraseFeedbackCta}
            </button>
          ) : (
            <div className="rounded-full px-4 py-3 text-center text-sm text-[var(--muted-foreground)]">
              选择一个复习判断后会自动进入下一项。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
