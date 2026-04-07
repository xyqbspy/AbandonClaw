import { useCallback, useMemo, useState } from "react";
import {
  deleteAllVariantSets,
  deletePracticeSet,
  deleteVariantItem,
  markPracticeSetCompleted,
  markVariantItemStatus,
  markVariantSetCompleted,
  restartPracticeSet,
  restartVariantSet,
  savePracticeSet,
  saveVariantSet,
} from "@/lib/utils/scene-learning-flow-storage";
import { completeSceneLearningFromApi } from "@/lib/utils/learning-api";
import {
  completeSceneVariantRunFromApi,
  recordSceneVariantViewFromApi,
} from "@/lib/utils/learning-api";
import { Lesson } from "@/lib/types";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { PracticeSet, VariantSet } from "@/lib/types/learning-flow";

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
import {
  warmupRepeatPracticeResources,
  warmupRepeatVariantResources,
} from "@/lib/utils/scene-resource-actions";

type UseSceneDetailActionsArgs = {
  baseLesson: Lesson | null;
  latestPracticeSet: PracticeSet | null;
  latestVariantSet: VariantSet | null;
  activeVariantId: string | null;
  setActiveVariantId: (variantId: string | null) => void;
  setViewModeWithRoute: (
    viewMode: "scene" | "practice" | "variants" | "expression-map" | "variant-study",
    variantId?: string | null,
  ) => void;
  refreshGeneratedState: (sceneKey: string) => void;
  onLearningStateChange?: (state: Awaited<ReturnType<typeof completeSceneLearningFromApi>>) => void;
};

const resolvePracticeSourceLesson = ({
  baseLesson,
  latestVariantSet,
  practiceSet,
}: {
  baseLesson: Lesson;
  latestVariantSet: VariantSet | null;
  practiceSet: PracticeSet;
}) => {
  if (practiceSet.sourceType !== "variant") {
    return baseLesson;
  }

  return (
    latestVariantSet?.variants.find(
      (variant) =>
        variant.id === practiceSet.sourceVariantId ||
        variant.lesson.id === practiceSet.sourceVariantId,
    )?.lesson ?? baseLesson
  );
};

