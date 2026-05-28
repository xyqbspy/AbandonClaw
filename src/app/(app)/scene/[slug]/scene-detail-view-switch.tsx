"use client";

import { ReactNode } from "react";
import { formatLoadingText, LoadingContent } from "@/components/shared/action-loading";
import { SceneExpressionMapView } from "@/features/scene/components/scene-expression-map-view";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
import { SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME } from "@/features/scene/components/scene-page-styles";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { Lesson } from "@/lib/types";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { PracticeSet, VariantSet } from "@/lib/types/learning-flow";
import { ScenePracticeSnapshotResponse } from "@/lib/utils/learning-api";
import { SceneBaseView } from "./scene-base-view";
import { SceneViewMode } from "./scene-detail-page-logic";
import { toVariantStatusLabel, toVariantTitle } from "./scene-detail-logic";
import { SceneVariantStudyView } from "./scene-variant-study-view";
import type {
  PracticeAttemptPayload,
  PracticeModeCompletePayload,
  PracticeRunStartPayload,
} from "./use-scene-practice-run-lifecycle";

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};

type SceneDetailViewSwitchProps = {
  viewMode: SceneViewMode;
  baseLesson: Lesson;
  activeVariantItem: VariantSet["variants"][number] | null;
  activeVariantLesson: Lesson | null;
  latestPracticeSet: PracticeSet | null;
  latestVariantSet: VariantSet | null;
  practiceSnapshot: ScenePracticeSnapshotResponse | null;
  showAnswerMap: Record<string, boolean>;
  expressionMap: ExpressionMapResponse | null;
  expressionMapError: string | null;
  expressionMapLoading: boolean;
  practiceRetryError: string | null;
  practiceError: string | null;
  variantsError: string | null;
  practiceLoading: boolean;
  sceneCompleting: boolean;
  canGeneratePractice: boolean;
  savedPhraseTexts: string[];
  appleButtonSmClassName: string;
  appleButtonLgClassName: string;
  appleDangerButtonSmClassName: string;
  trainingNextStep: (controls: {
    isSceneLooping: boolean;
    isSceneLoopLoading: boolean;
    toggleSceneLoopPlayback: () => void;
  }) => ReactNode;
  chunkDetailSheet: ReactNode;
  onBackToSceneView: () => void;
  onOpenVariantsView: () => void;
  onRegeneratePracticeFromView: () => void;
  onOpenExpressionMapView: () => void;
  onDeletePracticeSet: () => void;
  onPracticeComplete: () => void;
  onSentenceCompleted: (payload: {
    exerciseId: string;
    sentenceId?: string | null;
  }) => void;
  onSentencePracticeComplete?: (payload: {
    lesson: Lesson;
    sentence: import("@/lib/types").LessonSentence;
    blockId?: string;
  }) => void;
  onPracticeRunStart: (payload: PracticeRunStartPayload) => void;
  onPracticeAttempt: (payload: PracticeAttemptPayload) => void;
  onPracticeModeComplete: (payload: PracticeModeCompletePayload) => void;
  onRepeatPractice: () => void;
  onTogglePracticeAnswer: (exerciseId: string) => void;
  onMarkVariantSetComplete: () => void;
  onRepeatVariants: () => void;
  onDeleteVariantSet: () => void;
  onOpenVariantChunk: (chunk: string) => void;
  onOpenVariant: (variantId: string) => void;
  onDeleteVariantItem: (variantId: string) => void;
  onOpenExpressionDetail: (expression: string, relatedChunks: string[]) => void;
  onGeneratePracticeManually: (lesson: Lesson) => Promise<unknown>;
  onSavePhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onReviewPhrase: (payload: SavePhrasePayload) => Promise<{ created: boolean }>;
  onSceneFullPlay: (payload: { lesson: Lesson }) => void;
  onBlockPlayback: (payload: { lesson: Lesson; block: import("@/lib/types").LessonBlock }) => void;
  onSentencePlayback: (payload: { lesson: Lesson; sentence: import("@/lib/types").LessonSentence }) => void;
  onChunkEncounter: (payload: {
    lesson: Lesson;
    sentence: import("@/lib/types").LessonSentence;
    chunkText: string;
    blockId?: string;
    source?: "direct" | "related";
  }) => void;
};

