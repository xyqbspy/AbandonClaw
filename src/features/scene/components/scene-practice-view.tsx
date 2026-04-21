"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  APPLE_BADGE_SUBTLE,
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_PANEL_INFO,
  APPLE_PANEL_RAISED,
} from "@/lib/ui/apple-style";
import {
  PracticeAssessmentLevel,
  PracticeMode,
  PracticeSet,
} from "@/lib/types/learning-flow";
import { ScenePracticeSnapshotResponse } from "@/lib/utils/learning-api";
import { getPracticeAssessmentMessage, getPracticeSourceText } from "./scene-practice-messages";
import { ScenePracticeHeader } from "./scene-practice-header";
import { ScenePracticeModuleTabs } from "./scene-practice-module-tabs";
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
  onSentenceCompleted,
  onPracticeRunStart,
  onPracticeAttempt,
  onPracticeModeComplete,
  onReviewScene,
  onRepeatPractice,
  onOpenVariants,
  onToggleAnswer,
}: ScenePracticeViewProps) {
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

  const inputStateClassName =
    currentResult === "correct"
      ? "border-emerald-500 text-emerald-700 ring-4 ring-emerald-100"
      : currentResult === "incorrect"
        ? "border-rose-500 text-rose-600 ring-4 ring-rose-100"
        : "border-[#E2E8F0] text-[#1A365D] focus:border-[#3182CE] focus:ring-4 focus:ring-[#DBEAFE]";

  return (
    <div className="bg-[var(--app-page-background)] pb-10">
      <div className="mx-auto w-full max-w-[480px] space-y-[var(--mobile-space-md)]">
        <ScenePracticeHeader
          allModulesCompleted={allModulesCompleted}
          headerMenuOpen={headerMenuOpen}
          labels={labels}
          localizedPracticeModeLabel={localizedPracticeModeLabel}
          onBack={onBack}
          onCloseMenu={closeHeaderMenu}
          onComplete={onComplete}
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
