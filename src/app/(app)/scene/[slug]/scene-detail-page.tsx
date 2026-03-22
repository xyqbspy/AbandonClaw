"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LessonReader } from "@/features/lesson/components/lesson-reader";
import { SelectionDetailSheet } from "@/features/lesson/components/selection-detail-sheet";
import { SceneExpressionMapView } from "@/features/scene/components/scene-expression-map-view";
import { ScenePracticeView } from "@/features/scene/components/scene-practice-view";
import { SceneVariantsView } from "@/features/scene/components/scene-variants-view";
import { sceneViewLabels } from "@/features/scene/components/scene-view-labels";
import { getChunkLayerFromLesson } from "@/lib/data/mock-lessons";
import { Lesson, LessonSentence, SelectionChunkLayer } from "@/lib/types";
import {
  deleteAllVariantSets,
  deletePracticeSet,
  deleteVariantItem,
  getSceneGeneratedState,
  markPracticeSetCompleted,
  markVariantItemStatus,
  markVariantSetCompleted,
  savePracticeSet,
  saveVariantSet,
} from "@/lib/utils/scene-learning-flow-storage";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { completeSceneLearningFromApi } from "@/lib/utils/learning-api";
import {
  savePhraseFromApi,
} from "@/lib/utils/phrases-api";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { getLessonSentences } from "@/lib/shared/lesson-content";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import {
  playChunkAudio,
  playSentenceAudio,
  prefetchChunkAudio,
  prefetchSentenceAudio,
  setTtsLooping,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_DANGER,
  APPLE_BUTTON_TEXT_LG,
  APPLE_BUTTON_TEXT_SM,
} from "@/lib/ui/apple-style";
import {
  findChunkContext,
  toVariantStatusLabel,
  toVariantTitle,
} from "./scene-detail-logic";
import {
  resolveSceneToolIntent,
  resolveVariantDeleteOutcome,
  sceneDetailConfirmMessages,
} from "./scene-detail-controller";
import {
  ensureSceneExpressionMapData,
  generateScenePracticeSet,
  generateSceneVariantSet,
} from "./scene-detail-generation-logic";
import { useSceneDetailData } from "./use-scene-detail-data";
import { useSceneLearningSync } from "./use-scene-learning-sync";
import { useSceneDetailRouteState } from "./use-scene-detail-route-state";

const appleButtonSmClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const appleDangerButtonSmClassName = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;

