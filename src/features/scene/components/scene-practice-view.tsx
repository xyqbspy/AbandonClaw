"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  SCENE_MOBILE_NARROW_STACK_CLASSNAME,
  SCENE_MOBILE_PANEL_CLASSNAME,
  SCENE_MOBILE_PRIMARY_ACTION_CLASSNAME,
  SCENE_MOBILE_SECONDARY_ACTION_CLASSNAME,
  SCENE_MOBILE_SOFT_PANEL_CLASSNAME,
  SCENE_MOBILE_SURFACE_CLASSNAME,
} from "./scene-page-styles";
import {
  PracticeAssessmentLevel,
  PracticeMode,
  PracticeSet,
} from "@/lib/types/learning-flow";
import { ScenePracticeSnapshotResponse } from "@/lib/utils/learning-api";
import { getPracticeSourceText } from "./scene-practice-messages";
import { ScenePracticeHeader } from "./scene-practice-header";
import { ScenePracticeModuleTabs } from "./scene-practice-module-tabs";
import { ScenePracticeQuestionCard } from "./scene-practice-question-card";
import { ScenePracticeViewLabels } from "./scene-view-labels";
import { useScenePracticeSessionState } from "./use-scene-practice-session-state";

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
  completing?: boolean;
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
  labels,
  regenerating = false,
  onBack,
  onDelete,
  onRegenerate,
  onComplete,
  completing = false,
  onSentenceCompleted,
  onPracticeRunStart,
  onPracticeAttempt,
  onPracticeModeComplete,
  onReviewScene,
  onRepeatPractice,
  onOpenVariants,
  onToggleAnswer,
}: ScenePracticeViewProps) {
  const {
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
  } = useScenePracticeSessionState({
    labels,
    practiceSet,
    onPracticeAttempt,
    onPracticeModeComplete,
    onPracticeRunStart,
    onSentenceCompleted,
  });

  const sourceText = getPracticeSourceText({
    generationSource: practiceSet?.generationSource,
    sourceType: practiceSet?.sourceType,
    sourceSceneTitle: practiceSet?.sourceSceneTitle,
    sourceVariantTitle: practiceSet?.sourceVariantTitle,
    labels,
  });
  const headerMenuKey = `${practiceSet?.id ?? "empty"}:${allModulesCompleted}:${practiceSet?.status ?? "idle"}`;
  const [headerMenuState, setHeaderMenuState] = useState({
    key: headerMenuKey,
    open: false,
  });
  const headerMenuOpen = headerMenuState.key === headerMenuKey ? headerMenuState.open : false;
  const closeHeaderMenu = () => setHeaderMenuState({ key: headerMenuKey, open: false });
  const toggleHeaderMenu = () =>
    setHeaderMenuState((current) => ({
      key: headerMenuKey,
      open: current.key === headerMenuKey ? !current.open : true,
    }));

  return (
    <div className={SCENE_MOBILE_SURFACE_CLASSNAME}>
      <div className={SCENE_MOBILE_NARROW_STACK_CLASSNAME}>
        <ScenePracticeHeader
          allModulesCompleted={allModulesCompleted}
          headerMenuOpen={headerMenuOpen}
          labels={labels}
          localizedPracticeModeLabel={localizedPracticeModeLabel}
          onBack={onBack}
          onCloseMenu={closeHeaderMenu}
          onComplete={onComplete}
          completing={completing}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          onToggleMenu={toggleHeaderMenu}
          practiceSet={practiceSet}
          regenerating={regenerating}
        />

        <ScenePracticeModuleTabs
          activeMode={activeModule?.mode ?? null}
          moduleCompletionMap={moduleCompletionMap}
          modules={modules}
          onSelectMode={(mode) => {
            setActiveMode(mode);
            setActiveExerciseIndex(0);
          }}
          unlockedModes={unlockedModes}
        />

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
          <section className={`p-[var(--mobile-space-sheet)] ${SCENE_MOBILE_PANEL_CLASSNAME}`}>
            <p className="text-[length:var(--mobile-font-body-sm)] text-[var(--muted-foreground)]">{labels.empty}</p>
          </section>
        ) : (
          <>
            <ScenePracticeQuestionCard
              activeAnswerValue={activeAnswerValue}
              activeAttemptCount={activeAttemptCount}
              activeExercise={activeExercise}
              activeIncorrectCount={activeIncorrectCount}
              activeModuleMode={activeModule?.mode}
              currentAssessment={currentAssessment}
              currentQuestionNumber={currentQuestionNumber}
              currentResult={currentResult}
              exerciseCount={exercises.length}
              getExerciseCanonicalAnswer={getExerciseCanonicalAnswer}
              handleAnswerChange={handleAnswerChange}
              handleResetAnswer={handleResetAnswer}
              handleSubmit={handleSubmit}
              labels={labels}
              registerInputRef={registerInputRef}
              safeActiveExerciseIndex={safeActiveExerciseIndex}
              setActiveExerciseIndex={setActiveExerciseIndex}
              showAnswerMap={showAnswerMap}
              onToggleAnswer={onToggleAnswer}
            />

            <section className={`p-[var(--mobile-space-xl)] ${SCENE_MOBILE_SOFT_PANEL_CLASSNAME}`}>
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
              <section className={`p-[var(--mobile-space-xl)] ${SCENE_MOBILE_PANEL_CLASSNAME}`}>
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
                            className={SCENE_MOBILE_SECONDARY_ACTION_CLASSNAME}
                            onClick={() => onRepeatPractice?.()}
                          >
                            {labels.summaryRepeatAction}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={SCENE_MOBILE_PRIMARY_ACTION_CLASSNAME}
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
                            className={SCENE_MOBILE_SECONDARY_ACTION_CLASSNAME}
                            onClick={() => onRepeatPractice?.()}
                          >
                            {labels.summaryRepeatAction}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={SCENE_MOBILE_PRIMARY_ACTION_CLASSNAME}
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
          <details className={`p-[var(--mobile-space-xl)] ${SCENE_MOBILE_PANEL_CLASSNAME}`}>
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
