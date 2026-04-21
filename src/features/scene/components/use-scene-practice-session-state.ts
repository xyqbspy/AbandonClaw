"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PracticeAssessmentLevel, PracticeMode, PracticeSet } from "@/lib/types/learning-flow";
import { updatePracticeSetSession } from "@/lib/utils/scene-learning-flow-storage";
import {
  buildAcceptedPracticeAnswers,
  deriveDisplayedClozeAnswer,
  getPracticeAssessment,
  hasPracticeAssessmentImproved,
  isPracticeAssessmentComplete,
} from "@/lib/shared/scene-practice-assessment";
import { getPracticeModeLabel } from "@/lib/shared/scene-training-copy";
import {
  buildReportedUnlockedModesSeed,
  notifyAllPracticeModulesCompleted,
  notifyPracticeModuleCompleted,
  notifyPracticeModuleUnlocked,
  notifyPracticeSentenceMilestone,
} from "./scene-practice-notify";
import {
  didSentenceReachCompleteMilestone,
  deriveBestSentenceAssessment,
  derivePracticeModuleCompletionMap,
  derivePracticeModules,
  deriveSentenceMilestoneSummary,
  deriveUnlockedPracticeModes,
} from "./scene-practice-selectors";
import { ScenePracticeViewLabels } from "./scene-view-labels";

type PracticeAttemptPayload = {
  practiceSetId: string;
  mode: PracticeMode;
  sourceType: "original" | "variant";
  sourceVariantId?: string | null;
  exerciseId: string;
  sentenceId?: string | null;
  userAnswer: string;
  assessmentLevel: PracticeAssessmentLevel;
  isCorrect: boolean;
  metadata?: Record<string, unknown>;
};

type UseScenePracticeSessionStateParams = {
  labels: ScenePracticeViewLabels;
  practiceSet: PracticeSet | null;
  onPracticeAttempt?: (payload: PracticeAttemptPayload) => void;
  onPracticeModeComplete?: (payload: {
    practiceSetId: string;
    mode: PracticeMode;
    nextMode?: PracticeMode;
  }) => void;
  onPracticeRunStart?: (payload: {
    practiceSetId: string;
    mode: PracticeMode;
    sourceType: "original" | "variant";
    sourceVariantId?: string | null;
  }) => void;
  onSentenceCompleted?: (payload: {
    exerciseId: string;
    sentenceId?: string | null;
  }) => void;
};

