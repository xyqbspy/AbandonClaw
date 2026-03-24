"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PracticeSet } from "@/lib/types/learning-flow";
import { updatePracticeSetSession } from "@/lib/utils/scene-learning-flow-storage";
import { APPLE_SURFACE } from "@/lib/ui/apple-style";
import { ScenePracticeViewLabels } from "./scene-view-labels";

type ScenePracticeViewProps = {
  practiceSet: PracticeSet | null;
  showAnswerMap: Record<string, boolean>;
  appleButtonSmClassName: string;
  appleDangerButtonSmClassName: string;
  labels: ScenePracticeViewLabels;
  onBack: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onSentencePracticed?: (payload: {
    exerciseId: string;
    sentenceId?: string | null;
  }) => void;
  onReviewScene: () => void;
  onOpenVariants: () => void;
  onToggleAnswer: (exerciseId: string) => void;
};

const normalizeAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ");

export function ScenePracticeView({
  practiceSet,
  showAnswerMap,
  appleButtonSmClassName,
  appleDangerButtonSmClassName,
  labels,
  onBack,
  onDelete,
  onComplete,
  onSentencePracticed,
  onReviewScene,
  onOpenVariants,
  onToggleAnswer,
}: ScenePracticeViewProps) {
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [resultMap, setResultMap] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [attemptCountMap, setAttemptCountMap] = useState<Record<string, number>>({});
  const [incorrectCountMap, setIncorrectCountMap] = useState<Record<string, number>>({});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const sessionState = practiceSet?.sessionState;
    setAnswerMap(sessionState?.answerMap ?? {});
    setResultMap(sessionState?.resultMap ?? {});
    setAttemptCountMap(sessionState?.attemptCountMap ?? {});
    setIncorrectCountMap(sessionState?.incorrectCountMap ?? {});
    setActiveExerciseIndex(sessionState?.activeExerciseIndex ?? 0);
  }, [practiceSet?.id]);

  const exercises = practiceSet?.exercises ?? [];
  const safeActiveExerciseIndex =
    exercises.length === 0 ? 0 : Math.min(activeExerciseIndex, exercises.length - 1);
  const activeExercise = exercises[safeActiveExerciseIndex] ?? null;

  const typingExercises = useMemo(
    () => exercises.filter((exercise) => exercise.inputMode === "typing"),
    [exercises],
  );
  const correctCount = typingExercises.filter((exercise) => resultMap[exercise.id] === "correct").length;
  const typingCount = typingExercises.length;
  const allTypingCompleted = typingCount === 0 || correctCount === typingCount;
  const totalAttempts = typingExercises.reduce(
    (sum, exercise) => sum + (attemptCountMap[exercise.id] ?? 0),
    0,
  );
  const totalIncorrectAttempts = typingExercises.reduce(
    (sum, exercise) => sum + (incorrectCountMap[exercise.id] ?? 0),
    0,
  );
  const incorrectTypingExercises = typingExercises.filter(
    (exercise) => (incorrectCountMap[exercise.id] ?? 0) > 0,
  );
  const activeAttemptCount = activeExercise ? attemptCountMap[activeExercise.id] ?? 0 : 0;
  const activeIncorrectCount = activeExercise ? incorrectCountMap[activeExercise.id] ?? 0 : 0;

  useEffect(() => {
    const activeExerciseId = activeExercise?.id;
    if (!activeExerciseId) return;
    const input = inputRefs.current[activeExerciseId];
    if (input) {
      input.focus();
    }
  }, [activeExercise?.id]);

  useEffect(() => {
    if (!practiceSet || practiceSet.status === "completed") return;
    updatePracticeSetSession(practiceSet.sourceSceneId, practiceSet.id, {
      activeExerciseIndex: safeActiveExerciseIndex,
      answerMap,
      resultMap,
      attemptCountMap,
      incorrectCountMap,
      updatedAt: new Date().toISOString(),
    });
  }, [
    answerMap,
    attemptCountMap,
    incorrectCountMap,
    practiceSet,
    resultMap,
    safeActiveExerciseIndex,
  ]);

  const focusNextTypingInput = (exerciseId: string) => {
    const currentIndex = typingExercises.findIndex((exercise) => exercise.id === exerciseId);
    if (currentIndex < 0) return;

    for (let index = currentIndex + 1; index < typingExercises.length; index += 1) {
      const nextExerciseId = typingExercises[index]?.id;
      if (!nextExerciseId) continue;
      const nextExerciseIndex = exercises.findIndex((exercise) => exercise.id === nextExerciseId);
      if (nextExerciseIndex >= 0) {
        setActiveExerciseIndex(nextExerciseIndex);
        return;
      }
    }
  };

  return (
    <div className="space-y-4">
      <section className={`space-y-3 rounded-lg p-4 ${APPLE_SURFACE}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
            onClick={onBack}
          >
            {labels.back}
          </button>
          <button
            type="button"
            className={`${appleDangerButtonSmClassName} px-3 py-1.5 text-sm disabled:opacity-60`}
            onClick={onDelete}
            disabled={!practiceSet}
          >
            {labels.delete}
          </button>
          <button
            type="button"
            className={`${appleButtonSmClassName} px-3 py-1.5 text-sm disabled:opacity-60`}
            onClick={onComplete}
            disabled={!practiceSet || practiceSet.status === "completed" || !allTypingCompleted}
          >
            {labels.complete}
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          {practiceSet?.sourceType === "variant" ? (
            <p>
              {labels.basedOnVariantPrefix}
              {`${practiceSet.sourceVariantTitle ?? "Variant"} / ${labels.basedOnScenePrefix}${practiceSet.sourceSceneTitle}`}
            </p>
          ) : (
            <p>
              {labels.basedOnVariantPrefix}
              {practiceSet?.sourceSceneTitle ?? "-"}
            </p>
          )}
          <p className="mt-1">{labels.practiceHint}</p>
          {practiceSet ? (
            <>
              <p className="mt-1">{labels.progressLabel}：{correctCount}/{typingCount}</p>
              <p className="mt-1">{labels.totalAttemptsLabel}：{totalAttempts}</p>
              <p className="mt-1">{labels.totalIncorrectLabel}：{totalIncorrectAttempts}</p>
              <p className="mt-1">
                {allTypingCompleted ? labels.readyToComplete : labels.completeAllTypingFirst}
              </p>
            </>
          ) : null}
        </div>
      </section>

      {practiceSet && allTypingCompleted ? (
        <section className={`space-y-3 rounded-lg p-4 ${APPLE_SURFACE}`}>
          <div className="space-y-1">
            <p className="text-sm font-medium">{labels.summaryTitle}</p>
            <p className="text-sm text-muted-foreground">
              {labels.summaryCompleted}: {correctCount}/{typingCount}
            </p>
            <p className="text-sm text-muted-foreground">
              {labels.summaryAttempts}: {totalAttempts}
            </p>
            <p className="text-sm text-muted-foreground">
              {labels.summaryIncorrect}: {totalIncorrectAttempts}
            </p>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{labels.summaryMistakeChunks}</p>
            {incorrectTypingExercises.length === 0 ? (
              <>
                <p>{labels.summaryNoMistakes}</p>
                <p>{labels.summaryVariantHint}</p>
                <button
                  type="button"
                  className={`${appleButtonSmClassName} mt-2 px-3 py-1.5 text-sm`}
                  onClick={onOpenVariants}
                >
                  {labels.summaryVariantAction}
                </button>
              </>
            ) : (
              <>
                <ul className="space-y-1">
                  {incorrectTypingExercises.map((exercise) => (
                    <li key={exercise.id}>
                      {exercise.chunkId ?? exercise.id}
                      {exercise.prompt ? ` - ${exercise.prompt}` : ""}
                    </li>
                  ))}
                </ul>
                <p>{labels.summaryReviewHint}</p>
                <button
                  type="button"
                  className={`${appleButtonSmClassName} mt-2 px-3 py-1.5 text-sm`}
                  onClick={onReviewScene}
                >
                  {labels.summaryReviewAction}
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {!practiceSet ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <section className={`space-y-3 rounded-lg p-4 ${APPLE_SURFACE}`}>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              {labels.currentQuestionLabel}：{exercises.length === 0 ? 0 : safeActiveExerciseIndex + 1}/
              {exercises.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${appleButtonSmClassName} px-2 py-1 text-xs disabled:opacity-60`}
                disabled={safeActiveExerciseIndex <= 0}
                onClick={() => setActiveExerciseIndex((current) => Math.max(0, current - 1))}
              >
                {labels.prevQuestion}
              </button>
              <button
                type="button"
                className={`${appleButtonSmClassName} px-2 py-1 text-xs disabled:opacity-60`}
                disabled={safeActiveExerciseIndex >= exercises.length - 1}
                onClick={() =>
                  setActiveExerciseIndex((current) => Math.min(exercises.length - 1, current + 1))
                }
              >
                {labels.nextQuestion}
              </button>
            </div>
          </div>

          {activeExercise ? (
            <ul className="space-y-2">
              <li
                key={`${activeExercise.id}-${safeActiveExerciseIndex}`}
                className="rounded-md bg-[rgb(240,240,240)] p-3 text-sm"
              >
                <p className="text-xs text-muted-foreground">{activeExercise.type}</p>
                <p className="mt-1">{activeExercise.prompt ?? labels.clozePrompt}</p>
                {activeExercise.cloze?.displayText ? (
                  <div className="mt-2 rounded-md bg-white px-3 py-2 text-[15px] leading-6">
                    {activeExercise.cloze.displayText}
                  </div>
                ) : null}
                {activeExercise.chunkId ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {labels.chunkPrefix} {activeExercise.chunkId}
                  </p>
                ) : null}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>{labels.currentAttemptsLabel}：{activeAttemptCount} 次</p>
                  <p>{labels.currentIncorrectLabel}：{activeIncorrectCount} 次</p>
                  {resultMap[activeExercise.id] === "correct" ? <p>{labels.currentCompletedLabel}</p> : null}
                </div>

                {activeExercise.inputMode === "typing" ? (
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(event: FormEvent) => {
                      event.preventDefault();
                      const currentAnswer = answerMap[activeExercise.id] ?? "";
                      const acceptedAnswers = Array.from(
                        new Set(
                          [activeExercise.answer.text, ...(activeExercise.answer.acceptedAnswers ?? [])]
                            .map(normalizeAnswer)
                            .filter(Boolean),
                        ),
                      );
                      const nextResult =
                        currentAnswer.trim().length > 0 &&
                        acceptedAnswers.includes(normalizeAnswer(currentAnswer))
                          ? "correct"
                          : "incorrect";
                      const wasAlreadyCorrect = resultMap[activeExercise.id] === "correct";

                      setAttemptCountMap((prev) => ({
                        ...prev,
                        [activeExercise.id]: (prev[activeExercise.id] ?? 0) + 1,
                      }));
                      setResultMap((prev) => ({
                        ...prev,
                        [activeExercise.id]: nextResult,
                      }));

                      if (nextResult === "incorrect") {
                        setIncorrectCountMap((prev) => ({
                          ...prev,
                          [activeExercise.id]: (prev[activeExercise.id] ?? 0) + 1,
                        }));
                        return;
                      }

                      if (!wasAlreadyCorrect) {
                        onSentencePracticed?.({
                          exerciseId: activeExercise.id,
                          sentenceId: activeExercise.sentenceId,
                        });
                      }

                      focusNextTypingInput(activeExercise.id);
                    }}
                  >
                    <input
                      ref={(element) => {
                        inputRefs.current[activeExercise.id] = element;
                      }}
                      type="text"
                      value={answerMap[activeExercise.id] ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setAnswerMap((prev) => ({
                          ...prev,
                          [activeExercise.id]: nextValue,
                        }));
                        if (resultMap[activeExercise.id] !== null) {
                          setResultMap((prev) => ({
                            ...prev,
                            [activeExercise.id]: null,
                          }));
                        }
                      }}
                      placeholder={labels.inputPlaceholder}
                      className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/20"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className={`${appleButtonSmClassName} px-2 py-1 text-xs disabled:opacity-60`}
                        disabled={!(answerMap[activeExercise.id] ?? "").trim()}
                      >
                        {labels.checkAnswer}
                      </button>
                      <button
                        type="button"
                        className={`${appleButtonSmClassName} px-2 py-1 text-xs`}
                        onClick={() => {
                          setAnswerMap((prev) => ({
                            ...prev,
                            [activeExercise.id]: "",
                          }));
                          setResultMap((prev) => ({
                            ...prev,
                            [activeExercise.id]: null,
                          }));
                        }}
                      >
                        {labels.resetAnswer}
                      </button>
                    </div>
                    {resultMap[activeExercise.id] ? (
                      <p
                        className={`text-xs ${
                          resultMap[activeExercise.id] === "correct"
                            ? "text-[rgb(22,101,52)]"
                            : "text-[rgb(185,28,28)]"
                        }`}
                      >
                        {resultMap[activeExercise.id] === "correct"
                          ? labels.correct
                          : labels.incorrect}
                      </p>
                    ) : null}
                  </form>
                ) : null}

                <button
                  type="button"
                  className={`${appleButtonSmClassName} mt-2 px-2 py-1 text-xs`}
                  onClick={() => onToggleAnswer(activeExercise.id)}
                >
                  {showAnswerMap[activeExercise.id] ? labels.hideAnswer : labels.showAnswer}
                </button>
                {showAnswerMap[activeExercise.id] ? (
                  <div className="mt-2 rounded bg-white p-2 text-sm">
                    <p className="text-xs text-muted-foreground">{labels.answerLabel}</p>
                    <p className="mt-1">{activeExercise.answer.text}</p>
                  </div>
                ) : null}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{labels.finishQuestionSet}</p>
          )}
        </section>
      )}
    </div>
  );
}
