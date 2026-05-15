"use client";

import React from "react";
import { Eye, EyeOff, Mic } from "lucide-react";
import { LoadingState } from "@/components/shared/action-loading";
import { Button } from "@/components/ui/button";
import { PracticeMode } from "@/lib/types/learning-flow";
import {
  DueReviewItemResponse,
  DueScenePracticeReviewItemResponse,
} from "@/lib/utils/review-api";
import { cn } from "@/lib/utils";
import { ReviewPageLabels } from "./review-page-labels";
import {
  assessmentLabelMap,
  getInlinePracticeFeedback,
  getInlinePracticePlaceholder,
  reviewModeLabelMap,
} from "./review-page-messages";
import { PhraseRewritePrompt, ReviewTaskStage } from "./review-page-selectors";
import {
  REVIEW_FEEDBACK_PILL_INFO_CLASSNAME,
  REVIEW_FEEDBACK_PILL_SUBTLE_CLASSNAME,
  REVIEW_FEEDBACK_PILL_SUCCESS_CLASSNAME,
  REVIEW_FEEDBACK_PILL_WARNING_CLASSNAME,
  REVIEW_FEEDBACK_RESULT_CLASSNAME,
  REVIEW_FEEDBACK_RESULT_COMPLETE_CLASSNAME,
  REVIEW_FEEDBACK_RESULT_INCORRECT_CLASSNAME,
  REVIEW_FEEDBACK_RESULT_KEYWORD_CLASSNAME,
  REVIEW_FEEDBACK_RESULT_STRUCTURE_CLASSNAME,
  REVIEW_INFO_BANNER_BODY_CLASSNAME,
  REVIEW_INFO_BANNER_CLASSNAME,
  REVIEW_INFO_BANNER_LABEL_CLASSNAME,
  REVIEW_INPUT_BUTTON_GROUP_CLASSNAME,
  REVIEW_INPUT_FIELD_CLASSNAME,
  REVIEW_INPUT_FOOTER_CLASSNAME,
  REVIEW_INPUT_ICON_BUTTON_CLASSNAME,
  REVIEW_INPUT_LINK_BUTTON_CLASSNAME,
  REVIEW_INPUT_OPTION_BUTTON_ACTIVE_CLASSNAME,
  REVIEW_INPUT_OPTION_BUTTON_CLASSNAME,
  REVIEW_INPUT_PANEL_CLASSNAME,
  REVIEW_INPUT_PROMPT_BODY_CLASSNAME,
  REVIEW_INPUT_PROMPT_LABEL_CLASSNAME,
  REVIEW_INPUT_TEXTAREA_CLASSNAME,
  REVIEW_QUEUE_DONE_BODY_CLASSNAME,
  REVIEW_QUEUE_DONE_CARD_CLASSNAME,
  REVIEW_QUEUE_DONE_TITLE_CLASSNAME,
  REVIEW_REFERENCE_BLOCK_CLASSNAME,
  REVIEW_REFERENCE_BODY_CLASSNAME,
  REVIEW_REFERENCE_LABEL_CLASSNAME,
  REVIEW_REFERENCE_NOTE_CLASSNAME,
  REVIEW_SCENE_BLOCK_CLASSNAME,
  REVIEW_SCENE_BODY_CLASSNAME,
  REVIEW_SCENE_TITLE_CLASSNAME,
  REVIEW_SECTION_CLASSNAME,
  REVIEW_STAGE_HEADER_CLASSNAME,
  REVIEW_STAGE_HEADER_LEFT_CLASSNAME,
  REVIEW_STAGE_HEADER_TITLE_CLASSNAME,
  REVIEW_STAGE_PROGRESS_DOTS_CLASSNAME,
  REVIEW_STAGE_PROGRESS_DOT_CLASSNAME,
  REVIEW_STAGE_PROGRESS_DOT_CURRENT_CLASSNAME,
  REVIEW_STAGE_PROGRESS_DOT_DONE_CLASSNAME,
  REVIEW_STAGE_STEP_BADGE_CLASSNAME,
  REVIEW_TARGET_CARD_CLASSNAME,
  REVIEW_TARGET_EYEBROW_CLASSNAME,
  REVIEW_TARGET_MASKED_CLASSNAME,
  REVIEW_TARGET_META_PILL_CLASSNAME,
  REVIEW_TARGET_SUBTITLE_CLASSNAME,
  REVIEW_TARGET_TITLE_CLASSNAME,
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

const formatStepBadge = (stepIndex?: number) =>
  stepIndex ? String(stepIndex).padStart(2, "0") : "01";

const sceneFeedbackResultClassName = (assessment: SceneFeedbackState extends infer T ? T : never) => {
  if (!assessment) return REVIEW_FEEDBACK_RESULT_INCORRECT_CLASSNAME;
  if (assessment.assessment === "complete") return REVIEW_FEEDBACK_RESULT_COMPLETE_CLASSNAME;
  if (assessment.assessment === "structure") return REVIEW_FEEDBACK_RESULT_STRUCTURE_CLASSNAME;
  if (assessment.assessment === "keyword") return REVIEW_FEEDBACK_RESULT_KEYWORD_CLASSNAME;
  return REVIEW_FEEDBACK_RESULT_INCORRECT_CLASSNAME;
};

export function ReviewPageStagePanel({
  loading,
  activeTaskKind,
  stageMeta,
  summary,
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
      <div className={REVIEW_QUEUE_DONE_CARD_CLASSNAME}>
        <LoadingState text={labels.queueLoading} />
      </div>
    );
  }

  if (activeTaskKind == null || stageMeta == null) {
    return (
      <div className={REVIEW_QUEUE_DONE_CARD_CLASSNAME}>
        <p className={REVIEW_QUEUE_DONE_TITLE_CLASSNAME}>
          {summary?.reviewedTodayCount ? labels.queueDoneTitle : labels.queueEmpty}
        </p>
        <p className={REVIEW_QUEUE_DONE_BODY_CLASSNAME}>
          {summary?.reviewedTodayCount
            ? `今天已完成 ${summary.reviewedTodayCount} 条回忆。${labels.queueDoneBody}`
            : labels.queueEmpty}
        </p>
        {summary?.reviewedTodayCount && onOpenToday ? (
          <div className="flex justify-center">
            <Button type="button" onClick={onOpenToday}>
              {labels.queueDoneReturnCta}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const stepBadge = formatStepBadge(stageMeta.stepIndex);
  const totalSteps = stageMeta.totalSteps ?? 0;
  const stepIndex = stageMeta.stepIndex ?? 0;

  return (
    <section className={REVIEW_SECTION_CLASSNAME}>
      <div className={REVIEW_STAGE_HEADER_CLASSNAME}>
        <div className={REVIEW_STAGE_HEADER_LEFT_CLASSNAME}>
          <span className={REVIEW_STAGE_STEP_BADGE_CLASSNAME}>{stepBadge}</span>
          <h2 className={REVIEW_STAGE_HEADER_TITLE_CLASSNAME}>{stageMeta.stepTag.replace(/^STEP \d+\.\s*/, "")}</h2>
        </div>
        {totalSteps > 0 ? (
          <div className={REVIEW_STAGE_PROGRESS_DOTS_CLASSNAME} aria-label={`第 ${stepIndex} 步，共 ${totalSteps} 步`}>
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1;
              if (stepNumber === stepIndex) {
                return <span key={stepNumber} className={REVIEW_STAGE_PROGRESS_DOT_CURRENT_CLASSNAME} />;
              }
              if (stepNumber < stepIndex) {
                return <span key={stepNumber} className={REVIEW_STAGE_PROGRESS_DOT_DONE_CLASSNAME} />;
              }
              return <span key={stepNumber} className={REVIEW_STAGE_PROGRESS_DOT_CLASSNAME} />;
            })}
          </div>
        ) : null}
      </div>

      {activeTaskKind === "scene_practice" && currentScenePracticeItem ? (
        <>
          <div className={REVIEW_TARGET_CARD_CLASSNAME}>
            <p className={REVIEW_TARGET_EYEBROW_CLASSNAME}>{labels.sceneScenarioLabel}</p>
            <h3 className={REVIEW_TARGET_TITLE_CLASSNAME}>{currentScenePracticeItem.sceneTitle}</h3>
            {currentScenePracticeItem.displayText ? (
              <p className={REVIEW_TARGET_SUBTITLE_CLASSNAME}>{currentScenePracticeItem.displayText}</p>
            ) : null}
          </div>

          <div className={REVIEW_INPUT_PANEL_CLASSNAME}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.practiceModePrefix}</span>
              <span className={REVIEW_TARGET_META_PILL_CLASSNAME}>
                {reviewModeLabelMap[currentScenePracticeItem.recommendedMode]}
              </span>
            </div>

            {currentScenePracticeItem.promptText ? (
              <div className="space-y-1">
                <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.scenePromptLabel}</p>
                <p className={REVIEW_INPUT_PROMPT_BODY_CLASSNAME}>{currentScenePracticeItem.promptText}</p>
              </div>
            ) : null}

            {currentScenePracticeItem.hint ? (
              <div className="space-y-1">
                <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.sceneHintLabel}</p>
                <p className={REVIEW_INPUT_PROMPT_BODY_CLASSNAME}>{currentScenePracticeItem.hint}</p>
              </div>
            ) : null}

            {taskStage === "practice" ? (
              currentScenePracticeItem.recommendedMode === "full_dictation" ? (
                <textarea
                  className={REVIEW_INPUT_TEXTAREA_CLASSNAME}
                  placeholder={getInlinePracticePlaceholder(
                    currentScenePracticeItem.recommendedMode as PracticeMode,
                    labels,
                  )}
                  value={scenePracticeAnswer}
                  onChange={(event) => setScenePracticeAnswer(event.target.value)}
                />
              ) : (
                <input
                  className={REVIEW_INPUT_FIELD_CLASSNAME}
                  placeholder={getInlinePracticePlaceholder(
                    currentScenePracticeItem.recommendedMode as PracticeMode,
                    labels,
                  )}
                  value={scenePracticeAnswer}
                  onChange={(event) => setScenePracticeAnswer(event.target.value)}
                />
              )
            ) : null}

            {taskStage === "practice" && currentScenePracticeItem.expectedAnswer ? (
              <button
                type="button"
                onClick={() => setShowReference((prev) => !prev)}
                className={REVIEW_INPUT_LINK_BUTTON_CLASSNAME}
              >
                {showReference ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showReference ? labels.hideReference : labels.showReference}</span>
              </button>
            ) : null}

            {taskStage === "practice" && showReference && currentScenePracticeItem.expectedAnswer ? (
              <div className={REVIEW_REFERENCE_BLOCK_CLASSNAME}>
                <p className={REVIEW_REFERENCE_LABEL_CLASSNAME}>{labels.sceneExpectedLabel}</p>
                <p className={REVIEW_REFERENCE_BODY_CLASSNAME}>{currentScenePracticeItem.expectedAnswer}</p>
              </div>
            ) : null}
          </div>

          {taskStage === "feedback" && sceneFeedback ? (
            <div className={REVIEW_SCENE_BLOCK_CLASSNAME}>
              <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.sceneFeedbackLabel}</p>
              <p
                className={cn(
                  "mt-2",
                  REVIEW_FEEDBACK_RESULT_CLASSNAME,
                  sceneFeedbackResultClassName(sceneFeedback),
                )}
              >
                {getInlinePracticeFeedback(sceneFeedback.assessment, labels)}
              </p>
              <p className="mt-3 text-xs font-bold text-slate-500">
                当前记录：
                {sceneFeedback.assessment === "complete"
                  ? " 已达到整句完成"
                  : ` ${assessmentLabelMap[
                      sceneFeedback.assessment as keyof typeof assessmentLabelMap
                    ] ?? sceneFeedback.assessment}`}
              </p>
            </div>
          ) : null}
        </>
      ) : currentPhraseItem ? (
        <>
          <div className={REVIEW_TARGET_CARD_CLASSNAME}>
            <p className={REVIEW_TARGET_EYEBROW_CLASSNAME}>
              {taskStage === "recall" ? labels.phraseRecallScenarioLabel : labels.phraseScenarioLabel}
            </p>
            {taskStage === "recall" && !showReference ? (
              <h3 className={REVIEW_TARGET_MASKED_CLASSNAME}>
                {labels.phraseMaskedExpression}
              </h3>
            ) : (
              <h3 className={REVIEW_TARGET_TITLE_CLASSNAME}>{currentPhraseItem.text}</h3>
            )}
            <p className={REVIEW_TARGET_SUBTITLE_CLASSNAME}>
              {currentPhraseItem.translation ?? labels.noTranslation}
            </p>
          </div>

          {currentPhraseSchedulingReason ? (
            <div className={REVIEW_INFO_BANNER_CLASSNAME}>
              <span className="mt-0.5 text-xs text-amber-500">●</span>
              <div>
                <p className={REVIEW_INFO_BANNER_LABEL_CLASSNAME}>调度提示</p>
                <p className={REVIEW_INFO_BANNER_BODY_CLASSNAME}>{currentPhraseSchedulingReason}</p>
              </div>
            </div>
          ) : null}

          {taskStage === "recall" ? (
            <div className={REVIEW_INPUT_PANEL_CLASSNAME}>
              <button
                type="button"
                onClick={() => setShowReference((prev) => !prev)}
                className={REVIEW_INPUT_LINK_BUTTON_CLASSNAME}
              >
                {showReference ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showReference ? labels.hideReference : labels.showReference}</span>
              </button>
              {showReference ? (
                <div className={REVIEW_REFERENCE_BLOCK_CLASSNAME}>
                  <p className={REVIEW_REFERENCE_LABEL_CLASSNAME}>{labels.phraseReferenceLabel}</p>
                  <p className={REVIEW_REFERENCE_BODY_CLASSNAME}>{currentPhraseExampleSentence}</p>
                  {currentPhraseItem.usageNote ? (
                    <p className={REVIEW_REFERENCE_NOTE_CLASSNAME}>{currentPhraseItem.usageNote}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {taskStage === "confidence" ? (
            <div className={REVIEW_INPUT_PANEL_CLASSNAME}>
              <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.phraseConfidenceLabel}</p>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">{labels.phraseRecognitionLabel}</p>
                <div className={REVIEW_INPUT_BUTTON_GROUP_CLASSNAME}>
                  <button
                    type="button"
                    onClick={() => setPhraseRecognition("recognized")}
                    className={
                      phraseRecognition === "recognized"
                        ? REVIEW_INPUT_OPTION_BUTTON_ACTIVE_CLASSNAME
                        : REVIEW_INPUT_OPTION_BUTTON_CLASSNAME
                    }
                  >
                    {labels.phraseRecognitionKnown}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhraseRecognition("unknown")}
                    className={
                      phraseRecognition === "unknown"
                        ? REVIEW_INPUT_OPTION_BUTTON_ACTIVE_CLASSNAME
                        : REVIEW_INPUT_OPTION_BUTTON_CLASSNAME
                    }
                  >
                    {labels.phraseRecognitionUnknown}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">
                  {labels.phraseOutputConfidenceLabel}
                </p>
                <div className={REVIEW_INPUT_BUTTON_GROUP_CLASSNAME}>
                  <button
                    type="button"
                    onClick={() => setPhraseOutputConfidence("high")}
                    className={
                      phraseOutputConfidence === "high"
                        ? REVIEW_INPUT_OPTION_BUTTON_ACTIVE_CLASSNAME
                        : REVIEW_INPUT_OPTION_BUTTON_CLASSNAME
                    }
                  >
                    {labels.phraseOutputConfidenceHigh}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhraseOutputConfidence("low")}
                    className={
                      phraseOutputConfidence === "low"
                        ? REVIEW_INPUT_OPTION_BUTTON_ACTIVE_CLASSNAME
                        : REVIEW_INPUT_OPTION_BUTTON_CLASSNAME
                    }
                  >
                    {labels.phraseOutputConfidenceLow}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {taskStage === "rewrite" ? (
            <div className={REVIEW_INPUT_PANEL_CLASSNAME}>
              <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.phraseRewritePromptLabel}</p>
              <div className={REVIEW_INPUT_BUTTON_GROUP_CLASSNAME}>
                {phraseRewritePrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => setPhraseRewritePromptId(prompt.id)}
                    className={
                      phraseRewritePromptId === prompt.id
                        ? REVIEW_INPUT_OPTION_BUTTON_ACTIVE_CLASSNAME
                        : REVIEW_INPUT_OPTION_BUTTON_CLASSNAME
                    }
                  >
                    {prompt.title}
                  </button>
                ))}
              </div>
              <textarea
                placeholder={labels.phraseRewritePlaceholder}
                value={phraseRewriteDraft}
                onChange={(event) => setPhraseRewriteDraft(event.target.value)}
                className={REVIEW_INPUT_TEXTAREA_CLASSNAME}
              />
              <div className={REVIEW_INPUT_FOOTER_CLASSNAME}>
                <button
                  type="button"
                  onClick={() => setShowReference((prev) => !prev)}
                  className={REVIEW_INPUT_LINK_BUTTON_CLASSNAME}
                >
                  {showReference ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showReference ? labels.hideReference : labels.showReference}</span>
                </button>
                <div className="flex-1" />
                <button type="button" className={REVIEW_INPUT_ICON_BUTTON_CLASSNAME} aria-label="语音输入">
                  <Mic className="size-3.5" />
                </button>
              </div>
              {showReference ? (
                <div className={REVIEW_REFERENCE_BLOCK_CLASSNAME}>
                  <p className={REVIEW_REFERENCE_LABEL_CLASSNAME}>{labels.phraseReferenceLabel}</p>
                  <p className={REVIEW_REFERENCE_BODY_CLASSNAME}>{currentPhraseExampleSentence}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {taskStage === "practice" ? (
            <div className={REVIEW_INPUT_PANEL_CLASSNAME}>
              <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.phraseOutputLabel}</p>
              <textarea
                placeholder={labels.phraseOutputPlaceholder}
                value={phraseDraft}
                onChange={(event) => setPhraseDraft(event.target.value)}
                className={REVIEW_INPUT_TEXTAREA_CLASSNAME}
              />
              <div className={REVIEW_INPUT_FOOTER_CLASSNAME}>
                <button
                  type="button"
                  onClick={() => setShowReference((prev) => !prev)}
                  className={REVIEW_INPUT_LINK_BUTTON_CLASSNAME}
                >
                  {showReference ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showReference ? labels.hideReference : labels.showReference}</span>
                </button>
                <div className="flex-1" />
                <button type="button" className={REVIEW_INPUT_ICON_BUTTON_CLASSNAME} aria-label="语音输入">
                  <Mic className="size-3.5" />
                </button>
              </div>
              {showReference ? (
                <div className={REVIEW_REFERENCE_BLOCK_CLASSNAME}>
                  <p className={REVIEW_REFERENCE_LABEL_CLASSNAME}>{labels.phraseReferenceLabel}</p>
                  <p className={REVIEW_REFERENCE_BODY_CLASSNAME}>{currentPhraseExampleSentence}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {taskStage === "feedback" ? (
            <div className={REVIEW_SCENE_BLOCK_CLASSNAME}>
              <p className={REVIEW_INPUT_PROMPT_LABEL_CLASSNAME}>{labels.phraseFeedbackLabel}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{labels.phraseScoringHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {phraseRecognition ? (
                  <span className={REVIEW_FEEDBACK_PILL_SUBTLE_CLASSNAME}>
                    {phraseRecognition === "recognized"
                      ? labels.phraseRecognitionKnown
                      : labels.phraseRecognitionUnknown}
                  </span>
                ) : null}
                {phraseOutputConfidence ? (
                  <span className={REVIEW_FEEDBACK_PILL_INFO_CLASSNAME}>
                    {phraseOutputConfidence === "high"
                      ? labels.phraseOutputConfidenceHigh
                      : labels.phraseOutputConfidenceLow}
                  </span>
                ) : null}
                {phraseRewriteDraft.trim() ? (
                  <span className={REVIEW_FEEDBACK_PILL_WARNING_CLASSNAME}>
                    已完成迁移改写：{currentRewritePrompt?.title}
                  </span>
                ) : null}
                {phraseDraft.trim() ? (
                  <span className={REVIEW_FEEDBACK_PILL_SUCCESS_CLASSNAME}>已完成完整输出</span>
                ) : null}
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">
                {labels.reviewStats} {currentPhraseItem.reviewCount}，{labels.correct}{" "}
                {currentPhraseItem.correctCount}，{labels.incorrect} {currentPhraseItem.incorrectCount}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