export function useSceneDetailActions({
  baseLesson,
  latestPracticeSet,
  latestVariantSet,
  activeVariantId,
  setActiveVariantId,
  setViewModeWithRoute,
  refreshGeneratedState,
  onLearningStateChange,
}: UseSceneDetailActionsArgs) {
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [sceneCompleting, setSceneCompleting] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});
  const [expressionMapLoading, setExpressionMapLoading] = useState(false);
  const [expressionMapError, setExpressionMapError] = useState<string | null>(null);
  const [expressionMap, setExpressionMap] = useState<ExpressionMapResponse | null>(null);
  const [expressionMapVariantSetId, setExpressionMapVariantSetId] =
    useState<string | null>(null);

  const canGeneratePractice =
    latestPracticeSet === null
      ? !practiceLoading
      : latestPracticeSet.status !== "generated" && !practiceLoading;
  const canGenerateVariants =
    latestVariantSet === null
      ? !variantsLoading
      : latestVariantSet.status !== "generated" && !variantsLoading;

  const resetRouteScopedState = useCallback(() => {
    setPracticeError(null);
    setVariantsError(null);
    setShowAnswerMap({});
    setExpressionMapLoading(false);
    setExpressionMapError(null);
    setExpressionMap(null);
    setExpressionMapVariantSetId(null);
  }, []);

  const handleGeneratePractice = useCallback(
    async (sourceLesson: Lesson) => {
      if (!baseLesson || !canGeneratePractice) return null;

      setPracticeLoading(true);
      setPracticeError(null);
      try {
        const practiceSet = await generateScenePracticeSet({
          baseLesson,
          sourceLesson,
          requestPolicy: "manual",
        });

        savePracticeSet(practiceSet);
        refreshGeneratedState(baseLesson.id);
        setShowAnswerMap({});
        setViewModeWithRoute("practice");
        return practiceSet;
      } catch (error) {
        setPracticeError(
          error instanceof Error ? error.message : "生成练习题失败，请稍后重试。",
        );
        return null;
      } finally {
        setPracticeLoading(false);
      }
    },
    [baseLesson, canGeneratePractice, refreshGeneratedState, setViewModeWithRoute],
  );

  const ensurePracticeSetReady = useCallback(
    async ({
      sourceLesson,
      openOnReady,
      requestPolicy,
    }: {
      sourceLesson: Lesson;
      openOnReady: boolean;
      requestPolicy: "manual" | "auto";
    }) => {
      if (!baseLesson) return null;
      if (latestPracticeSet) {
        if (openOnReady) {
          setShowAnswerMap({});
          setViewModeWithRoute("practice");
        }
        return latestPracticeSet;
      }
      if (!canGeneratePractice) return null;

      setPracticeLoading(true);
      setPracticeError(null);
      try {
        const practiceSet = await generateScenePracticeSet({
          baseLesson,
          sourceLesson,
          requestPolicy,
        });

        savePracticeSet(practiceSet);
        refreshGeneratedState(baseLesson.id);
        setShowAnswerMap({});
        if (openOnReady) {
          setViewModeWithRoute("practice");
        }
        return practiceSet;
      } catch (error) {
        setPracticeError(
          error instanceof Error ? error.message : "生成练习题失败，请稍后重试。",
        );
        return null;
      } finally {
        setPracticeLoading(false);
      }
    },
    [
      baseLesson,
      canGeneratePractice,
      latestPracticeSet,
      refreshGeneratedState,
      setViewModeWithRoute,
    ],
  );

  const handleRegeneratePractice = useCallback(async () => {
    if (!baseLesson || !latestPracticeSet) return null;
    const sourceLesson = resolvePracticeSourceLesson({
      baseLesson,
      latestVariantSet,
      practiceSet: latestPracticeSet,
    });

    setPracticeLoading(true);
    setPracticeError(null);
    try {
      const practiceSet = await generateScenePracticeSet({
        baseLesson,
        sourceLesson,
        requestPolicy: "manual",
      });

      savePracticeSet(practiceSet);
      refreshGeneratedState(baseLesson.id);
      setShowAnswerMap({});
      setViewModeWithRoute("practice");
      return practiceSet;
    } catch (error) {
      setPracticeError(
        error instanceof Error ? error.message : "生成练习题失败，请稍后重试。",
      );
      return null;
    } finally {
      setPracticeLoading(false);
    }
  }, [
    baseLesson,
    latestPracticeSet,
    latestVariantSet,
    refreshGeneratedState,
    setViewModeWithRoute,
  ]);

  const handleGenerateVariants = useCallback(async () => {
    if (!baseLesson || !canGenerateVariants) return null;

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
      return variantSet;
    } catch (error) {
      setVariantsError(
        error instanceof Error ? error.message : "生成变体失败，请稍后重试。",
      );
      return null;
    } finally {
      setVariantsLoading(false);
    }
  }, [
    baseLesson,
    canGenerateVariants,
    refreshGeneratedState,
    setActiveVariantId,
    setViewModeWithRoute,
  ]);

  const ensureVariantSetReady = useCallback(
    async ({
      openOnReady,
    }: {
      openOnReady: boolean;
    }) => {
      if (!baseLesson) return null;
      if (latestVariantSet) {
        if (openOnReady) {
          setViewModeWithRoute("variants");
        }
        return latestVariantSet;
      }
      if (!canGenerateVariants) return null;

      setVariantsLoading(true);
      setVariantsError(null);
      try {
        const variantSet = await generateSceneVariantSet({
          baseLesson,
        });

        saveVariantSet(variantSet);
        refreshGeneratedState(baseLesson.id);
        setActiveVariantId(null);
        if (openOnReady) {
          setViewModeWithRoute("variants");
        }
        return variantSet;
      } catch (error) {
        setVariantsError(
          error instanceof Error ? error.message : "生成变体失败，请稍后重试。",
        );
        return null;
      } finally {
        setVariantsLoading(false);
      }
    },
    [
      baseLesson,
      canGenerateVariants,
      refreshGeneratedState,
      setActiveVariantId,
      setViewModeWithRoute,
    ],
  );

  const prewarmVariants = useCallback(async () => {
    return ensureVariantSetReady({ openOnReady: false });
  }, [ensureVariantSetReady]);

  const prewarmPractice = useCallback(
    async (sourceLesson?: Lesson | null) => {
      if (!sourceLesson) return null;
      return ensurePracticeSetReady({
        sourceLesson,
        openOnReady: false,
        requestPolicy: "auto",
      });
    },
    [ensurePracticeSetReady],
  );

  const handleRepeatPractice = useCallback(() => {
    if (!baseLesson || !latestPracticeSet) return null;
    const repeatedPracticeSet = restartPracticeSet(latestPracticeSet);
    refreshGeneratedState(baseLesson.id);
    warmupRepeatPracticeResources({
      baseLesson,
      latestVariantSet,
      practiceSet: repeatedPracticeSet,
    });
    setShowAnswerMap({});
    setViewModeWithRoute("practice");
    return repeatedPracticeSet;
  }, [
    baseLesson,
    latestPracticeSet,
    latestVariantSet,
    refreshGeneratedState,
    setViewModeWithRoute,
  ]);

  const handleRepeatVariants = useCallback(() => {
    if (!baseLesson || !latestVariantSet) return null;
    const repeatedVariantSet = restartVariantSet(latestVariantSet);
    refreshGeneratedState(baseLesson.id);
    warmupRepeatVariantResources({
      baseLesson,
      variantSet: repeatedVariantSet,
    });
    setActiveVariantId(null);
    setViewModeWithRoute("variants");
    return repeatedVariantSet;
  }, [
    baseLesson,
    latestVariantSet,
    refreshGeneratedState,
    setActiveVariantId,
    setViewModeWithRoute,
  ]);

  const handleMarkPracticeComplete = useCallback(() => {
    if (!baseLesson || !latestPracticeSet) return;
    markPracticeSetCompleted(baseLesson.id, latestPracticeSet.id);
    refreshGeneratedState(baseLesson.id);
    setSceneCompleting(true);
    void completeSceneLearningFromApi(baseLesson.slug)
      .then((result) => {
        onLearningStateChange?.(result);
      })
      .catch(() => {
        // Non-blocking.
      })
      .finally(() => {
        setSceneCompleting(false);
      });
  }, [baseLesson, latestPracticeSet, onLearningStateChange, refreshGeneratedState]);

  const handleMarkVariantSetComplete = useCallback(() => {
    if (!baseLesson || !latestVariantSet) return;
    markVariantSetCompleted(baseLesson.id, latestVariantSet.id);
    refreshGeneratedState(baseLesson.id);
    setSceneCompleting(true);
    void completeSceneVariantRunFromApi(baseLesson.slug, {
      variantSetId: latestVariantSet.id,
    }).catch(() => {
      // Non-blocking.
    });
    void completeSceneLearningFromApi(baseLesson.slug)
      .then((result) => {
        onLearningStateChange?.(result);
      })
      .catch(() => {
        // Non-blocking.
      })
      .finally(() => {
        setSceneCompleting(false);
      });
  }, [baseLesson, latestVariantSet, onLearningStateChange, refreshGeneratedState]);

  const handleCompleteBaseScene = useCallback(() => {
    if (!baseLesson || sceneCompleting) return;
    setSceneCompleting(true);
    void completeSceneLearningFromApi(baseLesson.slug)
      .then((result) => {
        onLearningStateChange?.(result);
      })
      .catch(() => {
        // Non-blocking.
      })
      .finally(() => {
        setSceneCompleting(false);
      });
  }, [baseLesson, onLearningStateChange, sceneCompleting]);

  const handleOpenVariant = useCallback(
    (variantId: string) => {
      if (!baseLesson || !latestVariantSet) return;
      markVariantItemStatus(baseLesson.id, latestVariantSet.id, variantId, "viewed");
      refreshGeneratedState(baseLesson.id);
      void recordSceneVariantViewFromApi(baseLesson.slug, {
        variantSetId: latestVariantSet.id,
        variantId,
      }).catch(() => {
        // Non-blocking.
      });
      setActiveVariantId(variantId);
      setViewModeWithRoute("variant-study", variantId);
    },
    [
      baseLesson,
      latestVariantSet,
      refreshGeneratedState,
      setActiveVariantId,
      setViewModeWithRoute,
    ],
  );

  const handleDeletePracticeSet = useCallback(() => {
    if (!baseLesson || !latestPracticeSet) return;
    const confirmed = window.confirm(sceneDetailConfirmMessages.deletePracticeSet);
    if (!confirmed) return;
    deletePracticeSet(baseLesson.id, latestPracticeSet.id);
    refreshGeneratedState(baseLesson.id);
    setShowAnswerMap({});
    setViewModeWithRoute("scene");
  }, [baseLesson, latestPracticeSet, refreshGeneratedState, setViewModeWithRoute]);

  const handleDeleteVariantSet = useCallback(() => {
    if (!baseLesson || !latestVariantSet) return;
    const confirmed = window.confirm(sceneDetailConfirmMessages.deleteVariantSet);
    if (!confirmed) return;
    deleteAllVariantSets(baseLesson.id);
    refreshGeneratedState(baseLesson.id);
    setActiveVariantId(null);
    setExpressionMap(null);
    setExpressionMapVariantSetId(null);
    setViewModeWithRoute("scene");
  }, [baseLesson, latestVariantSet, refreshGeneratedState, setActiveVariantId, setViewModeWithRoute]);

  const handleDeleteVariantItem = useCallback(
    (variantId: string) => {
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
    },
    [
      activeVariantId,
      baseLesson,
      latestVariantSet,
      refreshGeneratedState,
      setActiveVariantId,
      setViewModeWithRoute,
    ],
  );

  const handlePracticeToolClick = useCallback(() => {
    if (latestPracticeSet?.status === "completed") {
      handleRepeatPractice();
      return;
    }
    const intent = resolveSceneToolIntent({
      hasBaseLesson: Boolean(baseLesson),
      loading: practiceLoading,
      status: latestPracticeSet ? latestPracticeSet.status : "idle",
    });
    if (intent === "ignore" || !baseLesson) return;
    if (intent === "generate") {
      void ensurePracticeSetReady({
        sourceLesson: baseLesson,
        openOnReady: true,
        requestPolicy: "manual",
      });
      return;
    }
    setViewModeWithRoute("practice");
  }, [
    baseLesson,
    ensurePracticeSetReady,
    handleRepeatPractice,
    latestPracticeSet,
    practiceLoading,
    setViewModeWithRoute,
  ]);

  const handleVariantToolClick = useCallback(() => {
    if (latestVariantSet?.status === "completed") {
      handleRepeatVariants();
      return;
    }
    const intent = resolveSceneToolIntent({
      hasBaseLesson: Boolean(baseLesson),
      loading: variantsLoading,
      status: latestVariantSet ? latestVariantSet.status : "idle",
    });
    if (intent === "ignore" || !baseLesson) return;
    if (intent === "generate") {
      void ensureVariantSetReady({ openOnReady: true });
      return;
    }
    if (
      activeVariantId &&
      latestVariantSet?.variants.some((variant) => variant.id === activeVariantId)
    ) {
      setViewModeWithRoute("variant-study", activeVariantId);
      return;
    }
    setViewModeWithRoute("variants");
  }, [
    activeVariantId,
    baseLesson,
    ensureVariantSetReady,
    handleRepeatVariants,
    latestVariantSet,
    setViewModeWithRoute,
    variantsLoading,
  ]);

  const ensureExpressionMap = useCallback(async () => {
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
        error instanceof Error ? error.message : "生成表达地图失败，请稍后重试。",
      );
      return null;
    } finally {
      setExpressionMapLoading(false);
    }
  }, [baseLesson, expressionMap, expressionMapVariantSetId, latestVariantSet]);

  const handleOpenExpressionMap = useCallback(async () => {
    const result = await ensureExpressionMap();
    if (!result) return;
    setViewModeWithRoute("expression-map");
  }, [ensureExpressionMap, setViewModeWithRoute]);

  const actionState = useMemo(
    () => ({
      practiceLoading,
      variantsLoading,
      practiceError,
      variantsError,
      showAnswerMap,
      expressionMapLoading,
      expressionMapError,
      expressionMap,
      sceneCompleting,
      canGeneratePractice,
      canGenerateVariants,
    }),
    [
      practiceLoading,
      variantsLoading,
      practiceError,
      variantsError,
      showAnswerMap,
      expressionMapLoading,
      expressionMapError,
      expressionMap,
      sceneCompleting,
      canGeneratePractice,
      canGenerateVariants,
    ],
  );

  return {
    ...actionState,
    setShowAnswerMap,
    resetRouteScopedState,
    handleGeneratePractice,
    handleRegeneratePractice,
    handleGenerateVariants,
    handleRepeatPractice,
    handleRepeatVariants,
    prewarmPractice,
    prewarmVariants,
    handleCompleteBaseScene,
    handleMarkPracticeComplete,
    handleMarkVariantSetComplete,
    handleOpenVariant,
    handleDeletePracticeSet,
    handleDeleteVariantSet,
    handleDeleteVariantItem,
    handlePracticeToolClick,
    handleVariantToolClick,
    handleOpenExpressionMap,
  };
}