export function SceneDetailViewSwitch({
  viewMode,
  baseLesson,
  activeVariantItem,
  activeVariantLesson,
  latestPracticeSet,
  latestVariantSet,
  practiceSnapshot,
  showAnswerMap,
  expressionMap,
  expressionMapError,
  expressionMapLoading,
  practiceRetryError,
  practiceError,
  variantsError,
  practiceLoading,
  sceneCompleting,
  canGeneratePractice,
  savedPhraseTexts,
  appleButtonSmClassName,
  appleButtonLgClassName,
  appleDangerButtonSmClassName,
  trainingNextStep,
  chunkDetailSheet,
  onBackToSceneView,
  onOpenVariantsView,
  onRegeneratePracticeFromView,
  onOpenExpressionMapView,
  onDeletePracticeSet,
  onPracticeComplete,
  onSentenceCompleted,
  onSentencePracticeComplete,
  onPracticeRunStart,
  onPracticeAttempt,
  onPracticeModeComplete,
  onRepeatPractice,
  onTogglePracticeAnswer,
  onMarkVariantSetComplete,
  onRepeatVariants,
  onDeleteVariantSet,
  onOpenVariantChunk,
  onOpenVariant,
  onDeleteVariantItem,
  onOpenExpressionDetail,
  onGeneratePracticeManually,
  onSavePhrase,
  onReviewPhrase,
  onSceneFullPlay,
  onBlockPlayback,
  onSentencePlayback,
  onChunkEncounter,
}: SceneDetailViewSwitchProps) {
  if (viewMode === "practice") {
    return (
      <ScenePracticeView
        practiceSet={latestPracticeSet}
        practiceSnapshot={practiceSnapshot}
        showAnswerMap={showAnswerMap}
        appleButtonSmClassName={appleButtonSmClassName}
        appleDangerButtonSmClassName={appleDangerButtonSmClassName}
        labels={{
          ...sceneViewLabels.practice,
          complete: "完成本轮练习",
        }}
        regenerating={practiceLoading}
        onBack={onBackToSceneView}
        onDelete={onDeletePracticeSet}
        onRegenerate={onRegeneratePracticeFromView}
        onComplete={onPracticeComplete}
        completing={sceneCompleting}
        onSentenceCompleted={onSentenceCompleted}
        onPracticeRunStart={onPracticeRunStart}
        onPracticeAttempt={onPracticeAttempt}
        onPracticeModeComplete={onPracticeModeComplete}
        onReviewScene={onBackToSceneView}
        onRepeatPractice={onRepeatPractice}
        onOpenVariants={onOpenVariantsView}
        onToggleAnswer={onTogglePracticeAnswer}
      />
    );
  }

  if (viewMode === "variants") {
    return (
      <SceneVariantsView
        baseLesson={baseLesson}
        variantSet={latestVariantSet}
        expressionMapLoading={expressionMapLoading}
        appleButtonSmClassName={appleButtonSmClassName}
        appleDangerButtonSmClassName={appleDangerButtonSmClassName}
        labels={sceneViewLabels.variants}
        onBack={onBackToSceneView}
        onComplete={onMarkVariantSetComplete}
        completing={sceneCompleting}
        onRepeatVariants={onRepeatVariants}
        onDeleteSet={onDeleteVariantSet}
        onOpenExpressionMap={onOpenExpressionMapView}
        onOpenChunk={onOpenVariantChunk}
        onOpenVariant={onOpenVariant}
        onDeleteVariant={onDeleteVariantItem}
        toVariantTitle={toVariantTitle}
        toVariantStatusLabel={toVariantStatusLabel}
        chunkDetailSheet={chunkDetailSheet}
      />
    );
  }

  if (viewMode === "expression-map") {
    return (
      <SceneExpressionMapView
        clusters={expressionMap?.clusters ?? []}
        error={expressionMapError}
        appleButtonSmClassName={appleButtonSmClassName}
        labels={sceneViewLabels.expressionMap}
        onBack={onOpenVariantsView}
        onOpenExpressionDetail={onOpenExpressionDetail}
        chunkDetailSheet={chunkDetailSheet}
      />
    );
  }

  if (viewMode === "variant-study" && activeVariantLesson) {
    const variantStudyHeaderTools = (
      <button
        type="button"
        className={`${appleButtonLgClassName} px-3 py-1.5 disabled:opacity-60`}
        disabled={!canGeneratePractice}
        onClick={() => void onGeneratePracticeManually(activeVariantLesson)}
      >
        <LoadingContent
          loading={practiceLoading}
          loadingText={formatLoadingText("场景练习准备中...", "中...")}
        >
          基于此变体生成练习
        </LoadingContent>
      </button>
    );
    const variantStudyAuxiliaryTools = (
      <button
        type="button"
        className={`${SCENE_DANGER_ACTION_BUTTON_SM_CLASSNAME} px-3 py-1.5`}
        onClick={() => onDeleteVariantItem(activeVariantItem?.id ?? activeVariantLesson.id)}
      >
        删除变体
      </button>
    );

    return (
      <SceneVariantStudyView
        lesson={activeVariantLesson}
        topRightTool={
          <button
            type="button"
            className={`${appleButtonLgClassName} px-3 py-1.5`}
            onClick={onOpenVariantsView}
          >
            返回
          </button>
        }
        headerTools={variantStudyHeaderTools}
        auxiliaryTools={variantStudyAuxiliaryTools}
        savedPhraseTexts={savedPhraseTexts}
        onSavePhrase={onSavePhrase}
        onReviewPhrase={onReviewPhrase}
        onBlockPlayback={onBlockPlayback}
        onSentencePlayback={onSentencePlayback}
      />
    );
  }

  return (
    <SceneBaseView
      lesson={baseLesson}
      practiceError={practiceRetryError ?? practiceError}
      variantsError={variantsError}
      trainingNextStep={trainingNextStep}
      headerTools={null}
      headerTitle={baseLesson.subtitle?.trim() || baseLesson.sections[0]?.summary?.trim() || baseLesson.title}
      interactionMode="training"
      savedPhraseTexts={savedPhraseTexts}
      onSavePhrase={onSavePhrase}
      onReviewPhrase={onReviewPhrase}
      onSceneLoopPlayback={onSceneFullPlay}
      onBlockPlayback={onBlockPlayback}
      onSentencePlayback={onSentencePlayback}
      onChunkEncounter={onChunkEncounter}
      onSentencePracticeComplete={onSentencePracticeComplete}
      chunkDetailSheet={chunkDetailSheet}
    />
  );
}