export default function SceneDetailClientPage({
  initialLesson = null,
}: {
  initialLesson?: Lesson | null;
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneSlug = params?.slug ?? "";
  const [viewResetVersion, setViewResetVersion] = useState(0);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});
  const [variantChunkModalOpen, setVariantChunkModalOpen] = useState(false);
  const [variantChunkDetail, setVariantChunkDetail] =
    useState<SelectionChunkLayer | null>(null);
  const [variantChunkSentence, setVariantChunkSentence] =
    useState<LessonSentence | null>(null);
  const [variantChunkRelatedChunks, setVariantChunkRelatedChunks] = useState<string[]>(
    [],
  );
  const [variantChunkHoveredKey, setVariantChunkHoveredKey] = useState<string | null>(
    null,
  );
  const [expressionMapLoading, setExpressionMapLoading] = useState(false);
  const [expressionMapError, setExpressionMapError] = useState<string | null>(null);
  const [expressionMap, setExpressionMap] = useState<ExpressionMapResponse | null>(null);
  const [expressionMapVariantSetId, setExpressionMapVariantSetId] =
    useState<string | null>(null);
  const playbackState = useTtsPlaybackState();
  const {
    baseLesson,
    sceneLoading,
    loadErrorMessage,
    savedPhraseTextSet,
    setSavedPhraseTextSet,
    generatedState,
    refreshGeneratedState,
  } = useSceneDetailData(sceneSlug, { initialLesson });
  const routeResetState = useMemo(
    () => ({
      practiceError: null as string | null,
      variantsError: null as string | null,
      showAnswerMap: {} as Record<string, boolean>,
      variantChunkModalOpen: false,
      variantChunkDetail: null as SelectionChunkLayer | null,
      variantChunkSentence: null as LessonSentence | null,
      variantChunkRelatedChunks: [] as string[],
      variantChunkHoveredKey: null as string | null,
      expressionMapLoading: false,
      expressionMapError: null as string | null,
      expressionMap: null as ExpressionMapResponse | null,
      expressionMapVariantSetId: null as string | null,
    }),
    [],
  );
  const handleSceneRouteChange = useCallback(() => {
    setPracticeError(routeResetState.practiceError);
    setVariantsError(routeResetState.variantsError);
    setShowAnswerMap(routeResetState.showAnswerMap);
    setVariantChunkModalOpen(routeResetState.variantChunkModalOpen);
    setVariantChunkDetail(routeResetState.variantChunkDetail);
    setVariantChunkSentence(routeResetState.variantChunkSentence);
    setVariantChunkRelatedChunks(routeResetState.variantChunkRelatedChunks);
    setVariantChunkHoveredKey(routeResetState.variantChunkHoveredKey);
    setExpressionMapLoading(routeResetState.expressionMapLoading);
    setExpressionMapError(routeResetState.expressionMapError);
    setExpressionMap(routeResetState.expressionMap);
    setExpressionMapVariantSetId(routeResetState.expressionMapVariantSetId);
    setViewResetVersion((current) => current + 1);
  }, [routeResetState]);
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
  const baseSceneId = baseLesson?.id ?? "";
  const savePhraseForScene = useCallback(
    async (payload: {
      text: string;
      translation?: string;
      usageNote?: string;
      sourceSentenceIndex?: number;
      sourceSentenceText?: string;
      sourceChunkText?: string;
    }) => {
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
    [baseLesson],
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

  const latestPracticeSet = generatedState.latestPracticeSet;
  const latestVariantSet = generatedState.latestVariantSet;
  const activeVariantItem =
    latestVariantSet?.variants.find((variant) => variant.id === activeVariantId) ?? null;
  const activeVariantLesson = activeVariantItem?.lesson ?? null;

  const canGeneratePractice =
    generatedState.practiceStatus !== "generated" && !practiceLoading;
  const canGenerateVariants =
    generatedState.variantStatus !== "generated" && !variantsLoading;

  const handleGeneratePractice = async (sourceLesson: Lesson) => {
    if (!baseLesson || !canGeneratePractice) return;

    setPracticeLoading(true);
    setPracticeError(null);
    try {
      const practiceSet = await generateScenePracticeSet({
        baseLesson,
        sourceLesson,
      });

      savePracticeSet(practiceSet);
      refreshGeneratedState(baseLesson.id);
      setShowAnswerMap({});
      setViewModeWithRoute("practice");
    } catch (error) {
      setPracticeError(
        error instanceof Error ? error.message : "Failed to generate practice.",
      );
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (!baseLesson || !canGenerateVariants) return;

    setVariantsLoading(true);
    setVariantsError(null);
    try {
      const variantSet = await generateSceneVariantSet({
        baseLesson,
      });

      saveVariantSet(variantSet);
      refreshGeneratedState(baseLesson.id);
      setActiveVariantId(null);
      setViewModeWithRoute("variants");
    } catch (error) {
      setVariantsError(
        error instanceof Error ? error.message : "Failed to generate variants.",
      );
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleMarkPracticeComplete = () => {
    if (!baseLesson || !latestPracticeSet) return;
    markPracticeSetCompleted(baseLesson.id, latestPracticeSet.id);
    refreshGeneratedState(baseLesson.id);
    void completeSceneLearningFromApi(baseLesson.slug).catch(() => {
      // Non-blocking.
    });
  };

  const handleMarkVariantSetComplete = () => {
    if (!baseLesson || !latestVariantSet) return;
    markVariantSetCompleted(baseLesson.id, latestVariantSet.id);
    refreshGeneratedState(baseLesson.id);
    void completeSceneLearningFromApi(baseLesson.slug).catch(() => {
      // Non-blocking.
    });
  };

  const handleOpenVariant = (variantId: string) => {
    if (!baseLesson || !latestVariantSet) return;
    markVariantItemStatus(baseLesson.id, latestVariantSet.id, variantId, "viewed");
    refreshGeneratedState(baseLesson.id);
    setActiveVariantId(variantId);
    setViewModeWithRoute("variant-study", variantId);
  };

  const handleDeletePracticeSet = () => {
    if (!baseLesson || !latestPracticeSet) return;
    const confirmed = window.confirm(sceneDetailConfirmMessages.deletePracticeSet);
    if (!confirmed) return;
    deletePracticeSet(baseLesson.id, latestPracticeSet.id);
    refreshGeneratedState(baseLesson.id);
    setShowAnswerMap({});
    setViewModeWithRoute("scene");
  };

  const handleDeleteVariantSet = () => {
    if (!baseLesson || !latestVariantSet) return;
    const confirmed = window.confirm(sceneDetailConfirmMessages.deleteVariantSet);
    if (!confirmed) return;
    deleteAllVariantSets(baseLesson.id);
    refreshGeneratedState(baseLesson.id);
    setActiveVariantId(null);
    setExpressionMap(null);
    setExpressionMapVariantSetId(null);
    setViewModeWithRoute("scene");
  };

  const handleDeleteVariantItem = (variantId: string) => {
    if (!baseLesson || !latestVariantSet) return;
    const confirmed = window.confirm(sceneDetailConfirmMessages.deleteVariantItem);
    if (!confirmed) return;
    deleteVariantItem(baseLesson.id, latestVariantSet.id, variantId);
    refreshGeneratedState(baseLesson.id);
    setExpressionMap(null);
    setExpressionMapVariantSetId(null);
    const deleteOutcome = resolveVariantDeleteOutcome({
      activeVariantId,
      deletingVariantId: variantId,
    });
    if (deleteOutcome.shouldClearActiveVariant) {
      setActiveVariantId(null);
    }
    if (deleteOutcome.nextViewMode) {
      setViewModeWithRoute(deleteOutcome.nextViewMode);
    }
  };

  const handlePracticeToolClick = () => {
    const intent = resolveSceneToolIntent({
      hasBaseLesson: Boolean(baseLesson),
      loading: practiceLoading,
      status: generatedState.practiceStatus,
    });
    if (intent === "ignore" || !baseLesson) return;
    if (intent === "generate") {
      void handleGeneratePractice(baseLesson);
      return;
    }
    setViewModeWithRoute("practice");
  };

  const handleVariantToolClick = () => {
    const intent = resolveSceneToolIntent({
      hasBaseLesson: Boolean(baseLesson),
      loading: variantsLoading,
      status: generatedState.variantStatus,
    });
    if (intent === "ignore" || !baseLesson) return;
    if (intent === "generate") {
      void handleGenerateVariants();
      return;
    }
    setViewModeWithRoute("variants");
  };

  const effectiveSpeakingText = playbackState.text ?? null;

  const stopGeneratedAudio = useCallback(() => {
    stopTtsPlayback();
    setTtsLooping(false);
  }, []);

  useEffect(
    () => () => {
      stopGeneratedAudio();
    },
    [stopGeneratedAudio],
  );

  useEffect(() => {
    const warmupLesson = viewMode === "variant-study" ? activeVariantLesson : baseLesson;
    if (!warmupLesson) return;

    const timer = window.setTimeout(() => {
      const sentences = getLessonSentences(warmupLesson).slice(0, 2);
      for (const sentence of sentences) {
        const text = (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();
        if (!text) continue;
        void prefetchSentenceAudio({
          sceneSlug: warmupLesson.slug,
          sentenceId: sentence.id,
          text,
          speaker: sentence.speaker,
          mode: "normal",
        });
      }

      const firstSentence = sentences[0];
      for (const chunkText of firstSentence?.chunks.slice(0, 2) ?? []) {
        const clean = chunkText.trim();
        if (!clean) continue;
        void prefetchChunkAudio({
          chunkText: clean,
          chunkKey: buildChunkAudioKey(clean),
        });
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeVariantLesson, baseLesson, viewMode]);

  useEffect(() => {
    if (!variantChunkModalOpen || !variantChunkSentence) return;

    const sentenceText =
      (variantChunkSentence.tts?.trim() ||
        variantChunkSentence.audioText?.trim() ||
        variantChunkSentence.text).trim();
    if (sentenceText) {
      void prefetchSentenceAudio({
        sceneSlug: (baseLesson?.slug ?? sceneSlug).trim() || "scene",
        sentenceId: variantChunkSentence.id,
        text: sentenceText,
        speaker: variantChunkSentence.speaker,
        mode: "normal",
      });
    }

    const chunkText = variantChunkDetail?.text?.trim();
    if (!chunkText) return;
    void prefetchChunkAudio({
      chunkText,
      chunkKey: buildChunkAudioKey(chunkText),
    });
  }, [baseLesson, sceneSlug, variantChunkDetail, variantChunkModalOpen, variantChunkSentence]);

  const handlePronounce = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (effectiveSpeakingText === clean) {
      stopGeneratedAudio();
      return;
    }

    const sentence = variantChunkSentence;
    const selectedChunkText = variantChunkDetail?.text?.trim();
    if (selectedChunkText && clean.toLowerCase() === selectedChunkText.toLowerCase()) {
      if (playbackState.kind === "chunk" && playbackState.chunkKey === buildChunkAudioKey(clean)) {
        stopGeneratedAudio();
        return;
      }
      void (async () => {
        stopTtsPlayback();
        setTtsLooping(false);
        try {
          await playChunkAudio({
            chunkText: clean,
            chunkKey: buildChunkAudioKey(clean),
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        }
      })();
      return;
    }

    if (sentence && clean === sentence.text.trim()) {
      if (
        playbackState.kind === "sentence" &&
        playbackState.sentenceId === sentence.id &&
        (playbackState.mode ?? "normal") === "normal"
      ) {
        stopGeneratedAudio();
        return;
      }
      void (async () => {
        stopTtsPlayback();
        setTtsLooping(false);
        try {
          await playSentenceAudio({
            sceneSlug: (baseLesson?.slug ?? sceneSlug).trim() || "scene",
            sentenceId: sentence.id,
            text: clean,
            mode: "normal",
            speaker: sentence.speaker,
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
        }
      })();
      return;
    }

    void (async () => {
      stopTtsPlayback();
      setTtsLooping(false);
      try {
        await playChunkAudio({
          chunkText: clean,
          chunkKey: buildChunkAudioKey(clean),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
      }
    })();
  };

  const handleLoopSentence = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (effectiveSpeakingText === clean) {
      stopGeneratedAudio();
      return;
    }
    void (async () => {
      stopTtsPlayback();
      setTtsLooping(true);
      try {
        await playChunkAudio({
          chunkText: clean,
          chunkKey: buildChunkAudioKey(clean),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "播放失败，请稍后重试");
      } finally {
        setTtsLooping(false);
      }
    })();
  };

  const handleOpenVariantChunk = (chunk: string) => {
    if (!baseLesson) return;
    const variantLessons = latestVariantSet?.variants.map((item) => item.lesson) ?? [];
    const context = findChunkContext(chunk, baseLesson, variantLessons);
    if (!context) return;
    const detail = getChunkLayerFromLesson(context.lesson, context.sentence, chunk);
    setVariantChunkSentence(context.sentence);
    setVariantChunkDetail(detail);
    setVariantChunkRelatedChunks(latestVariantSet?.reusedChunks ?? []);
    setVariantChunkModalOpen(true);
  };

  const ensureExpressionMap = async () => {
    if (!baseLesson || !latestVariantSet) return null;

    setExpressionMapLoading(true);
    setExpressionMapError(null);
    try {
      const result = await ensureSceneExpressionMapData({
        baseLesson,
        latestVariantSet,
        cachedExpressionMap: expressionMap,
        cachedVariantSetId: expressionMapVariantSetId,
      });
      if (!result) return null;
      setExpressionMap(result.expressionMap);
      setExpressionMapVariantSetId(result.variantSetId);
      return result.expressionMap;
    } catch (error) {
      setExpressionMapError(
        error instanceof Error ? error.message : "?????????",
      );
      return null;
    } finally {
      setExpressionMapLoading(false);
    }
  };

  const handleOpenExpressionMap = async () => {
    const result = await ensureExpressionMap();
    if (!result) return;
    setViewModeWithRoute("expression-map");
  };

  const handleOpenExpressionDetail = (expression: string, relatedChunks: string[]) => {
    if (!baseLesson) return;
    const variantLessons = latestVariantSet?.variants.map((item) => item.lesson) ?? [];
    const context = findChunkContext(expression, baseLesson, variantLessons);
    if (!context) return;
    const detail = getChunkLayerFromLesson(context.lesson, context.sentence, expression);
    setVariantChunkSentence(context.sentence);
    setVariantChunkDetail(detail);
    setVariantChunkRelatedChunks(relatedChunks);
    setVariantChunkModalOpen(true);
  };


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
          {practiceLoading ? "练习中…" : practiceButtonLabel}
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
      <div className="space-y-4">
        <LessonReader
          lesson={activeVariantLesson}
          minimalHeader
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
      </div>
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
          ? "练习中…"
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
          ? "生成中…"
          : generatedState.variantStatus === "idle"
            ? "变体"
            : "查看变体"}
      </button>
    </>
  );

  return (
    <div className="space-y-5">
      {practiceError ? <p className="text-sm text-destructive">{practiceError}</p> : null}
      {variantsError ? <p className="text-sm text-destructive">{variantsError}</p> : null}

      <LessonReader
        lesson={baseLesson}
        headerTools={headerTools}
        savedPhraseTexts={Array.from(savedPhraseTextSet)}
        onSavePhrase={savePhraseForScene}
        onReviewPhrase={savePhraseForScene}
      />
      {chunkDetailSheet}
    </div>
  );
}
