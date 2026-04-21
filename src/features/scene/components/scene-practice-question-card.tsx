"use client";

import { Dispatch, FormEvent, SetStateAction } from "react";
import { APPLE_BADGE_SUBTLE, APPLE_BUTTON_BASE, APPLE_BUTTON_STRONG, APPLE_PANEL_RAISED } from "@/lib/ui/apple-style";
import { PracticeAssessmentLevel, PracticeMode } from "@/lib/types/learning-flow";
import { PracticeExercise } from "@/lib/types/scene-parser";
import { getPracticeAssessmentMessage } from "./scene-practice-messages";
import { ScenePracticeViewLabels } from "./scene-view-labels";

type ScenePracticeQuestionCardProps = {
  activeAnswerValue: string;
  activeAttemptCount: number;
  activeExercise: PracticeExercise | null;
  activeIncorrectCount: number;
  activeModuleMode?: PracticeMode | null;
  currentAssessment: PracticeAssessmentLevel | null;
  currentQuestionNumber: number;
  currentResult: "correct" | "incorrect" | null;
  exerciseCount: number;
  getExerciseCanonicalAnswer: (exercise: PracticeExercise | null | undefined) => string;
  handleAnswerChange: (exerciseId: string, nextValue: string) => void;
  handleResetAnswer: (exerciseId: string) => void;
  handleSubmit: (event: FormEvent, exerciseId: string) => void;
  labels: ScenePracticeViewLabels;
  registerInputRef: (
    exerciseId: string,
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => void;
  safeActiveExerciseIndex: number;
  setActiveExerciseIndex: Dispatch<SetStateAction<number>>;
  showAnswerMap: Record<string, boolean>;
  onToggleAnswer: (exerciseId: string) => void;
};

const assessmentTextClassName = (assessment: PracticeAssessmentLevel | null | undefined) => {
  if (assessment === "complete") return "text-emerald-700";
  if (assessment === "structure") return "text-sky-700";
  if (assessment === "keyword") return "text-amber-700";
  return "text-destructive";
};

export function ScenePracticeQuestionCard({
  activeAnswerValue,
  activeAttemptCount,
  activeExercise,
  activeIncorrectCount,
  activeModuleMode,
  currentAssessment,
  currentQuestionNumber,
  currentResult,
  exerciseCount,
  getExerciseCanonicalAnswer,
  handleAnswerChange,
  handleResetAnswer,
  handleSubmit,
  labels,
  registerInputRef,
  safeActiveExerciseIndex,
  setActiveExerciseIndex,
  showAnswerMap,
  onToggleAnswer,
}: ScenePracticeQuestionCardProps) {
  const panelClassName = `${APPLE_PANEL_RAISED} rounded-[24px]`;
  const secondaryActionButtonClassName =
    `${APPLE_BUTTON_BASE} h-[var(--mobile-button-height)] rounded-[14px] px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-bold`;
  const primaryActionButtonClassName =
    `${APPLE_BUTTON_STRONG} h-[var(--mobile-button-height)] rounded-[14px] px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-bold`;
  const inputStateClassName =
    currentResult === "correct"
      ? "border-emerald-500 text-emerald-700 ring-4 ring-emerald-100"
      : currentResult === "incorrect"
        ? "border-rose-500 text-rose-600 ring-4 ring-rose-100"
        : "border-[#E2E8F0] text-[#1A365D] focus:border-[#3182CE] focus:ring-4 focus:ring-[#DBEAFE]";

  return (
    <section className={`px-[var(--mobile-space-sheet)] py-[clamp(24px,6.4vw,32px)] text-center ${panelClassName}`}>
      <div className="flex items-center justify-between gap-[var(--mobile-space-md)] text-[length:var(--mobile-font-body-sm)] font-semibold text-[var(--muted-foreground)]">
        <button
          type="button"
          className={`${APPLE_BADGE_SUBTLE} px-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-meta)] disabled:opacity-50`}
          disabled={safeActiveExerciseIndex <= 0}
          onClick={() => setActiveExerciseIndex((current) => Math.max(0, current - 1))}
        >
          {labels.prevQuestion}
        </button>
        <span>
          {labels.currentQuestionLabel}：{currentQuestionNumber}/{exerciseCount}
        </span>
        <button
          type="button"
          className={`${APPLE_BADGE_SUBTLE} px-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-meta)] disabled:opacity-50`}
          disabled={safeActiveExerciseIndex >= exerciseCount - 1}
          onClick={() =>
            setActiveExerciseIndex((current) => Math.min(exerciseCount - 1, current + 1))
          }
        >
          {labels.nextQuestion}
        </button>
      </div>

      {activeExercise ? (
        <>
          {activeExercise.cloze?.displayText ? (
            <h3 className="mt-[var(--mobile-space-xl)] text-[length:clamp(1.25rem,5.8vw,1.5rem)] font-extrabold leading-[1.3] tracking-[-0.03em] text-foreground">
              {activeExercise.cloze.displayText}
            </h3>
          ) : null}

          <div className="mt-[var(--mobile-space-xl)] rounded-[12px] bg-[var(--app-surface-subtle)] p-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] leading-6 text-[var(--muted-foreground)]">
            {activeExercise.hint ? (
              <p>
                <span className="mr-1 font-bold text-[var(--app-scene-panel-accent)]">含义:</span>
                {activeExercise.hint}
              </p>
            ) : null}
          </div>

          {activeExercise.inputMode === "typing" ? (
            <form className="mt-[var(--mobile-space-sheet)]" onSubmit={(event) => handleSubmit(event, activeExercise.id)}>
              {activeModuleMode === "full_dictation" ? (
                <textarea
                  ref={(element) => {
                    registerInputRef(activeExercise.id, element);
                  }}
                  value={activeAnswerValue}
                  onChange={(event) => handleAnswerChange(activeExercise.id, event.target.value)}
                  placeholder={`${labels.inputPlaceholder}，支持分行默写整段`}
                  rows={8}
                  className={`min-h-[180px] w-full rounded-[16px] border-2 bg-white px-[var(--mobile-space-sheet)] py-[var(--mobile-space-2xl)] text-center text-[length:var(--mobile-font-sheet-body)] leading-7 outline-none transition-all duration-200 ${inputStateClassName}`}
                />
              ) : (
                <input
                  ref={(element) => {
                    registerInputRef(activeExercise.id, element);
                  }}
                  type="text"
                  value={activeAnswerValue}
                  onChange={(event) => handleAnswerChange(activeExercise.id, event.target.value)}
                  placeholder={labels.inputPlaceholder}
                  className={`h-[clamp(48px,12vw,54px)] w-full rounded-[16px] border-2 bg-white px-[var(--mobile-space-sheet)] text-center text-[length:var(--mobile-font-title)] font-semibold outline-none transition-all duration-200 ${inputStateClassName}`}
                />
              )}

              <div className="mt-[var(--mobile-space-sheet)] grid grid-cols-[1.5fr_1fr_1fr] gap-[var(--mobile-space-md)]">
                <button
                  type="submit"
                  className={`${primaryActionButtonClassName} transition-transform active:scale-[0.98] disabled:opacity-50`}
                  disabled={!activeAnswerValue.trim()}
                >
                  {labels.checkAnswer}
                </button>
                <button
                  type="button"
                  className={`${secondaryActionButtonClassName} transition-transform active:scale-[0.98]`}
                  onClick={() => handleResetAnswer(activeExercise.id)}
                >
                  {labels.resetAnswer}
                </button>
                <button
                  type="button"
                  className={`${secondaryActionButtonClassName} transition-transform active:scale-[0.98]`}
                  onClick={() => onToggleAnswer(activeExercise.id)}
                >
                  {showAnswerMap[activeExercise.id] ? labels.hideAnswer : labels.showAnswer}
                </button>
              </div>

              <p className="mt-[var(--mobile-space-xl)] text-[length:var(--mobile-font-meta)] text-[var(--muted-foreground)]">
                {labels.currentAttemptsLabel}：{activeAttemptCount} 次 | {labels.currentIncorrectLabel}：
                {activeIncorrectCount} 次
              </p>

              {currentAssessment ? (
                <p className={`mt-[var(--mobile-space-md)] text-center text-[length:var(--mobile-font-body-sm)] font-semibold ${assessmentTextClassName(currentAssessment)}`}>
                  {getPracticeAssessmentMessage(currentAssessment, labels)}
                </p>
              ) : null}

              {showAnswerMap[activeExercise.id] ? (
                <div className="mt-[var(--mobile-space-xl)] rounded-[12px] bg-[var(--app-surface-subtle)] p-[var(--mobile-space-xl)] text-left">
                  <p className="text-[length:var(--mobile-font-meta)] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {labels.answerLabel}
                  </p>
                  <p className="mt-2 text-[length:var(--mobile-font-body)] font-semibold text-foreground">
                    {getExerciseCanonicalAnswer(activeExercise)}
                  </p>
                </div>
              ) : null}
            </form>
          ) : null}
        </>
      ) : (
        <p className="py-[clamp(32px,8vw,40px)] text-[length:var(--mobile-font-body-sm)] text-[var(--muted-foreground)]">{labels.finishQuestionSet}</p>
      )}
    </section>
  );
}
