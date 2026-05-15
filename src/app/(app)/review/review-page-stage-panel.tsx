"use client";

import React from "react";
import { LoadingState } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APPLE_BODY_TEXT, APPLE_INPUT_PANEL, APPLE_META_TEXT, APPLE_PANEL_RAISED } from "@/lib/ui/apple-style";
import { PracticeMode } from "@/lib/types/learning-flow";
import { DueReviewItemResponse, DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";
import { cn } from "@/lib/utils";
import { ReviewPageLabels } from "./review-page-labels";
import { assessmentLabelMap, getInlinePracticeFeedback, getInlinePracticePlaceholder, getReviewModeAccentClassName, reviewModeLabelMap } from "./review-page-messages";
import { PhraseRewritePrompt, ReviewTaskStage } from "./review-page-selectors";
import {
  REVIEW_STAGE_BLOCK_CLASSNAME,
  REVIEW_STAGE_DASHED_BLOCK_CLASSNAME,
  REVIEW_STAGE_FEEDBACK_PILL_INFO_CLASSNAME,
  REVIEW_STAGE_FEEDBACK_PILL_SUBTLE_CLASSNAME,
  REVIEW_STAGE_FEEDBACK_PILL_SUCCESS_CLASSNAME,
  REVIEW_STAGE_FEEDBACK_PILL_WARNING_CLASSNAME,
  REVIEW_STAGE_FEEDBACK_SCORING_HINT_CLASSNAME,
  REVIEW_STAGE_FIELD_LABEL_CLASSNAME,
  REVIEW_STAGE_FIELD_LABEL_SPACED_CLASSNAME,
  REVIEW_STAGE_HEADER_CLASSNAME,
  REVIEW_STAGE_HEADER_TOP_CLASSNAME,
  REVIEW_STAGE_MODE_PILL_CLASSNAME,
  REVIEW_STAGE_PANEL_CLASSNAME,
  REVIEW_STAGE_PHRASE_EXPRESSION_CLASSNAME,
  REVIEW_STAGE_PHRASE_MASKED_CLASSNAME,
  REVIEW_STAGE_PROMPT_TITLE_CLASSNAME,
  REVIEW_STAGE_QUEUE_TITLE_CLASSNAME,
  REVIEW_STAGE_REFERENCE_BLOCK_CLASSNAME,
  REVIEW_STAGE_REFERENCE_TOGGLE_CLASSNAME,
  REVIEW_STAGE_SCENE_BODY_CLASSNAME,
  REVIEW_STAGE_SCENE_EXPECTED_TEXT_CLASSNAME,
  REVIEW_STAGE_SCENE_FEEDBACK_RESULT_CLASSNAME,
  REVIEW_STAGE_SCENE_INLINE_TEXT_CLASSNAME,
  REVIEW_STAGE_SCENE_TITLE_CLASSNAME,
  REVIEW_STAGE_SCHEDULING_REASON_CLASSNAME,
  REVIEW_STAGE_STEP_PROGRESS_CLASSNAME,
  REVIEW_STAGE_STEP_PROGRESS_DOT_CLASSNAME,
  REVIEW_STAGE_STEP_PROGRESS_DOT_CURRENT_CLASSNAME,
  REVIEW_STAGE_STEP_PROGRESS_DOT_DONE_CLASSNAME,
  REVIEW_STAGE_STEP_PROGRESS_TEXT_CLASSNAME,
  REVIEW_STAGE_STEP_TAG_CLASSNAME,
  REVIEW_STAGE_STRONG_DASHED_BLOCK_CLASSNAME,
  REVIEW_STAGE_TITLE_CLASSNAME,
  REVIEW_STAGE_GUIDANCE_TITLE_CLASSNAME,
  REVIEW_STAGE_WARNING_BLOCK_CLASSNAME,
  REVIEW_STAGE_WARNING_LABEL_CLASSNAME,
} from "./review-page-styles";

type StageMeta = {
  stepTag: string;
  title: string;
  stepIndex?: number;
  totalSteps?: number;
} | null;

type SceneFeedbackState = {
  assessment: "incorrect" | "keyword" | "structure" | "complete";
  completed: boolean;
} | null;

export function ReviewPageStagePanel({
  loading,
  activeTaskKind,
  stageMeta,
  summary,
  trainingHintSubtle,
  currentScenePracticeItem,
  currentPhraseItem,
  currentPhraseSchedulingReason,
  currentPhraseExampleSentence,
  currentRewritePrompt,
  phraseRewritePrompts,
  phraseRewritePromptId,
  phraseRewriteDraft,
  phraseDraft,
  phraseRecognition,
  phraseOutputConfidence,
  scenePracticeAnswer,
  sceneFeedback,
  showReference,
  taskStage,
  labels,
  setShowReference,
  setPhraseRecognition,
  setPhraseOutputConfidence,
  setPhraseRewritePromptId,
  setPhraseRewriteDraft,
  setPhraseDraft,
  setScenePracticeAnswer,
  onOpenToday,
}: {
  loading: boolean;
  activeTaskKind: "scene_practice" | "phrase_review" | null;
  stageMeta: StageMeta;
  summary: {
    reviewedTodayCount: number;
  } | null;
  trainingHintSubtle: string;
  currentScenePracticeItem: DueScenePracticeReviewItemResponse | null;
  currentPhraseItem: DueReviewItemResponse | null;
  currentPhraseSchedulingReason: string | null;
  currentPhraseExampleSentence: string;
  currentRewritePrompt: PhraseRewritePrompt | undefined;
  phraseRewritePrompts: PhraseRewritePrompt[];
  phraseRewritePromptId: PhraseRewritePrompt["id"];
  phraseRewriteDraft: string;
  phraseDraft: string;
  phraseRecognition: "recognized" | "unknown" | null;
  phraseOutputConfidence: "high" | "low" | null;
  scenePracticeAnswer: string;
  sceneFeedback: SceneFeedbackState;
  showReference: boolean;
  taskStage: ReviewTaskStage;
  labels: ReviewPageLabels;
  setShowReference: React.Dispatch<React.SetStateAction<boolean>>;
  setPhraseRecognition: (value: "recognized" | "unknown") => void;
  setPhraseOutputConfidence: (value: "high" | "low") => void;
  setPhraseRewritePromptId: (value: PhraseRewritePrompt["id"]) => void;
  setPhraseRewriteDraft: (value: string) => void;
  setPhraseDraft: (value: string) => void;
  setScenePracticeAnswer: (value: string) => void;
  onOpenToday?: () => void;
}) {
  if (loading) {
    return (
      <div className={REVIEW_STAGE_PANEL_CLASSNAME}>
        <LoadingState text={labels.queueLoading} />
      </div>
    );
  }

  if (activeTaskKind == null || stageMeta == null) {
    return (
      <Card className={APPLE_PANEL_RAISED}>
        <CardContent className="space-y-4 py-10">
          <div className="space-y-2 text-center">
            <p className={REVIEW_STAGE_QUEUE_TITLE_CLASSNAME}>
              {summary?.reviewedTodayCount ? labels.queueDoneTitle : labels.queueEmpty}
            </p>
            <p className={APPLE_META_TEXT}>
              {summary?.reviewedTodayCount
                ? `今天已完成 ${summary.reviewedTodayCount} 条回忆。${labels.queueDoneBody}`
                : labels.queueEmpty}
            </p>
          </div>
          {summary?.reviewedTodayCount && onOpenToday ? (
            <div className="flex justify-center">
              <Button type="button" onClick={onOpenToday}>
                {labels.queueDoneReturnCta}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className={REVIEW_STAGE_PANEL_CLASSNAME}>
      <header className={REVIEW_STAGE_HEADER_CLASSNAME}>
        <div className={REVIEW_STAGE_HEADER_TOP_CLASSNAME}>
          <div className={REVIEW_STAGE_STEP_TAG_CLASSNAME}>
            {stageMeta.stepTag}
          </div>
          {stageMeta.totalSteps && stageMeta.stepIndex ? (
            <div className={REVIEW_STAGE_STEP_PROGRESS_CLASSNAME} aria-label={`第 ${stageMeta.stepIndex} 步，共 ${stageMeta.totalSteps} 步`}>
              {Array.from({ length: stageMeta.totalSteps }, (_, index) => {
                const stepNumber = index + 1;
                if (stepNumber === stageMeta.stepIndex) {
                  return <span key={stepNumber} className={REVIEW_STAGE_STEP_PROGRESS_DOT_CURRENT_CLASSNAME} />;
                }
                if (stepNumber < (stageMeta.stepIndex ?? 0)) {
                  return <span key={stepNumber} className={REVIEW_STAGE_STEP_PROGRESS_DOT_DONE_CLASSNAME} />;
                }
                return <span key={stepNumber} className={REVIEW_STAGE_STEP_PROGRESS_DOT_CLASSNAME} />;
              })}
              <span className={REVIEW_STAGE_STEP_PROGRESS_TEXT_CLASSNAME}>
                {stageMeta.stepIndex} / {stageMeta.totalSteps}
              </span>
            </div>
          ) : null}
        </div>
        <h2 className={REVIEW_STAGE_TITLE_CLASSNAME}>{stageMeta.title}</h2>
        <p className={APPLE_META_TEXT}>{trainingHintSubtle}</p>
      </header>

      {activeTaskKind === "scene_practice" && currentScenePracticeItem ? (
        <div className="mt-6 space-y-4">
          <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
            <p className={APPLE_META_TEXT}>{labels.sceneScenarioLabel}</p>
            <p className={REVIEW_STAGE_SCENE_TITLE_CLASSNAME}>
              {currentScenePracticeItem.sceneTitle}
            </p>
            {currentScenePracticeItem.displayText ? (
              <p className={REVIEW_STAGE_SCENE_BODY_CLASSNAME}>
                {currentScenePracticeItem.displayText}
              </p>
            ) : null}
          </div>

          <div className={REVIEW_STAGE_STRONG_DASHED_BLOCK_CLASSNAME}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={APPLE_META_TEXT}>{labels.practiceModePrefix}</span>
              <span
                className={cn(
                  REVIEW_STAGE_MODE_PILL_CLASSNAME,
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
                <p className={APPLE_META_TEXT}>{labels.scenePromptLabel}</p>
                <p className={REVIEW_STAGE_SCENE_INLINE_TEXT_CLASSNAME}>
                  {currentScenePracticeItem.promptText}
                </p>
              </div>
            ) : null}
            {currentScenePracticeItem.hint ? (
              <div className="mt-3">
                <p className={APPLE_META_TEXT}>{labels.sceneHintLabel}</p>
                <p className={REVIEW_STAGE_SCENE_INLINE_TEXT_CLASSNAME}>{currentScenePracticeItem.hint}</p>
              </div>
            ) : null}
            {currentScenePracticeItem.expectedAnswer ? (
              <div className="mt-3">
                <p className={APPLE_META_TEXT}>{labels.sceneExpectedLabel}</p>
                <p className={REVIEW_STAGE_SCENE_EXPECTED_TEXT_CLASSNAME}>
                  {currentScenePracticeItem.expectedAnswer}
                </p>
              </div>
            ) : null}
          </div>

          {taskStage === "practice" ? (
            <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
              <p className={APPLE_META_TEXT}>{labels.scenePracticeLabel}</p>
              {currentScenePracticeItem.recommendedMode === "full_dictation" ? (
                <textarea
                  className={`mt-3 min-h-28 w-full px-4 py-3 text-sm ${APPLE_INPUT_PANEL}`}
                  placeholder={getInlinePracticePlaceholder(
                    currentScenePracticeItem.recommendedMode as PracticeMode,
                    labels,
                  )}
                  value={scenePracticeAnswer}
                  onChange={(event) => setScenePracticeAnswer(event.target.value)}
                />
              ) : (
                <input
                  className={`mt-3 h-12 w-full px-4 text-sm ${APPLE_INPUT_PANEL}`}
                  placeholder={getInlinePracticePlaceholder(
                    currentScenePracticeItem.recommendedMode as PracticeMode,
                    labels,
                  )}
                  value={scenePracticeAnswer}
                  onChange={(event) => setScenePracticeAnswer(event.target.value)}
                />
              )}
            </div>
          ) : null}

          {taskStage === "feedback" && sceneFeedback ? (
            <div className="space-y-4">
              <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
                <p className={APPLE_META_TEXT}>{labels.sceneFeedbackLabel}</p>
                <p
                  className={cn(
                    REVIEW_STAGE_SCENE_FEEDBACK_RESULT_CLASSNAME,
                    sceneFeedback.assessment === "complete"
                      ? "text-emerald-600"
                      : sceneFeedback.assessment === "structure"
                        ? "text-sky-700"
                        : sceneFeedback.assessment === "keyword"
                          ? "text-amber-700"
                          : "text-rose-600",
                  )}
                >
                  {getInlinePracticeFeedback(sceneFeedback.assessment, labels)}
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
              <div className={REVIEW_STAGE_DASHED_BLOCK_CLASSNAME}>
                <p className={REVIEW_STAGE_GUIDANCE_TITLE_CLASSNAME}>{labels.sceneFeedbackGuidanceTitle}</p>
                <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{labels.sceneFeedbackGuidanceBody}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : currentPhraseItem ? (
        <div className="mt-6 space-y-4">
          {currentPhraseSchedulingReason ? (
            <div className={REVIEW_STAGE_WARNING_BLOCK_CLASSNAME}>
              <p className={REVIEW_STAGE_WARNING_LABEL_CLASSNAME}>
                调度提示
              </p>
              <p className={REVIEW_STAGE_SCHEDULING_REASON_CLASSNAME}>{currentPhraseSchedulingReason}</p>
            </div>
          ) : null}
          <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
            <p className={APPLE_META_TEXT}>
              {taskStage === "recall" ? labels.phraseRecallScenarioLabel : labels.phraseScenarioLabel}
            </p>
            {taskStage === "recall" && !showReference ? (
              <p className={REVIEW_STAGE_PHRASE_MASKED_CLASSNAME}>
                {labels.phraseMaskedExpression}
              </p>
            ) : (
              <p className={REVIEW_STAGE_PHRASE_EXPRESSION_CLASSNAME}>{currentPhraseItem.text}</p>
            )}
            <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>
              {currentPhraseItem.translation ?? labels.noTranslation}
            </p>
          </div>

          <div className={REVIEW_STAGE_STRONG_DASHED_BLOCK_CLASSNAME}>
            <p className={REVIEW_STAGE_PROMPT_TITLE_CLASSNAME}>
              {taskStage === "recall" ? labels.phraseMicroRecallTitle : labels.activeRecallHint}
            </p>
            <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>
              {taskStage === "recall" ? labels.phraseMicroRecallBody : labels.phraseReferenceHint}
            </p>
            <Button
              type="button"
              variant="ghost"
              className={REVIEW_STAGE_REFERENCE_TOGGLE_CLASSNAME}
              onClick={() => setShowReference((prev) => !prev)}
            >
              {showReference ? labels.hideReference : labels.showReference}
            </Button>
            {showReference ? (
              <div className={REVIEW_STAGE_REFERENCE_BLOCK_CLASSNAME}>
                <p className={APPLE_META_TEXT}>{labels.phraseReferenceLabel}</p>
                <p className={`mt-1 ${APPLE_BODY_TEXT}`}>{currentPhraseExampleSentence}</p>
                {currentPhraseItem.usageNote ? (
                  <p className={`mt-2 ${APPLE_META_TEXT}`}>{currentPhraseItem.usageNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {taskStage === "confidence" ? (
            <div className="space-y-4">
              <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
                <p className={APPLE_META_TEXT}>{labels.phraseConfidenceLabel}</p>
                <p className={REVIEW_STAGE_FIELD_LABEL_CLASSNAME}>
                  {labels.phraseRecognitionLabel}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={phraseRecognition === "recognized" ? "default" : "outline"}
                    onClick={() => setPhraseRecognition("recognized")}
                  >
                    {labels.phraseRecognitionKnown}
                  </Button>
                  <Button
                    type="button"
                    variant={phraseRecognition === "unknown" ? "default" : "outline"}
                    onClick={() => setPhraseRecognition("unknown")}
                  >
                    {labels.phraseRecognitionUnknown}
                  </Button>
                </div>
                <p className={REVIEW_STAGE_FIELD_LABEL_SPACED_CLASSNAME}>
                  {labels.phraseOutputConfidenceLabel}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={phraseOutputConfidence === "high" ? "default" : "outline"}
                    onClick={() => setPhraseOutputConfidence("high")}
                  >
                    {labels.phraseOutputConfidenceHigh}
                  </Button>
                  <Button
                    type="button"
                    variant={phraseOutputConfidence === "low" ? "default" : "outline"}
                    onClick={() => setPhraseOutputConfidence("low")}
                  >
                    {labels.phraseOutputConfidenceLow}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {taskStage === "rewrite" ? (
            <div className="space-y-4">
              <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
                <p className={APPLE_META_TEXT}>{labels.phraseRewriteLabel}</p>
                <p className={REVIEW_STAGE_FIELD_LABEL_CLASSNAME}>
                  {labels.phraseRewritePromptLabel}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {phraseRewritePrompts.map((prompt) => (
                    <Button
                      key={prompt.id}
                      type="button"
                      variant={phraseRewritePromptId === prompt.id ? "default" : "outline"}
                      onClick={() => setPhraseRewritePromptId(prompt.id)}
                    >
                      {prompt.title}
                    </Button>
                  ))}
                </div>
                <p className={`mt-3 text-sm ${APPLE_META_TEXT}`}>
                  {currentRewritePrompt?.description}
                </p>
                <textarea
                  className={`mt-3 min-h-24 w-full px-4 py-3 text-sm ${APPLE_INPUT_PANEL}`}
                  placeholder={labels.phraseRewritePlaceholder}
                  value={phraseRewriteDraft}
                  onChange={(event) => setPhraseRewriteDraft(event.target.value)}
                />
              </div>
              <div className={REVIEW_STAGE_DASHED_BLOCK_CLASSNAME}>
                <p className={REVIEW_STAGE_GUIDANCE_TITLE_CLASSNAME}>{labels.phraseRewriteGuidanceTitle}</p>
                <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{labels.phraseRewriteGuidanceBody}</p>
              </div>
            </div>
          ) : null}

          {taskStage === "practice" ? (
            <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
              <p className={APPLE_META_TEXT}>{labels.phraseOutputLabel}</p>
              <textarea
                className={`mt-3 min-h-28 w-full px-4 py-3 text-sm ${APPLE_INPUT_PANEL}`}
                placeholder={labels.phraseOutputPlaceholder}
                value={phraseDraft}
                onChange={(event) => setPhraseDraft(event.target.value)}
              />
            </div>
          ) : null}

          {taskStage === "feedback" ? (
            <div className="space-y-4">
              <div className={REVIEW_STAGE_BLOCK_CLASSNAME}>
                <p className={APPLE_META_TEXT}>{labels.phraseFeedbackLabel}</p>
                <p className={REVIEW_STAGE_FEEDBACK_SCORING_HINT_CLASSNAME}>{labels.phraseScoringHint}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {phraseRecognition ? (
                    <span className={REVIEW_STAGE_FEEDBACK_PILL_SUBTLE_CLASSNAME}>
                      {phraseRecognition === "recognized"
                        ? labels.phraseRecognitionKnown
                        : labels.phraseRecognitionUnknown}
                    </span>
                  ) : null}
                  {phraseOutputConfidence ? (
                    <span className={REVIEW_STAGE_FEEDBACK_PILL_INFO_CLASSNAME}>
                      {phraseOutputConfidence === "high"
                        ? labels.phraseOutputConfidenceHigh
                        : labels.phraseOutputConfidenceLow}
                    </span>
                  ) : null}
                  {phraseRewriteDraft.trim() ? (
                    <span className={REVIEW_STAGE_FEEDBACK_PILL_WARNING_CLASSNAME}>
                      已完成迁移改写：{currentRewritePrompt?.title}
                    </span>
                  ) : null}
                  {phraseDraft.trim() ? (
                    <span className={REVIEW_STAGE_FEEDBACK_PILL_SUCCESS_CLASSNAME}>
                      已完成完整输出
                    </span>
                  ) : null}
                </div>
                <p className={`mt-3 text-sm ${APPLE_META_TEXT}`}>
                  {labels.reviewStats} {currentPhraseItem.reviewCount}，{labels.correct}{" "}
                  {currentPhraseItem.correctCount}，{labels.incorrect} {currentPhraseItem.incorrectCount}
                </p>
              </div>
              <div className={REVIEW_STAGE_DASHED_BLOCK_CLASSNAME}>
                <p className={REVIEW_STAGE_GUIDANCE_TITLE_CLASSNAME}>{labels.phraseFeedbackGuidanceTitle}</p>
                <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{labels.phraseFeedbackGuidanceBody}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
