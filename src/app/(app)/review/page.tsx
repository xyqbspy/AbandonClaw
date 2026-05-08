"use client";

import { useCallback, useMemo, useState } from "react";
import { clearAllReviewPageCache, setReviewPageCache } from "@/lib/cache/review-page-cache";
import { LoadingButton, LoadingContent } from "@/components/shared/action-loading";
import { PageHeader } from "@/components/shared/page-header";
import { recordClientEvent } from "@/lib/utils/client-events";
import { APPLE_BODY_TEXT } from "@/lib/ui/apple-style";
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
import {
  REVIEW_FOOTER_CLASSNAME,
  REVIEW_FOOTER_DANGER_BUTTON_CLASSNAME,
  REVIEW_FOOTER_INNER_CLASSNAME,
  REVIEW_FOOTER_MUTED_TEXT_CLASSNAME,
  REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME,
  REVIEW_FOOTER_PRIMARY_FULL_BUTTON_CLASSNAME,
  REVIEW_FOOTER_REVIEW_GRID_CLASSNAME,
  REVIEW_FOOTER_SECONDARY_BUTTON_CLASSNAME,
  REVIEW_HERO_BODY_CLASSNAME,
  REVIEW_HERO_CLASSNAME,
  REVIEW_HERO_HEADER_CLASSNAME,
  REVIEW_HERO_STREAK_PILL_CLASSNAME,
  REVIEW_HINT_SOURCE_CLASSNAME,
  REVIEW_HINT_STACK_CLASSNAME,
  REVIEW_PAGE_CLASSNAME,
  REVIEW_PROGRESS_FILL_CLASSNAME,
  REVIEW_PROGRESS_HEADER_CLASSNAME,
  REVIEW_PROGRESS_TRACK_CLASSNAME,
  REVIEW_SOURCE_ACTIONS_CLASSNAME,
  REVIEW_SOURCE_ACTIONS_LABEL_CLASSNAME,
  REVIEW_SOURCE_UNAVAILABLE_CLASSNAME,
  REVIEW_SOURCE_UNAVAILABLE_HINT_CLASSNAME,
} from "./review-page-styles";
import { ReviewSummary, useReviewPageData } from "./use-review-page-data";

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
  const phraseVariantRewriteStatus = phraseRewriteDraft.trim() ? "completed" : "not_started";
  const phraseFullOutputStatus = phraseDraft.trim() ? "completed" : "not_started";

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
        fullOutputStatus: phraseFullOutputStatus,
        variantRewriteStatus: phraseVariantRewriteStatus,
        variantRewritePromptId:
          phraseVariantRewriteStatus === "completed" ? phraseRewritePromptId : undefined,
        fullOutputText: phraseDraft,
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
      recordClientEvent("review_submitted", {
        userPhraseId: currentPhraseItem.userPhraseId,
        reviewResult: result,
        dueReviewCount: response.summary.dueReviewCount,
        reviewedTodayCount: response.summary.reviewedTodayCount,
        recognitionState: phraseRecognition,
        outputConfidence: phraseOutputConfidence,
        fullOutputStatus: phraseFullOutputStatus,
        variantRewriteStatus: phraseVariantRewriteStatus,
        variantRewritePromptId:
          phraseVariantRewriteStatus === "completed" ? phraseRewritePromptId : null,
      });
      notifyPhraseReviewSubmitted(zh, response.summary);
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
      const practiceSetId = currentScenePracticeItem.practiceSetId?.trim();
      if (!practiceSetId) {
        notifyInlinePracticeFailed("这条回补练习缺少题目来源，请回到原场景重新练习。");
        return;
      }

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
    <div className={REVIEW_PAGE_CLASSNAME}>
      <section className={REVIEW_HERO_CLASSNAME}>
        <div className={REVIEW_HERO_HEADER_CLASSNAME}>
          <span className={REVIEW_HERO_STREAK_PILL_CLASSNAME}>
            {zh.streakSummary}
          </span>
        </div>
        <PageHeader eyebrow={zh.eyebrow} title={zh.title} description={zh.desc} />
        <div className={REVIEW_HERO_BODY_CLASSNAME}>
          <div>
            <div className={REVIEW_PROGRESS_HEADER_CLASSNAME}>
              <span>{zh.progressLabel}</span>
              <span>
                {progressModel.completedCount}/{Math.max(progressModel.totalCount, 1)}
              </span>
            </div>
            <div className={REVIEW_PROGRESS_TRACK_CLASSNAME}>
              <div
                className={REVIEW_PROGRESS_FILL_CLASSNAME}
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

      <div className={REVIEW_HINT_STACK_CLASSNAME}>
        <p className={APPLE_BODY_TEXT}>{primaryHint}</p>
        {sourceLabel ? (
          <p className={REVIEW_HINT_SOURCE_CLASSNAME}>
            {zh.sourcePrefix}：{sourceLabel}
          </p>
        ) : null}
      </div>

      <ReviewPageStagePanel
        loading={loading}
        activeTaskKind={activeTaskKind}
        stageMeta={stageMeta}
        summary={summary}
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
        <div className={REVIEW_SOURCE_ACTIONS_CLASSNAME}>
          <p className={REVIEW_SOURCE_ACTIONS_LABEL_CLASSNAME}>辅助回看</p>
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
        <div className={REVIEW_SOURCE_ACTIONS_CLASSNAME}>
          <p className={REVIEW_SOURCE_ACTIONS_LABEL_CLASSNAME}>辅助回看</p>
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
            <div className={REVIEW_SOURCE_UNAVAILABLE_CLASSNAME}>
              <p className="font-medium">{zh.sourceSceneUnavailable}</p>
              <p className={REVIEW_SOURCE_UNAVAILABLE_HINT_CLASSNAME}>{zh.sourceSceneUnavailableHint}</p>
            </div>
          )}
        </div>
      ) : null}

      <div className={REVIEW_FOOTER_CLASSNAME}>
        <div className={REVIEW_FOOTER_INNER_CLASSNAME}>
          {activeTaskKind === null ? (
            <LoadingButton
              type="button"
              className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
              loading={openingSceneHref === "/today"}
              loadingText="返回今日学习中..."
              onClick={() => openScene("/today")}
            >
              {zh.queueDoneReturnCta}
            </LoadingButton>
          ) : activeTaskKind === "phrase_review" && taskStage === "feedback" ? (
            <div className={REVIEW_FOOTER_REVIEW_GRID_CLASSNAME}>
              <button
                type="button"
                className={REVIEW_FOOTER_DANGER_BUTTON_CLASSNAME}
                disabled={submitting}
                onClick={() => void submitPhraseReview("again")}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.againLabel}...`}>
                  {zh.againLabel}
                </LoadingContent>
              </button>
              <button
                type="button"
                className={REVIEW_FOOTER_SECONDARY_BUTTON_CLASSNAME}
                disabled={submitting}
                onClick={() => void submitPhraseReview("hard")}
              >
                <LoadingContent loading={submitting} loadingText={`${zh.hardLabel}...`}>
                  {zh.hardLabel}
                </LoadingContent>
              </button>
              <button
                type="button"
                className={REVIEW_FOOTER_PRIMARY_FULL_BUTTON_CLASSNAME}
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
                className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
                onClick={() => setTaskStage("practice")}
              >
                {zh.sceneRecallCta}
              </button>
            ) : taskStage === "practice" ? (
              <button
                type="button"
                className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
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
                className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
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
              className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
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
              className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
              disabled={!phraseCanContinueFromConfidence}
              onClick={() => setTaskStage("rewrite")}
            >
              {zh.phraseRewriteCta}
            </button>
          ) : taskStage === "rewrite" ? (
            <button
              type="button"
              className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
              disabled={!phraseCanContinueFromRewrite}
              onClick={() => setTaskStage("practice")}
            >
              {zh.phraseOutputCta}
            </button>
          ) : taskStage === "practice" ? (
            <button
              type="button"
              className={REVIEW_FOOTER_PRIMARY_BUTTON_CLASSNAME}
              disabled={!phraseCanContinueFromPractice}
              onClick={() => setTaskStage("feedback")}
            >
              {zh.phraseFeedbackCta}
            </button>
          ) : (
            <div className={REVIEW_FOOTER_MUTED_TEXT_CLASSNAME}>
              选择一个复习判断后会自动进入下一项。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
