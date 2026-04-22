"use client";

import React from "react";
import { LoadingState } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APPLE_BODY_TEXT, APPLE_INPUT_PANEL, APPLE_META_TEXT, APPLE_PANEL, APPLE_PANEL_RAISED } from "@/lib/ui/apple-style";
import { PracticeMode } from "@/lib/types/learning-flow";
import { DueReviewItemResponse, DueScenePracticeReviewItemResponse } from "@/lib/utils/review-api";
import { cn } from "@/lib/utils";
import { ReviewPageLabels } from "./review-page-labels";
import { assessmentLabelMap, getInlinePracticeFeedback, getInlinePracticePlaceholder, getReviewModeAccentClassName, reviewModeLabelMap } from "./review-page-messages";
import { PhraseRewritePrompt, ReviewTaskStage } from "./review-page-selectors";

const stagePanelClassName =
  "rounded-[24px] border border-[var(--app-border-soft)] bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]";
const stageStepTagClassName =
  "mb-4 inline-flex rounded-xl bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700";
const stageTitleClassName = "text-2xl font-semibold tracking-tight text-slate-950";
const reviewStageBlockClassName = `rounded-[20px] p-4 ${APPLE_PANEL}`;
const reviewDashedBlockClassName = "rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4";
const reviewStrongDashedBlockClassName =
  "rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 p-4";
const reviewTodoTitleClassName = "text-sm font-semibold text-slate-900";
const reviewPromptTitleClassName = "text-sm font-medium text-slate-700";
const reviewFieldLabelClassName = "mt-3 text-sm font-medium text-slate-800";
const reviewFieldLabelSpacedClassName = "mt-5 text-sm font-medium text-slate-800";
const reviewQueueTitleClassName = "text-lg font-semibold text-slate-950";
const reviewSceneTitleClassName = "mt-2 text-lg font-semibold text-foreground";
const reviewSceneBodyClassName = "mt-3 text-base leading-7 text-foreground";
const reviewSceneInlineTextClassName = "mt-1 text-sm text-foreground";
const reviewSceneExpectedTextClassName = "mt-1 text-base font-medium text-foreground";
const reviewSceneFeedbackResultClassName = "mt-2 text-base font-medium";
const reviewModePillClassName = "rounded-full px-2.5 py-1 text-xs font-medium";
const reviewSchedulingReasonClassName = "mt-2 text-sm text-amber-800";
const reviewPhraseMaskedClassName = "mt-2 text-lg font-semibold text-slate-950";
const reviewPhraseExpressionClassName = "mt-2 text-2xl font-semibold text-slate-950";
const reviewReferenceToggleClassName = "mt-4 h-auto px-0 text-sm font-medium text-slate-600";
const reviewFeedbackScoringHintClassName = "mt-2 text-sm text-slate-700";
const reviewReferenceBlockClassName = "mt-3 rounded-[18px] bg-white p-4 shadow-sm";
const reviewWarningBlockClassName = "rounded-[18px] border border-amber-200 bg-amber-50/80 p-4";
const reviewWarningLabelClassName =
  "text-xs font-semibold uppercase tracking-[0.16em] text-amber-700";
const reviewFeedbackPillBaseClassName = "rounded-full px-3 py-1";
const reviewFeedbackPillSubtleClassName = `${reviewFeedbackPillBaseClassName} bg-slate-100 text-slate-700`;
const reviewFeedbackPillInfoClassName = `${reviewFeedbackPillBaseClassName} bg-sky-50 text-sky-700`;
const reviewFeedbackPillWarningClassName = `${reviewFeedbackPillBaseClassName} bg-amber-50 text-amber-700`;
const reviewFeedbackPillSuccessClassName = `${reviewFeedbackPillBaseClassName} bg-emerald-50 text-emerald-700`;

