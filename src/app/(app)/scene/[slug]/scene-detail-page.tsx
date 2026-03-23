"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SceneExpressionMapView } from "@/features/scene/components/scene-expression-map-view";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { Lesson } from "@/lib/types";
import { savePhraseFromApi } from "@/lib/utils/phrases-api";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_TEXT_LG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";

import { useSceneDetailActions } from "./use-scene-detail-actions";
import { SceneBaseView } from "./scene-base-view";
import { toVariantStatusLabel, toVariantTitle } from "./scene-detail-logic";
import { useSceneDetailData } from "./use-scene-detail-data";
import { useSceneDetailPlayback } from "./use-scene-detail-playback";
import { useSceneDetailRouteState } from "./use-scene-detail-route-state";
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { SceneVariantStudyView } from "./scene-variant-study-view";

const appleButtonSmClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const appleDangerButtonSmClassName = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;

type SavePhrasePayload = {
  text: string;
  translation?: string;
  usageNote?: string;
  sourceSentenceIndex?: number;
  sourceSentenceText?: string;
  sourceChunkText?: string;
};

export default function SceneDetailClientPage({
  initialLesson = null,
}: {
  initialLesson?: Lesson | null;
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneSlug = params?.slug ?? "";
  const onRouteChangeRef = useRef<() => void>(() => undefined);
  const [viewResetVersion, setViewResetVersion] = useState(0);
  const {
    baseLesson,
    sceneLoading,
    loadErrorMessage,
    savedPhraseTextSet,
    setSavedPhraseTextSet,
    generatedState,
    refreshGeneratedState,
  } = useSceneDetailData(sceneSlug, { initialLesson });
  const handleSceneRouteChange = useCallback(() => {
    onRouteChangeRef.current();
  }, []);
  const { viewMode, activeVariantId, setActiveVariantId, setViewModeWithRoute } =
    useSceneDetailRouteState({
      sceneSlug,
      searchParams,
      router,
      onRouteChange: handleSceneRouteChange,
    });

  useSceneLearningSync({
    baseLesson,
    viewMode,
    activeVariantId,
  });

  const latestPracticeSet = generatedState.latestPracticeSet;
  const latestVariantSet = generatedState.latestVariantSet;
  const activeVariantItem =
    latestVariantSet?.variants.find((variant) => variant.id === activeVariantId) ?? null;
  const activeVariantLesson = activeVariantItem?.lesson ?? null;
  const {
    practiceLoading,
    variantsLoading,
    practiceError,
    variantsError,
    showAnswerMap,
    expressionMapLoading,
    expressionMapError,
    expressionMap,
    canGeneratePractice,
    handleGeneratePractice,
    handleMarkPracticeComplete,
    handleMarkVariantSetComplete,
    handleOpenVariant,
    handleDeletePracticeSet,
    handleDeleteVariantSet,
    handleDeleteVariantItem,
    handlePracticeToolClick,
    handleVariantToolClick,
    handleOpenExpressionMap,
    setShowAnswerMap,
    resetRouteScopedState,
  } = useSceneDetailActions({
    baseLesson,
    latestPracticeSet,
    latestVariantSet,
    activeVariantId,
    setActiveVariantId,
    setViewModeWithRoute,
    refreshGeneratedState,
  });
  const {
    playbackState,
    effectiveSpeakingText,
    variantChunkModalOpen,
    setVariantChunkModalOpen,
    variantChunkDetail,
    variantChunkSentence,
    variantChunkRelatedChunks,
    variantChunkHoveredKey,
    setVariantChunkHoveredKey,
    handlePronounce,
    handleLoopSentence,
    handleOpenVariantChunk,
    handleOpenExpressionDetail,
    resetChunkDetailState,
  } = useSceneDetailPlayback({
    sceneSlug,
    viewMode,
    baseLesson,
    activeVariantLesson,
    latestVariantSet,
  });

  onRouteChangeRef.current = () => {
    resetRouteScopedState();
    resetChunkDetailState();
    setViewResetVersion((current) => current + 1);
  };

  const savePhraseForScene = useCallback(
    async (payload: SavePhrasePayload) => {
      if (!baseLesson) return { created: false };
      const result = await savePhraseFromApi({
        text: payload.text,
        translation: payload.translation,
        usageNote: payload.usageNote,
        sourceSceneSlug: baseLesson.slug,
        sourceSentenceIndex: payload.sourceSentenceIndex,
        sourceSentenceText: payload.sourceSentenceText,
        sourceChunkText: payload.sourceChunkText ?? payload.text,
      });
      setSavedPhraseTextSet((prev) => {
        const next = new Set(prev);
        next.add(normalizePhraseText(payload.text));
        return next;
      });
      return { created: result.created };
    },
    [baseLesson, setSavedPhraseTextSet],
  );

  const handleSaveFromVariantSheet = useCallback(() => {
    if (!variantChunkDetail?.text) return;
    const sentenceIndex = variantChunkSentence
      ? (baseLesson?.sections
          .flatMap((section) => section.blocks.flatMap((block) => block.sentences))
          .findIndex((sentence) => sentence.id === variantChunkSentence.id) ?? -1)
      : -1;
    void savePhraseForScene({
      text: variantChunkDetail.text,
      translation: variantChunkDetail.translation,
      usageNote: variantChunkDetail.usageNote,
      sourceSentenceIndex: sentenceIndex >= 0 ? sentenceIndex : undefined,
      sourceSentenceText: variantChunkSentence?.text,
      sourceChunkText: variantChunkDetail.text,
    })
      .then((result) => {
        if (!result.created) {
          toast.message("该短语已在收藏中");
          return;
        }
        toast.success("已收藏短语");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "收藏短语失败");
      });
  }, [baseLesson, savePhraseForScene, variantChunkDetail, variantChunkSentence]);

  useEffect(() => {
    if (!baseLesson) return;
    refreshGeneratedState(baseLesson.id);
  }, [baseLesson, refreshGeneratedState, viewResetVersion]);

  useEffect(() => {
    if (!loadErrorMessage) return;
    toast.error(loadErrorMessage);
  }, [loadErrorMessage]);

  if (sceneLoading) {
    return <div className="p-4 text-sm text-muted-foreground">场景加载中...</div>;
  }

  if (!baseLesson) {
    return <div className="p-4 text-sm text-muted-foreground">场景不存在。</div>;
  }

  const isDialogueScene = baseLesson.sceneType === "dialogue";
  const practiceButtonLabel = isDialogueScene ? "对话" : "表达";

  const chunkDetailSheet = (
    <SelectionDetailSheet
      currentSentence={variantChunkSentence}
      chunkDetail={variantChunkDetail}
      relatedChunks={variantChunkRelatedChunks}
      open={variantChunkModalOpen}
      loading={false}
      speakingText={effectiveSpeakingText}
      onOpenChange={setVariantChunkModalOpen}
      onSave={handleSaveFromVariantSheet}
      onReview={handleSaveFromVariantSheet}
      saved={
        variantChunkDetail?.text
          ? savedPhraseTextSet.has(normalizePhraseText(variantChunkDetail.text))
          : false
      }
      onPronounce={handlePronounce}
      onLoopSentence={handleLoopSentence}
      onSelectRelated={handleOpenVariantChunk}
      hoveredChunkKey={variantChunkHoveredKey}
      onHoverChunk={setVariantChunkHoveredKey}
      playingChunkKey={playbackState.kind === "chunk" ? (playbackState.text ?? null) : null}
      showSentenceSection={false}
    />
  );

  if (viewMode === "practice") {
    return (
      <ScenePracticeView
        practiceSet={latestPracticeSet}
        showAnswerMap={showAnswerMap}
        appleButtonSmClassName={appleButtonSmClassName}
        appleDangerButtonSmClassName={appleDangerButtonSmClassName}
        labels={sceneViewLabels.practice}
        onBack={() => setViewModeWithRoute("scene")}
        onDelete={handleDeletePracticeSet}
        onComplete={handleMarkPracticeComplete}
        onReviewScene={() => setViewModeWithRoute("scene")}
        onOpenVariants={() => setViewModeWithRoute("variants")}
        onToggleAnswer={(exerciseId) =>
          setShowAnswerMap((prev) => ({
            ...prev,
            [exerciseId]: !prev[exerciseId],
          }))
        }
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
        onBack={() => setViewModeWithRoute("scene")}
        onComplete={handleMarkVariantSetComplete}
        onDeleteSet={handleDeleteVariantSet}
        onOpenExpressionMap={() => void handleOpenExpressionMap()}
        onOpenChunk={handleOpenVariantChunk}
        onOpenVariant={handleOpenVariant}
        onDeleteVariant={handleDeleteVariantItem}
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
        onBack={() => setViewModeWithRoute("variants")}
        onOpenExpressionDetail={handleOpenExpressionDetail}
        chunkDetailSheet={chunkDetailSheet}
      />
    );
  }

  if (viewMode === "variant-study" && activeVariantLesson) {
    const variantStudyHeaderTools = (
      <>
        <button
          type="button"
          className={`${appleButtonLgClassName} px-3 py-1.5 disabled:opacity-60`}
          disabled={!canGeneratePractice}
          onClick={() => handleGeneratePractice(activeVariantLesson)}
        >
          {practiceLoading ? "练习中..." : practiceButtonLabel}
        </button>
        <button
          type="button"
          className={`${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_LG} px-3 py-1.5`}
          onClick={() => handleDeleteVariantItem(activeVariantLesson.id)}
        >
          删除变体
        </button>
      </>
    );

    return (
      <SceneVariantStudyView
        lesson={activeVariantLesson}
        topRightTool={
          <button
            type="button"
            className={`${appleButtonLgClassName} px-3 py-1.5`}
            onClick={() => setViewModeWithRoute("variants")}
          >
            返回
          </button>
        }
        headerTools={variantStudyHeaderTools}
        savedPhraseTexts={Array.from(savedPhraseTextSet)}
        onSavePhrase={savePhraseForScene}
        onReviewPhrase={savePhraseForScene}
      />
    );
  }

  const headerTools = (
    <>
      <button
        type="button"
        className={`${appleButtonLgClassName} px-3 py-1.5 disabled:opacity-60`}
        onClick={handlePracticeToolClick}
        disabled={practiceLoading}
      >
        {practiceLoading
          ? "练习中..."
          : generatedState.practiceStatus === "idle"
            ? "对话"
            : "查看对话"}
      </button>
      <button
        type="button"
        className={`${appleButtonLgClassName} px-3 py-1.5 disabled:opacity-60`}
        onClick={handleVariantToolClick}
        disabled={variantsLoading}
      >
        {variantsLoading
          ? "生成中..."
          : generatedState.variantStatus === "idle"
            ? "变体"
            : "查看变体"}
      </button>
    </>
  );

  return (
    <SceneBaseView
      lesson={baseLesson}
      practiceError={practiceError}
      variantsError={variantsError}
      headerTools={headerTools}
      savedPhraseTexts={Array.from(savedPhraseTextSet)}
      onSavePhrase={savePhraseForScene}
      onReviewPhrase={savePhraseForScene}
      chunkDetailSheet={chunkDetailSheet}
    />
  );
}