export function useScenePracticeSessionState({
  labels,
  practiceSet,
  onPracticeAttempt,
  onPracticeModeComplete,
  onPracticeRunStart,
  onSentenceCompleted,
}: UseScenePracticeSessionStateParams) {
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [resultMap, setResultMap] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [assessmentMap, setAssessmentMap] = useState<
    Record<string, PracticeAssessmentLevel | null>
  >({});
  const [attemptCountMap, setAttemptCountMap] = useState<Record<string, number>>({});
  const [incorrectCountMap, setIncorrectCountMap] = useState<Record<string, number>>({});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [activeMode, setActiveMode] = useState<PracticeMode>("cloze");
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const reportedModeCompletionRef = useRef<Set<string>>(new Set());
  const reportedUnlockedModesRef = useRef<Set<PracticeMode>>(new Set());
  const reportedAllModulesCompletedRef = useRef(false);
  const startedPracticeRunKeysRef = useRef<Set<string>>(new Set());
  const onPracticeRunStartRef = useRef(onPracticeRunStart);

  const modules = useMemo(() => derivePracticeModules(practiceSet), [practiceSet]);

  const moduleCompletionMap = useMemo(
    () => derivePracticeModuleCompletionMap(modules, resultMap),
    [modules, resultMap],
  );

  const unlockedModes = useMemo(
    () => deriveUnlockedPracticeModes(modules, moduleCompletionMap),
    [moduleCompletionMap, modules],
  );

  useEffect(() => {
    onPracticeRunStartRef.current = onPracticeRunStart;
  }, [onPracticeRunStart]);

  /* eslint-disable react-hooks/set-state-in-effect -- Restoring persisted practice state is the intentional sync point when a set changes. */
  useEffect(() => {
    const sessionState = practiceSet?.sessionState;
    setAnswerMap(sessionState?.answerMap ?? {});
    setResultMap(sessionState?.resultMap ?? {});
    setAssessmentMap(sessionState?.assessmentMap ?? {});
    setAttemptCountMap(sessionState?.attemptCountMap ?? {});
    setIncorrectCountMap(sessionState?.incorrectCountMap ?? {});
    setActiveExerciseIndex(sessionState?.activeExerciseIndex ?? 0);
    setActiveMode(sessionState?.activeMode ?? (practiceSet?.mode ?? modules[0]?.mode ?? "cloze"));
    reportedModeCompletionRef.current = new Set();
    reportedUnlockedModesRef.current = buildReportedUnlockedModesSeed(modules);
    reportedAllModulesCompletedRef.current = false;
    startedPracticeRunKeysRef.current = new Set();
  }, [modules, practiceSet?.id, practiceSet?.mode, practiceSet?.sessionState]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resolvedActiveMode =
    modules.length === 0 || unlockedModes.has(activeMode) ? activeMode : (modules[0]?.mode ?? "cloze");
  const activeModule = modules.find((module) => module.mode === resolvedActiveMode) ?? modules[0] ?? null;
  const exercises = useMemo(() => activeModule?.exercises ?? [], [activeModule]);
  const safeActiveExerciseIndex =
    exercises.length === 0 ? 0 : Math.min(activeExerciseIndex, exercises.length - 1);
  const activeExercise = exercises[safeActiveExerciseIndex] ?? null;

  const typingExercises = useMemo(
    () => exercises.filter((exercise) => exercise.inputMode === "typing"),
    [exercises],
  );
  const correctCount = typingExercises.filter((exercise) => resultMap[exercise.id] === "correct").length;
  const typingCount = typingExercises.length;
  const activeAttemptCount = activeExercise ? attemptCountMap[activeExercise.id] ?? 0 : 0;
  const activeIncorrectCount = activeExercise ? incorrectCountMap[activeExercise.id] ?? 0 : 0;
  const allTypingExercises = useMemo(
    () => modules.flatMap((module) => module.exercises.filter((exercise) => exercise.inputMode === "typing")),
    [modules],
  );
  const overallCorrectCount = allTypingExercises.filter((exercise) => resultMap[exercise.id] === "correct").length;
  const overallTypingCount = allTypingExercises.length;
  const overallAttempts = allTypingExercises.reduce(
    (sum, exercise) => sum + (attemptCountMap[exercise.id] ?? 0),
    0,
  );
  const overallIncorrectAttempts = allTypingExercises.reduce(
    (sum, exercise) => sum + (incorrectCountMap[exercise.id] ?? 0),
    0,
  );
  const sentenceMilestoneSummary = useMemo(
    () => deriveSentenceMilestoneSummary({ exercises: allTypingExercises, assessmentMap }),
    [allTypingExercises, assessmentMap],
  );
  const incorrectExercisesAcrossModules = allTypingExercises.filter(
    (exercise) => (incorrectCountMap[exercise.id] ?? 0) > 0,
  );

  const getLocalizedExercisePrompt = (
    exercise: (typeof exercises)[number] | null | undefined,
  ) => {
    const practiceMode = exercise?.metadata?.practiceMode;
    if (exercise?.type === "chunk_cloze") return labels.clozePrompt;
    if (practiceMode === "guided_recall") return "看到前半句，补出后半句";
    if (practiceMode === "sentence_recall") return "看中文提示，完整复现这句";
    if (practiceMode === "full_dictation") return "根据整段中文提示，默写全文";
    if (exercise?.type === "translation_prompt") return "看中文提示，完整复现这句";
    return exercise?.prompt ?? labels.clozePrompt;
  };

  const localizedPracticeModeLabel = getPracticeModeLabel(activeModule?.mode ?? practiceSet?.mode ?? "cloze");
  const completedModuleCount = modules.filter((module) => moduleCompletionMap[module.mode]).length;
  const allModulesCompleted = modules.length === 0 || completedModuleCount === modules.length;
  const isCompletedPractice = practiceSet?.status === "completed";
  const summaryAllModulesCompleted = allModulesCompleted || isCompletedPractice;
  const getExerciseCanonicalAnswer = (
    exercise: (typeof exercises)[number] | null | undefined,
  ) => {
    if (!exercise) return "";
    return deriveDisplayedClozeAnswer(exercise.answer.text, exercise.cloze?.displayText);
  };

  const registerInputRef = (
    exerciseId: string,
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    inputRefs.current[exerciseId] = element;
  };

  useEffect(() => {
    if (!practiceSet || !activeModule || practiceSet.status === "completed") return;
    const runKey = `${practiceSet.id}:${activeModule.mode}`;
    if (startedPracticeRunKeysRef.current.has(runKey)) return;
    startedPracticeRunKeysRef.current.add(runKey);
    onPracticeRunStartRef.current?.({
      practiceSetId: practiceSet.id,
      mode: activeModule.mode,
      sourceType: practiceSet.sourceType,
      sourceVariantId: practiceSet.sourceVariantId,
    });
  }, [
    activeModule?.mode,
    activeModule,
    practiceSet?.id,
    practiceSet?.sourceType,
    practiceSet?.sourceVariantId,
    practiceSet?.status,
    practiceSet,
  ]);

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
      activeMode: resolvedActiveMode,
      answerMap,
      resultMap,
      assessmentMap,
      attemptCountMap,
      incorrectCountMap,
      updatedAt: new Date().toISOString(),
    });
  }, [
    answerMap,
    assessmentMap,
    attemptCountMap,
    incorrectCountMap,
    practiceSet,
    resultMap,
    resolvedActiveMode,
    safeActiveExerciseIndex,
  ]);

  useEffect(() => {
    if (!practiceSet || !onPracticeModeComplete) return;
    modules.forEach((module, index) => {
      if (!moduleCompletionMap[module.mode]) return;
      const modeKey = `${practiceSet.id}:${module.mode}`;
      if (reportedModeCompletionRef.current.has(modeKey)) return;
      reportedModeCompletionRef.current.add(modeKey);
      notifyPracticeModuleCompleted(labels, getPracticeModeLabel(module.mode));
      onPracticeModeComplete({
        practiceSetId: practiceSet.id,
        mode: module.mode,
        nextMode: modules[index + 1]?.mode,
      });
    });
  }, [labels, moduleCompletionMap, modules, onPracticeModeComplete, practiceSet]);

  useEffect(() => {
    modules.forEach((module) => {
      if (!unlockedModes.has(module.mode)) return;
      if (reportedUnlockedModesRef.current.has(module.mode)) return;
      reportedUnlockedModesRef.current.add(module.mode);
      if (modules[0]?.mode === module.mode) return;
      notifyPracticeModuleUnlocked(labels, getPracticeModeLabel(module.mode));
    });
  }, [labels, modules, unlockedModes]);

  useEffect(() => {
    if (!practiceSet || !allModulesCompleted) return;
    if (reportedAllModulesCompletedRef.current) return;
    reportedAllModulesCompletedRef.current = true;
    notifyAllPracticeModulesCompleted(labels);
  }, [allModulesCompleted, labels, practiceSet]);

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

  const handleAnswerChange = (exerciseId: string, nextValue: string) => {
    setAnswerMap((prev) => ({
      ...prev,
      [exerciseId]: nextValue,
    }));
    if (resultMap[exerciseId] !== null) {
      setResultMap((prev) => ({
        ...prev,
        [exerciseId]: null,
      }));
      setAssessmentMap((prev) => ({
        ...prev,
        [exerciseId]: null,
      }));
    }
  };

  const handleResetAnswer = (exerciseId: string) => {
    setAnswerMap((prev) => ({
      ...prev,
      [exerciseId]: "",
    }));
    setResultMap((prev) => ({
      ...prev,
      [exerciseId]: null,
    }));
    setAssessmentMap((prev) => ({
      ...prev,
      [exerciseId]: null,
    }));
  };

  const handleSubmit = (event: FormEvent, exerciseId: string) => {
    event.preventDefault();
    if (!activeExercise || activeExercise.id !== exerciseId) return;

    const currentAnswer = answerMap[exerciseId] ?? "";
    const expectedAnswer = getExerciseCanonicalAnswer(activeExercise);
    const acceptedAnswers = buildAcceptedPracticeAnswers(
      expectedAnswer,
      activeExercise.answer.acceptedAnswers,
      {
        displayText: activeExercise.cloze?.displayText,
      },
    );
    const exerciseMode =
      (activeModule?.mode ?? (activeExercise.metadata?.practiceMode as PracticeMode | undefined) ?? "cloze");
    const assessment = getPracticeAssessment({
      mode: exerciseMode,
      expected: expectedAnswer,
      answer: currentAnswer,
      acceptedAnswers,
    });
    const previousSentenceAssessment = deriveBestSentenceAssessment({
      exercises: allTypingExercises,
      assessmentMap,
      sentenceId: activeExercise.sentenceId,
      fallbackExerciseId: activeExercise.id,
    });
    const nextResult = isPracticeAssessmentComplete(assessment) ? "correct" : "incorrect";
    const wasAlreadyCorrect = resultMap[exerciseId] === "correct";

    setAttemptCountMap((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? 0) + 1,
    }));
    setResultMap((prev) => ({
      ...prev,
      [exerciseId]: nextResult,
    }));
    setAssessmentMap((prev) => ({
      ...prev,
      [exerciseId]: assessment,
    }));

    if (hasPracticeAssessmentImproved(previousSentenceAssessment, assessment)) {
      notifyPracticeSentenceMilestone(labels, assessment);
    }

    onPracticeAttempt?.({
      practiceSetId: practiceSet?.id ?? "",
      mode: exerciseMode,
      sourceType: practiceSet?.sourceType ?? "original",
      sourceVariantId: practiceSet?.sourceVariantId,
      exerciseId,
      sentenceId: activeExercise.sentenceId,
      userAnswer: currentAnswer,
      assessmentLevel: assessment,
      isCorrect: isPracticeAssessmentComplete(assessment),
      metadata: {
        ...(activeExercise.metadata &&
          typeof activeExercise.metadata === "object" &&
          !Array.isArray(activeExercise.metadata)
          ? (activeExercise.metadata as Record<string, unknown>)
          : {}),
        prompt: activeExercise.prompt ?? null,
        displayText: activeExercise.cloze?.displayText ?? null,
        expectedAnswer,
        hint: activeExercise.hint ?? null,
      },
    });

    if (!isPracticeAssessmentComplete(assessment)) {
      setIncorrectCountMap((prev) => ({
        ...prev,
        [exerciseId]: (prev[exerciseId] ?? 0) + 1,
      }));
      return;
    }

    if (
      !wasAlreadyCorrect &&
      didSentenceReachCompleteMilestone({
        previous: previousSentenceAssessment,
        next: assessment,
      })
    ) {
      onSentenceCompleted?.({
        exerciseId,
        sentenceId: activeExercise.sentenceId,
      });
    }

    focusNextTypingInput(exerciseId);
  };

  const currentQuestionNumber = exercises.length === 0 ? 0 : safeActiveExerciseIndex + 1;
  const currentQuestionProgress = exercises.length === 0 ? 0 : (currentQuestionNumber / exercises.length) * 100;
  const currentResult = activeExercise ? resultMap[activeExercise.id] : null;
  const currentAssessment = activeExercise ? assessmentMap[activeExercise.id] : null;
  const activeAnswerValue = activeExercise ? answerMap[activeExercise.id] ?? "" : "";

  return {
    activeAnswerValue,
    activeAttemptCount,
    activeExercise,
    activeIncorrectCount,
    activeModule,
    allModulesCompleted,
    completedModuleCount,
    correctCount,
    currentAssessment,
    currentQuestionNumber,
    currentQuestionProgress,
    currentResult,
    exercises,
    getExerciseCanonicalAnswer,
    getLocalizedExercisePrompt,
    handleAnswerChange,
    handleResetAnswer,
    handleSubmit,
    incorrectExercisesAcrossModules,
    inputRefs,
    isCompletedPractice,
    localizedPracticeModeLabel,
    moduleCompletionMap,
    modules,
    overallAttempts,
    overallCorrectCount,
    overallIncorrectAttempts,
    overallTypingCount,
    safeActiveExerciseIndex,
    sentenceMilestoneSummary,
    registerInputRef,
    setActiveExerciseIndex,
    setActiveMode,
    summaryAllModulesCompleted,
    typingCount,
    unlockedModes,
  };
}