type StageMeta = {
  stepTag: string;
  title: string;
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
      <div className={stagePanelClassName}>
        <LoadingState text={labels.queueLoading} />
      </div>
    );
  }

  if (activeTaskKind == null || stageMeta == null) {
    return (
      <Card className={APPLE_PANEL_RAISED}>
        <CardContent className="space-y-4 py-10">
          <div className="space-y-2 text-center">
            <p className={reviewQueueTitleClassName}>
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
    <section className={stagePanelClassName}>
      <div className={stageStepTagClassName}>
        {stageMeta.stepTag}
      </div>
      <h2 className={stageTitleClassName}>{stageMeta.title}</h2>
      <p className={`mt-2 ${APPLE_META_TEXT}`}>{trainingHintSubtle}</p>

      {activeTaskKind === "scene_practice" && currentScenePracticeItem ? (
        <div className="mt-6 space-y-4">
          <div className={reviewStageBlockClassName}>
            <p className={APPLE_META_TEXT}>{labels.sceneScenarioLabel}</p>
            <p className={reviewSceneTitleClassName}>
              {currentScenePracticeItem.sceneTitle}
            </p>
            {currentScenePracticeItem.displayText ? (
              <p className={reviewSceneBodyClassName}>
                {currentScenePracticeItem.displayText}
              </p>
            ) : null}
          </div>

          <div className={reviewStrongDashedBlockClassName}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={APPLE_META_TEXT}>{labels.practiceModePrefix}</span>
              <span
                className={cn(
                  reviewModePillClassName,
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
                <p className={reviewSceneInlineTextClassName}>
                  {currentScenePracticeItem.promptText}
                </p>
              </div>
            ) : null}
            {currentScenePracticeItem.hint ? (
              <div className="mt-3">
                <p className={APPLE_META_TEXT}>{labels.sceneHintLabel}</p>
                <p className={reviewSceneInlineTextClassName}>{currentScenePracticeItem.hint}</p>
              </div>
            ) : null}
            {currentScenePracticeItem.expectedAnswer ? (
              <div className="mt-3">
                <p className={APPLE_META_TEXT}>{labels.sceneExpectedLabel}</p>
                <p className={reviewSceneExpectedTextClassName}>
                  {currentScenePracticeItem.expectedAnswer}
                </p>
              </div>
            ) : null}
          </div>

          {taskStage === "practice" ? (
            <div className={reviewStageBlockClassName}>
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
              <div className={reviewStageBlockClassName}>
                <p className={APPLE_META_TEXT}>{labels.sceneFeedbackLabel}</p>
                <p
                  className={cn(
                    reviewSceneFeedbackResultClassName,
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
              <div className={reviewDashedBlockClassName}>
                <p className={reviewTodoTitleClassName}>{labels.sceneTodoTitle}</p>
                <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{labels.sceneTodoBody}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : currentPhraseItem ? (
        <div className="mt-6 space-y-4">
          {currentPhraseSchedulingReason ? (
            <div className={reviewWarningBlockClassName}>
              <p className={reviewWarningLabelClassName}>
                调度提示
              </p>
              <p className={reviewSchedulingReasonClassName}>{currentPhraseSchedulingReason}</p>
            </div>
          ) : null}
          <div className={reviewStageBlockClassName}>
            <p className={APPLE_META_TEXT}>
              {taskStage === "recall" ? labels.phraseRecallScenarioLabel : labels.phraseScenarioLabel}
            </p>
            {taskStage === "recall" && !showReference ? (
              <p className={reviewPhraseMaskedClassName}>
                {labels.phraseMaskedExpression}
              </p>
            ) : (
              <p className={reviewPhraseExpressionClassName}>{currentPhraseItem.text}</p>
            )}
            <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>
              {currentPhraseItem.translation ?? labels.noTranslation}
            </p>
          </div>

          <div className={reviewStrongDashedBlockClassName}>
            <p className={reviewPromptTitleClassName}>
              {taskStage === "recall" ? labels.phraseMicroRecallTitle : labels.activeRecallHint}
            </p>
            <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>
              {taskStage === "recall" ? labels.phraseMicroRecallBody : labels.phraseReferenceHint}
            </p>
            <Button
              type="button"
              variant="ghost"
              className={reviewReferenceToggleClassName}
              onClick={() => setShowReference((prev) => !prev)}
            >
              {showReference ? labels.hideReference : labels.showReference}
            </Button>
            {showReference ? (
              <div className={reviewReferenceBlockClassName}>
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
              <div className={reviewStageBlockClassName}>
                <p className={APPLE_META_TEXT}>{labels.phraseConfidenceLabel}</p>
                <p className={reviewFieldLabelClassName}>
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
                <p className={reviewFieldLabelSpacedClassName}>
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
              <div className={reviewStageBlockClassName}>
                <p className={APPLE_META_TEXT}>{labels.phraseRewriteLabel}</p>
                <p className={reviewFieldLabelClassName}>
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
              <div className={reviewDashedBlockClassName}>
                <p className={reviewTodoTitleClassName}>{labels.phraseRewriteTodoTitle}</p>
                <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{labels.phraseRewriteTodoBody}</p>
              </div>
            </div>
          ) : null}

          {taskStage === "practice" ? (
            <div className={reviewStageBlockClassName}>
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
              <div className={reviewStageBlockClassName}>
                <p className={APPLE_META_TEXT}>{labels.phraseFeedbackLabel}</p>
                <p className={reviewFeedbackScoringHintClassName}>{labels.phraseScoringHint}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {phraseRecognition ? (
                    <span className={reviewFeedbackPillSubtleClassName}>
                      {phraseRecognition === "recognized"
                        ? labels.phraseRecognitionKnown
                        : labels.phraseRecognitionUnknown}
                    </span>
                  ) : null}
                  {phraseOutputConfidence ? (
                    <span className={reviewFeedbackPillInfoClassName}>
                      {phraseOutputConfidence === "high"
                        ? labels.phraseOutputConfidenceHigh
                        : labels.phraseOutputConfidenceLow}
                    </span>
                  ) : null}
                  {phraseRewriteDraft.trim() ? (
                    <span className={reviewFeedbackPillWarningClassName}>
                      {currentRewritePrompt?.title}
                    </span>
                  ) : null}
                  {phraseDraft.trim() ? (
                    <span className={reviewFeedbackPillSuccessClassName}>
                      已完成完整输出草稿
                    </span>
                  ) : null}
                </div>
                <p className={`mt-3 text-sm ${APPLE_META_TEXT}`}>
                  {labels.reviewStats} {currentPhraseItem.reviewCount}，{labels.correct}{" "}
                  {currentPhraseItem.correctCount}，{labels.incorrect} {currentPhraseItem.incorrectCount}
                </p>
              </div>
              <div className={reviewDashedBlockClassName}>
                <p className={reviewTodoTitleClassName}>{labels.phraseFeedbackTodoTitle}</p>
                <p className={`mt-2 text-sm ${APPLE_META_TEXT}`}>{labels.phraseFeedbackTodoBody}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
