"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  MoreHorizontal,
} from "lucide-react";
import { AnimatedLoadingText } from "@/components/shared/action-loading";
import {
  APPLE_BADGE_INFO,
  APPLE_BADGE_SUBTLE,
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_PANEL_INFO,
  APPLE_PANEL_RAISED,
  APPLE_PANEL_WARNING,
} from "@/lib/ui/apple-style";
import {
  PracticeAssessmentLevel,
  PracticeMode,
  PracticeSet,
} from "@/lib/types/learning-flow";
import { ScenePracticeSnapshotResponse } from "@/lib/utils/learning-api";
import { updatePracticeSetSession } from "@/lib/utils/scene-learning-flow-storage";
import {
  buildAcceptedPracticeAnswers,
  deriveDisplayedClozeAnswer,
  getPracticeAssessment,
  hasPracticeAssessmentImproved,
  isPracticeAssessmentComplete,
} from "@/lib/shared/scene-practice-assessment";
import { getPracticeModeLabel } from "@/lib/shared/scene-training-copy";
import { getPracticeAssessmentMessage, getPracticeSourceText } from "./scene-practice-messages";
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

type ScenePracticeViewProps = {
  practiceSet: PracticeSet | null;
  practiceSnapshot?: ScenePracticeSnapshotResponse | null;
  showAnswerMap: Record<string, boolean>;
  appleButtonSmClassName: string;
  appleDangerButtonSmClassName: string;
  labels: ScenePracticeViewLabels;
  regenerating?: boolean;
  onBack: () => void;
  onDelete: () => void;
  onRegenerate?: () => void;
  onComplete: () => void;
  onSentenceCompleted?: (payload: {
    exerciseId: string;
    sentenceId?: string | null;
  }) => void;
  onPracticeRunStart?: (payload: {
    practiceSetId: string;
    mode: PracticeMode;
    sourceType: "original" | "variant";
    sourceVariantId?: string | null;
  }) => void;
  onPracticeAttempt?: (payload: {
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
  }) => void;
  onPracticeModeComplete?: (payload: {
    practiceSetId: string;
    mode: PracticeMode;
    nextMode?: PracticeMode;
  }) => void;
  onReviewScene: () => void;
  onRepeatPractice?: () => void;
  onOpenVariants: () => void;
  onToggleAnswer: (exerciseId: string) => void;
};

