"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  PracticeAssessmentLevel,
  PracticeMode,
  PracticeSet,
} from "@/lib/types/learning-flow";
import { ScenePracticeSnapshotResponse } from "@/lib/utils/learning-api";
import { updatePracticeSetSession } from "@/lib/utils/scene-learning-flow-storage";
import {
  APPLE_BODY_TEXT,
  APPLE_INPUT_BASE,
  APPLE_LIST_ITEM,
  APPLE_META_TEXT,
  APPLE_PANEL,
  APPLE_PANEL_RAISED,
  APPLE_TITLE_MD,
  APPLE_TITLE_SM,
} from "@/lib/ui/apple-style";
import {
  buildAcceptedPracticeAnswers,
  getPracticeAssessment,
  hasPracticeAssessmentImproved,
  isPracticeAssessmentComplete,
} from "@/lib/shared/scene-practice-assessment";
import { getPracticeModeLabel } from "@/lib/shared/scene-training-copy";
import {
  getPracticeAssessmentMessage,
  getPracticeCompletionHint,
  getPracticeSourceText,
} from "./scene-practice-messages";
import {
  buildReportedUnlockedModesSeed,
  notifyAllPracticeModulesCompleted,
  notifyPracticeModuleCompleted,
  notifyPracticeModuleUnlocked,
  notifyPracticeSentenceMilestone,
} from "./scene-practice-notify";
import {
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
  onBack: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onSentencePracticed?: (payload: {
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
  appleButtonSmClassName,
  appleDangerButtonSmClassName,
  labels,
  onBack,
  onDelete,
  onComplete,
  onSentencePracticed,
  onPracticeRunStart,
  onPracticeAttempt,
  onPracticeModeComplete,
  onReviewScene,
  onRepeatPractice,
  onOpenVariants,
  onToggleAnswer,
}: ScenePracticeViewProps) {
  const moduleChipBaseClassName =
    "rounded-[var(--app-radius-pill)] border px-3 py-1.5 text-xs font-semibold transition-[background-color,border-color,color] duration-150";
  const milestoneCardClassName = `${APPLE_PANEL} rounded-[var(--app-radius-card)] px-3 py-3`;
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
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const reportedModeCompletionRef = useRef<Set<string>>(new Set());
  const reportedUnlockedModesRef = useRef<Set<PracticeMode>>(new Set());
  const reportedAllModulesCompletedRef = useRef(false);

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
  const getLocalizedModeDescription = (mode: PracticeMode) => {
    if (mode === "cloze") return "首发题型先从填空开始，帮助你抓住场景里的关键表达。";
    if (mode === "guided_recall") return "先看到前半句，再把后半句主动提取出来，训练句子骨架和表达衔接。";
    if (mode === "sentence_recall") return "只给你中文提示，整句完整复现，训练句子从理解到主动输出的闭环。";
    return "最后一层直接默写整段，把场景从局部提取推进到连续复现。";
  };
  const getLocalizedCompletionRequirement = (mode: PracticeMode) => {
    if (mode === "cloze") return "先完成本轮全部填空题，才能进入下一步的半句复现。";
    if (mode === "guided_recall") return "先完成填空，再完成本轮半句复现。";
    if (mode === "sentence_recall") return "先完成半句复现，再完成本轮整句复现。";
    return "完成整句复现后，再完成本轮全文默写。";
  };
  const getLocalizedExercisePrompt = (
    exercise: (typeof exercises)[number] | null | undefined,
  ) => {
    const practiceMode = exercise?.metadata?.practiceMode;
    if (practiceMode === "guided_recall") return "看到前半句，补出后半句";
    if (practiceMode === "sentence_recall") return "看中文提示，完整复现这句";
    if (practiceMode === "full_dictation") return "根据整段中文提示，默写全文";
    if (exercise?.type === "translation_prompt") return "看中文提示，完整复现这句";
    return exercise?.prompt ?? labels.clozePrompt;
  };
  const practiceEntryTitle = activeModule?.title?.trim() || practiceSet?.title?.trim() || labels.practiceEntryTitle;
  const practiceModeLabel =
    activeModule?.modeLabel?.trim() || practiceSet?.modeLabel?.trim() || "填空练习";
  const practiceDescription = activeModule?.description?.trim() || practiceSet?.description?.trim() || labels.practiceHint;
  const completionRequirement =
    activeModule?.completionRequirement?.trim() ||
    practiceSet?.completionRequirement?.trim() ||
    "完成首发练习模块：答对当前题组后，再点击“完成本轮练习”。";
  const localizedPracticeModeLabel = getPracticeModeLabel(activeModule?.mode ?? practiceSet?.mode ?? "cloze");
  const localizedPracticeDescription = activeModule
    ? getLocalizedModeDescription(activeModule.mode)
    : practiceSet?.mode
      ? getLocalizedModeDescription(practiceSet.mode)
      : labels.practiceHint;
  const localizedCompletionRequirement = activeModule
    ? getLocalizedCompletionRequirement(activeModule.mode)
    : practiceSet?.mode
      ? getLocalizedCompletionRequirement(practiceSet.mode)
      : "完成首发练习模块后，再点击“完成本轮练习”。";
  const completedModuleCount = modules.filter((module) => moduleCompletionMap[module.mode]).length;
  const allModulesCompleted = modules.length === 0 || completedModuleCount === modules.length;
  const isCompletedPractice = practiceSet?.status === "completed";
  const summaryCompletedModuleCount = isCompletedPractice ? modules.length : completedModuleCount;
  const summaryAllModulesCompleted = allModulesCompleted || isCompletedPractice;
  const hasNextModule = Boolean(
    activeModule && modules.findIndex((module) => module.mode === activeModule.mode) < modules.length - 1,
  );
  const nextModule = activeModule
    ? modules[modules.findIndex((module) => module.mode === activeModule.mode) + 1] ?? null
    : null;
  const sourceText = getPracticeSourceText({
    sourceType: practiceSet?.sourceType,
    sourceSceneTitle: practiceSet?.sourceSceneTitle,
    sourceVariantTitle: practiceSet?.sourceVariantTitle,
    labels,
  });
  const completionHint = getPracticeCompletionHint({
    allModulesCompleted: summaryAllModulesCompleted,
    allTypingCompleted,
    hasNextModule,
    nextModuleLabel: nextModule ? getPracticeModeLabel(nextModule.mode) : null,
    labels,
  });

  useEffect(() => {
    if (!practiceSet || !activeModule || practiceSet.status === "completed") return;
    onPracticeRunStart?.({
      practiceSetId: practiceSet.id,
      mode: activeModule.mode,
      sourceType: practiceSet.sourceType,
      sourceVariantId: practiceSet.sourceVariantId,
    });
  }, [activeModule, onPracticeRunStart, practiceSet]);

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
  }, [labels.moduleCompletedPrefix, moduleCompletionMap, modules, onPracticeModeComplete, practiceSet]);

  useEffect(() => {
    modules.forEach((module) => {
      if (!unlockedModes.has(module.mode)) return;
      if (reportedUnlockedModesRef.current.has(module.mode)) return;
      reportedUnlockedModesRef.current.add(module.mode);
      if (modules[0]?.mode === module.mode) return;
      setLatestMilestone(notifyPracticeModuleUnlocked(labels, getPracticeModeLabel(module.mode)));
    });
  }, [labels.moduleUnlockedPrefix, modules, unlockedModes]);

  useEffect(() => {
    if (!practiceSet || !allModulesCompleted) return;
    if (reportedAllModulesCompletedRef.current) return;
    reportedAllModulesCompletedRef.current = true;
    setLatestMilestone(notifyAllPracticeModulesCompleted(labels));
  }, [allModulesCompleted, labels.allModulesCompletedToast, practiceSet]);

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
      <section className={`space-y-3 rounded-[var(--app-radius-panel)] p-4 ${APPLE_PANEL_RAISED}`}>
        <div className="space-y-1">
          <p className={`${APPLE_TITLE_MD}`}>{practiceEntryTitle}</p>
          <p className={`${APPLE_META_TEXT}`}>
            {labels.practiceModePrefix}
            {localizedPracticeModeLabel}
          </p>
        </div>

        {modules.length > 1 ? (
          <div className="flex flex-wrap gap-2">
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
                      ? "border-[var(--app-surface-strong)] bg-[var(--app-surface-strong)] text-primary-foreground"
                      : unlocked
                        ? "border-[var(--app-border-soft)] bg-[var(--app-surface)] text-foreground"
                        : "border-[var(--app-border-soft)] bg-[var(--app-surface-subtle)] text-muted-foreground"
                  }`}
                  disabled={!unlocked}
                  onClick={() => {
                    setActiveMode(module.mode);
                    setActiveExerciseIndex(0);
                  }}
                >
                  {getPracticeModeLabel(module.mode)}
                  {done ? " · 已完成" : !unlocked ? " · 未解锁" : ""}
                </button>
              );
            })}
          </div>
        ) : null}

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
            disabled={!practiceSet || practiceSet.status === "completed" || !allModulesCompleted}
          >
            {labels.complete}
          </button>
        </div>

        <div className={`space-y-1 ${APPLE_META_TEXT}`}>
          {practiceSet?.sourceType === "variant" ? (
            <p>
              {labels.basedOnVariantPrefix}
              {sourceText}
            </p>
          ) : (
            <p>
              {labels.basedOnVariantPrefix}
              {sourceText}
            </p>
          )}
          <p className="mt-1">{localizedPracticeDescription}</p>
          <p className="mt-1">{localizedCompletionRequirement}</p>
          {practiceSet ? (
            <>
              <p className="mt-1">模块进度：{correctCount}/{typingCount}</p>
              <p className="mt-1">已完成模块：{completedModuleCount}/{modules.length}</p>
              <p className="mt-1">{labels.progressLabel}：{overallCorrectCount}/{overallTypingCount}</p>
              <p className="mt-1">{labels.totalAttemptsLabel}：{overallAttempts}</p>
              <p className="mt-1">{labels.totalIncorrectLabel}：{overallIncorrectAttempts}</p>
              <p className="mt-1">{completionHint}</p>
            </>
          ) : null}
        </div>
      </section>

      {practiceSet ? (
        <section className={`space-y-3 rounded-[var(--app-radius-panel)] p-4 ${APPLE_PANEL_RAISED}`}>
          <div className="space-y-1">
            <p className={APPLE_TITLE_SM}>{labels.sentenceMilestoneTitle}</p>
            <p className={APPLE_META_TEXT}>
              {sentenceMilestoneSummary.totalTracked > 0
                ? "系统会按你当前最高提取层级记录每一句的进展。"
                : labels.noMilestoneYet}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className={milestoneCardClassName}>
              <p className="text-xs font-semibold text-amber-700">{labels.sentenceMilestoneKeyword}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {sentenceMilestoneSummary.keywordCount}
              </p>
            </div>
            <div className={milestoneCardClassName}>
              <p className="text-xs font-semibold text-sky-700">{labels.sentenceMilestoneStructure}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {sentenceMilestoneSummary.structureCount}
              </p>
            </div>
            <div className={milestoneCardClassName}>
              <p className="text-xs font-semibold text-emerald-700">{labels.sentenceMilestoneComplete}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {sentenceMilestoneSummary.completeCount}
              </p>
            </div>
          </div>
          <div className={`space-y-1 ${APPLE_META_TEXT}`}>
            <p>
              {labels.moduleMilestoneLabel}：{completedModuleCount}/{modules.length}
            </p>
            <p>
              {labels.latestMilestoneLabel}：{latestMilestone ?? labels.noMilestoneYet}
            </p>
          </div>
        </section>
      ) : null}

      {practiceSet && summaryAllModulesCompleted ? (
        <section className={`space-y-3 rounded-[var(--app-radius-panel)] p-4 ${APPLE_PANEL_RAISED}`}>
          <div className="space-y-1">
            <p className={APPLE_TITLE_SM}>{labels.summaryTitle}</p>
            <p className={APPLE_META_TEXT}>
              {labels.summaryCompleted}: {overallCorrectCount}/{overallTypingCount}
            </p>
            <p className={APPLE_META_TEXT}>
              {labels.summaryAttempts}: {overallAttempts}
            </p>
            <p className={APPLE_META_TEXT}>
              {labels.summaryIncorrect}: {overallIncorrectAttempts}
            </p>
          </div>
          <div className={`space-y-1 ${APPLE_META_TEXT}`}>
            <p>{labels.summaryMistakeChunks}</p>
            {incorrectExercisesAcrossModules.length === 0 ? (
              <>
                <p>{labels.summaryNoMistakes}</p>
                <p>{labels.summaryVariantHint}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {isCompletedPractice ? (
                    <button
                      type="button"
                      className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
                      onClick={() => onRepeatPractice?.()}
                    >
                      {labels.summaryRepeatAction}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
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
                      {exercise.chunkId ?? exercise.id}
                      {getLocalizedExercisePrompt(exercise) ? ` - ${getLocalizedExercisePrompt(exercise)}` : ""}
                    </li>
                  ))}
                </ul>
                <p>{labels.summaryReviewHint}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {isCompletedPractice ? (
                    <button
                      type="button"
                      className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
                      onClick={() => onRepeatPractice?.()}
                    >
                      {labels.summaryRepeatAction}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${appleButtonSmClassName} px-3 py-1.5 text-sm`}
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

      {practiceSet ? (
        <details className={`rounded-[var(--app-radius-panel)] p-4 ${APPLE_PANEL}`}>
          <summary className={`cursor-pointer ${APPLE_TITLE_SM}`}>
            练习调试视图
          </summary>
          <div className={`mt-3 space-y-2 text-xs ${APPLE_META_TEXT}`}>
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
              后端已完成模块:
              {" "}
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

      {!practiceSet ? (
        <p className={APPLE_META_TEXT}>{labels.empty}</p>
      ) : (
        <section className={`space-y-3 rounded-[var(--app-radius-panel)] p-4 ${APPLE_PANEL_RAISED}`}>
          <div className={`flex items-center justify-between gap-3 ${APPLE_META_TEXT}`}>
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
                className={`p-3 ${APPLE_LIST_ITEM}`}
              >
                <p className={`text-xs ${APPLE_META_TEXT}`}>{activeExercise.type}</p>
                <p className={`mt-1 ${APPLE_BODY_TEXT}`}>{getLocalizedExercisePrompt(activeExercise)}</p>
                {activeExercise.cloze?.displayText ? (
                  <div className={`mt-2 rounded-[var(--app-radius-card)] px-3 py-2 text-[15px] leading-6 ${APPLE_PANEL}`}>
                    {activeExercise.cloze.displayText}
                  </div>
                ) : null}
                {activeExercise.hint ? (
                  <p className={`mt-2 text-xs ${APPLE_META_TEXT}`}>提示：{activeExercise.hint}</p>
                ) : null}
                {activeExercise.chunkId ? (
                  <p className={`mt-1 text-xs ${APPLE_META_TEXT}`}>
                    {labels.chunkPrefix} {activeExercise.chunkId}
                  </p>
                ) : null}
                <div className={`mt-2 space-y-1 text-xs ${APPLE_META_TEXT}`}>
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
                      const acceptedAnswers = buildAcceptedPracticeAnswers(
                        activeExercise.answer.text,
                        activeExercise.answer.acceptedAnswers,
                      );
                      const exerciseMode =
                        (activeModule?.mode ??
                          (activeExercise.metadata?.practiceMode as PracticeMode | undefined) ??
                          "cloze");
                      const assessment = getPracticeAssessment({
                        mode: exerciseMode,
                        expected: activeExercise.answer.text,
                        answer: currentAnswer,
                        acceptedAnswers,
                      });
                      const previousSentenceAssessment = deriveBestSentenceAssessment({
                        exercises: allTypingExercises,
                        assessmentMap,
                        sentenceId: activeExercise.sentenceId,
                        fallbackExerciseId: activeExercise.id,
                      });
                      const nextResult = isPracticeAssessmentComplete(assessment)
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
                      setAssessmentMap((prev) => ({
                        ...prev,
                        [activeExercise.id]: assessment,
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
                        exerciseId: activeExercise.id,
                        sentenceId: activeExercise.sentenceId,
                        userAnswer: currentAnswer,
                        assessmentLevel: assessment,
                        isCorrect: isPracticeAssessmentComplete(assessment),
                        metadata:
                          {
                            ...(activeExercise.metadata &&
                            typeof activeExercise.metadata === "object" &&
                            !Array.isArray(activeExercise.metadata)
                              ? (activeExercise.metadata as Record<string, unknown>)
                              : {}),
                            prompt: activeExercise.prompt ?? null,
                            displayText: activeExercise.cloze?.displayText ?? null,
                            expectedAnswer: activeExercise.answer.text,
                            hint: activeExercise.hint ?? null,
                          },
                      });

                      if (!isPracticeAssessmentComplete(assessment)) {
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
                    {activeModule?.mode === "full_dictation" ? (
                      <textarea
                        ref={(element) => {
                          inputRefs.current[activeExercise.id] = element as unknown as HTMLInputElement;
                        }}
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
                            setAssessmentMap((prev) => ({
                              ...prev,
                              [activeExercise.id]: null,
                            }));
                          }
                        }}
                        placeholder={`${labels.inputPlaceholder}，支持分行默写整段`}
                        rows={8}
                        className={`w-full px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--app-border-strong)] ${APPLE_INPUT_BASE}`}
                      />
                    ) : (
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
                            setAssessmentMap((prev) => ({
                              ...prev,
                              [activeExercise.id]: null,
                            }));
                          }
                        }}
                        placeholder={labels.inputPlaceholder}
                        className={`w-full px-3 py-2 text-sm outline-none focus:border-[var(--app-border-strong)] ${APPLE_INPUT_BASE}`}
                      />
                    )}
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
                          setAssessmentMap((prev) => ({
                            ...prev,
                            [activeExercise.id]: null,
                          }));
                        }}
                      >
                        {labels.resetAnswer}
                      </button>
                    </div>
                    {assessmentMap[activeExercise.id] ? (
                      <p
                        className={`text-xs font-medium ${assessmentTextClassName(
                          assessmentMap[activeExercise.id],
                        )}`}
                      >
                        {getPracticeAssessmentMessage(assessmentMap[activeExercise.id], labels)}
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
                  <div className={`mt-2 rounded-[var(--app-radius-card)] p-2 text-sm ${APPLE_PANEL}`}>
                    <p className={`text-xs ${APPLE_META_TEXT}`}>{labels.answerLabel}</p>
                    <p className={`mt-1 ${APPLE_BODY_TEXT}`}>{activeExercise.answer.text}</p>
                  </div>
                ) : null}
              </li>
            </ul>
          ) : (
            <p className={APPLE_META_TEXT}>{labels.finishQuestionSet}</p>
          )}
        </section>
      )}
    </div>
  );
}