export function ScenePracticeView({
  practiceSet,
  practiceSnapshot = null,
  showAnswerMap,
  appleButtonSmClassName: _appleButtonSmClassName,
  appleDangerButtonSmClassName: _appleDangerButtonSmClassName,
  labels,
  regenerating = false,
  onBack,
  onDelete,
  onRegenerate,
  onComplete,
  onSentenceCompleted,
  onPracticeRunStart,
  onPracticeAttempt,
  onPracticeModeComplete,
  onReviewScene,
  onRepeatPractice,
  onOpenVariants,
  onToggleAnswer,
}: ScenePracticeViewProps) {
  const moduleChipBaseClassName =
    "relative rounded-[12px] border-2 px-[var(--mobile-space-md)] py-[var(--mobile-space-md)] text-center text-[length:var(--mobile-font-body-sm)] font-bold transition-all duration-200";
  const panelClassName =
    `${APPLE_PANEL_RAISED} rounded-[24px]`;
  const softPanelClassName =
    `${APPLE_PANEL_INFO} rounded-[18px] shadow-[var(--app-shadow-soft)]`;
  const secondaryActionButtonClassName =
    `${APPLE_BUTTON_BASE} h-[var(--mobile-button-height)] rounded-[14px] px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-bold`;
  const primaryActionButtonClassName =
    `${APPLE_BUTTON_STRONG} h-[var(--mobile-button-height)] rounded-[14px] px-[var(--mobile-space-xl)] text-[length:var(--mobile-font-body-sm)] font-bold`;
  const assessmentTextClassName = (assessment: PracticeAssessmentLevel | null | undefined) => {
    if (assessment === "complete") return "text-emerald-700";
    if (assessment === "structure") return "text-sky-700";
    if (assessment === "keyword") return "text-amber-700";
    return "text-destructive";
  };

  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [resultMap, setResultMap] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [assessmentMap, setAssessmentMap] = useState<
    Record<string, PracticeAssessmentLevel | null>
  >({});
  const [attemptCountMap, setAttemptCountMap] = useState<Record<string, number>>({});
  const [incorrectCountMap, setIncorrectCountMap] = useState<Record<string, number>>({});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [activeMode, setActiveMode] = useState<PracticeMode>("cloze");
  const [latestMilestone, setLatestMilestone] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
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

  useEffect(() => {
    const sessionState = practiceSet?.sessionState;
    setAnswerMap(sessionState?.answerMap ?? {});
    setResultMap(sessionState?.resultMap ?? {});
    setAssessmentMap(sessionState?.assessmentMap ?? {});
    setAttemptCountMap(sessionState?.attemptCountMap ?? {});
    setIncorrectCountMap(sessionState?.incorrectCountMap ?? {});
    setActiveExerciseIndex(sessionState?.activeExerciseIndex ?? 0);
    setActiveMode(sessionState?.activeMode ?? (practiceSet?.mode ?? modules[0]?.mode ?? "cloze"));
    setLatestMilestone(null);
    reportedModeCompletionRef.current = new Set();
    reportedUnlockedModesRef.current = buildReportedUnlockedModesSeed(modules);
    reportedAllModulesCompletedRef.current = false;
    startedPracticeRunKeysRef.current = new Set();
  }, [modules, practiceSet?.id, practiceSet?.mode, practiceSet?.sessionState]);

  useEffect(() => {
    if (modules.length === 0) return;
    if (unlockedModes.has(activeMode)) return;
    setActiveMode(modules[0]?.mode ?? "cloze");
  }, [activeMode, modules, unlockedModes]);

  const activeModule = modules.find((module) => module.mode === activeMode) ?? modules[0] ?? null;
  const exercises = activeModule?.exercises ?? [];
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
  const sourceText = getPracticeSourceText({
    generationSource: practiceSet?.generationSource,
    sourceType: practiceSet?.sourceType,
    sourceSceneTitle: practiceSet?.sourceSceneTitle,
    sourceVariantTitle: practiceSet?.sourceVariantTitle,
    labels,
  });
  const getExerciseCanonicalAnswer = (
    exercise: (typeof exercises)[number] | null | undefined,
  ) => {
    if (!exercise) return "";
    return deriveDisplayedClozeAnswer(exercise.answer.text, exercise.cloze?.displayText);
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
    practiceSet?.id,
    practiceSet?.sourceType,
    practiceSet?.sourceVariantId,
    practiceSet?.status,
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
      activeMode,
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
    activeMode,
    safeActiveExerciseIndex,
  ]);

  useEffect(() => {
    if (!practiceSet || !onPracticeModeComplete) return;
    modules.forEach((module, index) => {
      if (!moduleCompletionMap[module.mode]) return;
      const modeKey = `${practiceSet.id}:${module.mode}`;
      if (reportedModeCompletionRef.current.has(modeKey)) return;
      reportedModeCompletionRef.current.add(modeKey);
      setLatestMilestone(notifyPracticeModuleCompleted(labels, getPracticeModeLabel(module.mode)));
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
      setLatestMilestone(notifyPracticeModuleUnlocked(labels, getPracticeModeLabel(module.mode)));
    });
  }, [labels, modules, unlockedModes]);

  useEffect(() => {
    if (!practiceSet || !allModulesCompleted) return;
    if (reportedAllModulesCompletedRef.current) return;
    reportedAllModulesCompletedRef.current = true;
    setLatestMilestone(notifyAllPracticeModulesCompleted(labels));
  }, [allModulesCompleted, labels, practiceSet]);

  useEffect(() => {
    setHeaderMenuOpen(false);
  }, [practiceSet?.id, allModulesCompleted, practiceSet?.status]);

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
      const milestoneText = notifyPracticeSentenceMilestone(labels, assessment);
      if (milestoneText) {
        setLatestMilestone(milestoneText);
      }
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

  const inputStateClassName =
    currentResult === "correct"
      ? "border-emerald-500 text-emerald-700 ring-4 ring-emerald-100"
      : currentResult === "incorrect"
        ? "border-rose-500 text-rose-600 ring-4 ring-rose-100"
        : "border-[#E2E8F0] text-[#1A365D] focus:border-[#3182CE] focus:ring-4 focus:ring-[#DBEAFE]";

  return (
    <div className="bg-[var(--app-page-background)] pb-10">
      <div className="mx-auto w-full max-w-[480px] space-y-[var(--mobile-space-md)] px-[var(--mobile-space-sheet)] pt-[var(--mobile-space-sheet)]">
        <header className="flex flex-nowrap items-center justify-between gap-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)]">
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-[var(--mobile-space-sm)] whitespace-nowrap text-[length:var(--mobile-font-body-sm)] font-semibold text-[var(--muted-foreground)]"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            <span>{labels.back}</span>
          </button>

          <div className="min-w-0 flex-1 overflow-hidden text-center">
            <p className="truncate whitespace-nowrap text-[length:var(--mobile-font-title)] font-extrabold text-foreground">
              {localizedPracticeModeLabel}
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="打开练习菜单"
              aria-expanded={headerMenuOpen}
            className="inline-flex size-[var(--mobile-icon-button)] items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--app-button-secondary-bg)]/80 disabled:opacity-50"
              onClick={() => setHeaderMenuOpen((open) => !open)}
              disabled={!practiceSet}
            >
              <MoreHorizontal className="size-4" />
            </button>

            {headerMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="关闭练习菜单"
                  className="fixed inset-0 z-10"
                  onClick={() => setHeaderMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 min-w-[clamp(160px,42vw,172px)] overflow-hidden rounded-[18px] border border-[var(--app-border-soft)] bg-[var(--app-surface)] shadow-[var(--app-shadow-raised)]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-[var(--mobile-space-xl)] py-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground transition-colors hover:bg-[var(--app-surface-subtle)] disabled:text-[var(--muted-foreground)]"
                    onClick={() => {
                      if (regenerating) return;
                      onRegenerate?.();
                    }}
                    disabled={!practiceSet || !onRegenerate || regenerating}
                  >
                    <span>
                      {regenerating ? (
                        <AnimatedLoadingText text={labels.regenerating} />
                      ) : (
                        labels.regenerate
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border-t border-[var(--app-border-soft)] px-[var(--mobile-space-xl)] py-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground transition-colors hover:bg-[var(--app-surface-subtle)]"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      onDelete();
                    }}
                  >
                    <span>{labels.delete}</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border-t border-[var(--app-border-soft)] px-[var(--mobile-space-xl)] py-[var(--mobile-space-md)] text-left text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground transition-colors hover:bg-[var(--app-surface-subtle)] disabled:text-[var(--muted-foreground)]"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      onComplete();
                    }}
                    disabled={!practiceSet || practiceSet.status === "completed" || !allModulesCompleted}
                  >
                    <span>{labels.complete}</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        {modules.length > 1 ? (
          <section className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-max gap-[var(--mobile-space-md)]">
            {modules.map((module) => {
              const unlocked = unlockedModes.has(module.mode);
              const done = moduleCompletionMap[module.mode];
              const active = activeModule?.mode === module.mode;
              return (
                <button
                  key={module.mode}
                  type="button"
                  className={`${moduleChipBaseClassName} ${
                    active
                      ? "border-[var(--app-scene-panel-accent)] bg-[var(--app-scene-panel-accent-soft)] text-[var(--app-scene-panel-accent)]"
                      : unlocked
                        ? "border-transparent bg-[var(--app-surface)] text-foreground shadow-[var(--app-shadow-soft)]"
                        : "border-transparent bg-[var(--app-surface-subtle)] text-[var(--muted-foreground)] opacity-60"
                  } min-w-[clamp(112px,30vw,124px)] shrink-0`}
                  disabled={!unlocked}
                  onClick={() => {
                    setActiveMode(module.mode);
                    setActiveExerciseIndex(0);
                  }}
                >
                  {!unlocked ? <Lock className="absolute right-1.5 top-1.5 size-3 text-[var(--muted-foreground)]" /> : null}
                  <span className="block">{getPracticeModeLabel(module.mode)}</span>
                  <span className="mt-1 block text-[length:var(--mobile-font-caption)] font-medium opacity-80">
                    {done ? "已完成" : unlocked ? "进行中" : "未解锁"}
                  </span>
                </button>
              );
            })}
            </div>
          </section>
        ) : null}

        <section className="space-y-[var(--mobile-space-sm)]">
          <div className="flex items-center justify-between gap-[var(--mobile-space-md)] text-[length:var(--mobile-font-meta)] font-bold text-[var(--muted-foreground)]">
            <p>
              {labels.currentQuestionLabel}：{currentQuestionNumber}/{exercises.length}
            </p>
            <p>
              {Math.floor(currentQuestionProgress)}%
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--app-scene-panel-accent)] transition-[width] duration-300"
              style={{ width: `${currentQuestionProgress}%` }}
            />
          </div>
        </section>

        {practiceSet ? (
          <p className="text-[length:var(--mobile-font-meta)] leading-5 text-[var(--muted-foreground)]">
            <span className="font-semibold text-foreground">{sourceText}</span>
          </p>
        ) : null}

        {!practiceSet ? (
          <section className={`p-[var(--mobile-space-sheet)] ${panelClassName}`}>
            <p className="text-[length:var(--mobile-font-body-sm)] text-[var(--muted-foreground)]">{labels.empty}</p>
          </section>
        ) : (
          <>
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
                  {labels.currentQuestionLabel}：{currentQuestionNumber}/{exercises.length}
                </span>
                <button
                  type="button"
                  className={`${APPLE_BADGE_SUBTLE} px-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)] text-[length:var(--mobile-font-meta)] disabled:opacity-50`}
                  disabled={safeActiveExerciseIndex >= exercises.length - 1}
                  onClick={() =>
                    setActiveExerciseIndex((current) => Math.min(exercises.length - 1, current + 1))
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
                      {activeModule?.mode === "full_dictation" ? (
                        <textarea
                          ref={(element) => {
                            inputRefs.current[activeExercise.id] = element as unknown as HTMLInputElement;
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
                            inputRefs.current[activeExercise.id] = element;
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

          <section className={`p-[var(--mobile-space-xl)] ${softPanelClassName}`}>
            <div className="flex items-center justify-between gap-[var(--mobile-space-md)] text-[length:var(--mobile-font-body-sm)] font-bold text-foreground">
              <span>📊 本轮进度</span>
              <span className="text-[var(--app-scene-panel-accent)]">
                关键词 {sentenceMilestoneSummary.keywordCount} | 骨架 {sentenceMilestoneSummary.structureCount} |
                复现 {sentenceMilestoneSummary.completeCount}
              </span>
            </div>
            <p className="mt-2 border-t border-[var(--app-border-soft)] pt-2 text-center text-[length:var(--mobile-font-caption)] text-[var(--muted-foreground)]">
              完成当前题型所有题目后自动解锁下一题型
            </p>
          </section>

          <section className="px-1 text-[length:var(--mobile-font-meta)] text-[var(--muted-foreground)]">
            <div className="flex items-center justify-between gap-[var(--mobile-space-md)]">
              <span>📋 当前题型进度：{correctCount}/{typingCount}</span>
              <span>✅ 提交次数：{overallAttempts}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-[var(--mobile-space-md)]">
              <span>❌ 错误次数：{overallIncorrectAttempts}</span>
              <span />
            </div>
          </section>

            {practiceSet && summaryAllModulesCompleted ? (
              <section className={`p-[var(--mobile-space-xl)] ${panelClassName}`}>
                  <div className="flex items-center gap-[var(--mobile-space-sm)] text-foreground">
                    <CheckCircle2 className="size-4" />
                    <p className="text-[length:var(--mobile-font-body-sm)] font-bold">{labels.summaryTitle}</p>
                  </div>
                  <div className="mt-[var(--mobile-space-xl)] space-y-[var(--mobile-space-sm)] text-[length:var(--mobile-font-body-sm)] text-[var(--muted-foreground)]">
                    <p>
                      {labels.summaryCompleted}：
                      <span className="font-semibold text-foreground">
                        {overallCorrectCount}/{overallTypingCount}
                      </span>
                    </p>
                    <p>
                      {labels.summaryAttempts}：
                      <span className="font-semibold text-foreground">{overallAttempts}</span>
                    </p>
                    <p>
                      {labels.summaryIncorrect}：
                      <span className="font-semibold text-foreground">{overallIncorrectAttempts}</span>
                    </p>
                    <p className="pt-1 font-semibold text-foreground">{labels.summaryMistakeChunks}</p>
                    {incorrectExercisesAcrossModules.length === 0 ? (
                      <>
                        <p>{labels.summaryNoMistakes}</p>
                        <p>{labels.summaryVariantHint}</p>
                        <div className="flex flex-wrap gap-[var(--mobile-space-sm)] pt-2">
                          {isCompletedPractice ? (
                            <button
                              type="button"
                              className={secondaryActionButtonClassName}
                              onClick={() => onRepeatPractice?.()}
                            >
                              {labels.summaryRepeatAction}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={primaryActionButtonClassName}
                            onClick={onOpenVariants}
                          >
                            {labels.summaryVariantAction}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <ul className="space-y-1">
                          {incorrectExercisesAcrossModules.map((exercise) => (
                            <li key={exercise.id}>
                              {(exercise.type === "chunk_cloze" && getExerciseCanonicalAnswer(exercise)) ||
                              (typeof exercise.metadata?.chunkText === "string" && exercise.metadata.chunkText.trim()) ||
                              exercise.answer.text.trim() ||
                              exercise.chunkId ||
                              exercise.id}
                              {getLocalizedExercisePrompt(exercise)
                                ? ` - ${getLocalizedExercisePrompt(exercise)}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                        <p>{labels.summaryReviewHint}</p>
                        <div className="flex flex-wrap gap-[var(--mobile-space-sm)] pt-2">
                          {isCompletedPractice ? (
                            <button
                              type="button"
                              className={secondaryActionButtonClassName}
                              onClick={() => onRepeatPractice?.()}
                            >
                              {labels.summaryRepeatAction}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={primaryActionButtonClassName}
                            onClick={onReviewScene}
                          >
                            {labels.summaryReviewAction}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
              </section>
            ) : null}
          </>
        )}

        {practiceSet ? (
          <details className={`p-[var(--mobile-space-xl)] ${panelClassName}`}>
            <summary className="cursor-pointer text-[length:var(--mobile-font-body-sm)] font-semibold text-foreground">练习调试视图</summary>
            <div className="mt-[var(--mobile-space-md)] space-y-[var(--mobile-space-sm)] text-[length:var(--mobile-font-caption)] text-[var(--muted-foreground)]">
              <p>practiceSetId: {practiceSet.id}</p>
              <p>sourceType: {practiceSet.sourceType}</p>
              <p>当前模块: {activeModule?.mode ?? "-"}</p>
              <p>模块完成数: {completedModuleCount}/{modules.length}</p>
              <p>总作答数: {overallAttempts}</p>
              <p>总正确数: {overallCorrectCount}</p>
              <p>runId: {practiceSnapshot?.run?.id ?? "-"}</p>
              <p>runStatus: {practiceSnapshot?.run?.status ?? "-"}</p>
              <p>sessionId: {practiceSnapshot?.run?.sessionId ?? "-"}</p>
              <p>后端当前模块: {practiceSnapshot?.run?.currentMode ?? "-"}</p>
              <p>
                后端已完成模块:{" "}
                {practiceSnapshot?.run?.completedModes?.length
                  ? practiceSnapshot.run.completedModes.join(" / ")
                  : "-"}
              </p>
              <p>后端总 attempt: {practiceSnapshot?.summary.totalAttemptCount ?? 0}</p>
              <p>后端正确 attempt: {practiceSnapshot?.summary.correctAttemptCount ?? 0}</p>
              <p>最近评估等级: {practiceSnapshot?.summary.latestAssessmentLevel ?? "-"}</p>
              <p>最近 exerciseId: {practiceSnapshot?.latestAttempt?.exerciseId ?? "-"}</p>
              <p>最近 sentenceId: {practiceSnapshot?.latestAttempt?.sentenceId ?? "-"}</p>
              <p>最近用户答案: {practiceSnapshot?.latestAttempt?.userAnswer ?? "-"}</p>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

