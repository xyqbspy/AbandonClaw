"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { mapLessonToParsedScene } from "@/lib/adapters/scene-parser-adapter";
import { practiceGenerateFromApi } from "@/lib/utils/practice-generate-api";
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
import { SceneGeneratedState } from "@/lib/types/learning-flow";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { generateExpressionMapFromApi } from "@/lib/utils/expression-map-api";
import {
  clearExpiredSceneCaches,
  getSceneCache,
  listRecentSceneCacheKeys,
  normalizeSceneSlug,
  setSceneCache,
} from "@/lib/cache/scene-cache";
import { getPrefetchDebugState, scheduleScenePrefetch } from "@/lib/cache/scene-prefetch";
import {
  generateSceneVariantsFromApi,
  getScenesFromApi,
  getSceneDetailBySlugFromApi,
  getSceneVariantsFromApi,
} from "@/lib/utils/scenes-api";
import {
  completeSceneLearningFromApi,
  pauseSceneLearningFromApi,
  startSceneLearningFromApi,
  updateSceneLearningProgressFromApi,
} from "@/lib/utils/learning-api";
import {
  getSavedNormalizedPhraseTextsFromApi,
  savePhraseFromApi,
} from "@/lib/utils/phrases-api";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";
import {
  playChunkAudio,
  playSentenceAudio,
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
  buildReusedChunks,
  collectLessonChunkTexts,
  extractSlugFromSceneCacheKey,
  findChunkContext,
  toVariantStatusLabel,
  toVariantTitle,
} from "./scene-detail-logic";
import { buildPracticeSet, buildVariantSet, createGeneratedId } from "./scene-detail-actions";
import {
  resolveSceneToolIntent,
  resolveVariantDeleteOutcome,
  sceneDetailConfirmMessages,
  shouldReuseExpressionMapCache,
} from "./scene-detail-controller";
import {
  buildSceneLearningUpdatePayload,
  shouldFlushSceneLearningDelta,
} from "./scene-detail-learning-logic";
import {
  buildScenePrefetchPlan,
  resolveSceneCachePresentation,
  resolveSceneNetworkFailure,
} from "./scene-detail-load-logic";
import {
  buildSceneDetailHref,
  buildScenePrefetchCandidates,
  parseSceneDetailRouteState,
  SceneViewMode,
} from "./scene-detail-page-logic";

const appleButtonSmClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;
const appleButtonLgClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_LG}`;
const appleDangerButtonSmClassName = `${APPLE_BUTTON_DANGER} ${APPLE_BUTTON_TEXT_SM}`;

export default function SceneDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneSlug = params?.slug ?? "";
  const [baseLesson, setBaseLesson] = useState<Lesson | null>(null);
  const [sceneDataSource, setSceneDataSource] = useState<"none" | "cache" | "network">(
    "none",
  );
  const [sceneLoading, setSceneLoading] = useState(true);
  const baseSceneId = baseLesson?.id ?? "";

  const [viewMode, setViewMode] = useState<SceneViewMode>("scene");
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
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
  const [savedPhraseTextSet, setSavedPhraseTextSet] = useState<Set<string>>(new Set());
  const [generatedState, setGeneratedState] = useState<SceneGeneratedState>({
    latestPracticeSet: null,
    latestVariantSet: null,
    practiceStatus: "idle",
    variantStatus: "idle",
  });
  const playbackState = useTtsPlaybackState();
  const activeLoadTokenRef = useRef(0);
  const latestSceneSlugRef = useRef(normalizeSceneSlug(sceneSlug));
  const learningStartedRef = useRef(false);
  const lastProgressSyncMsRef = useRef<number>(Date.now());
  const learningPingTimerRef = useRef<number | null>(null);
  const currentViewModeRef = useRef<SceneViewMode>("scene");
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
  const flushLearningDelta = useCallback(
    (payload: {
      progressPercent: number;
      lastVariantIndex?: number;
      withPause?: boolean;
    }) => {
      const studySecondsDelta = computeElapsedSecondsSinceLastSync();
      if (
        !shouldFlushSceneLearningDelta({
          hasBaseLesson: Boolean(baseLesson),
          learningStarted: learningStartedRef.current,
          studySecondsDelta,
          withPause: Boolean(payload.withPause),
        })
      ) {
        return Promise.resolve();
      }

      if (!baseLesson) return Promise.resolve();

      return updateSceneLearningProgressFromApi(baseLesson.slug, {
        progressPercent: payload.progressPercent,
        lastVariantIndex: payload.lastVariantIndex,
        studySecondsDelta,
      })
        .then(() => {
          if (payload.withPause) {
            return pauseSceneLearningFromApi(baseLesson.slug);
          }
          return undefined;
        })
        .catch(() => {
          // Non-blocking.
        });
    },
    [baseLesson],
  );

  const computeElapsedSecondsSinceLastSync = () => {
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - lastProgressSyncMsRef.current) / 1000));
    lastProgressSyncMsRef.current = now;
    return elapsed;
  };

  const setViewModeWithRoute = (next: SceneViewMode, variantId?: string | null) => {
    const href = buildSceneDetailHref({
      sceneSlug,
      searchParams,
      nextViewMode: next,
      variantId,
    });
    router.push(href, { scroll: false });
  };

  const refreshGeneratedState = (sceneKey: string) => {
    if (!sceneKey) return;
    setGeneratedState(getSceneGeneratedState(sceneKey));
  };

  useEffect(() => {
    latestSceneSlugRef.current = normalizeSceneSlug(sceneSlug);
  }, [sceneSlug]);

  useEffect(() => {
    if (!sceneSlug) return;
    learningStartedRef.current = false;
    lastProgressSyncMsRef.current = Date.now();
    const requestToken = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = requestToken;
    const requestSlug = normalizeSceneSlug(sceneSlug);
    let cancelled = false;
    let hasCacheFallback = false;
    let cacheFresh = false;

    const canApply = () =>
      !cancelled &&
      activeLoadTokenRef.current === requestToken &&
      latestSceneSlugRef.current === requestSlug;

    const loadScene = async () => {
      setSceneLoading(true);
      setSceneDataSource("none");
      setBaseLesson(null);
      const cacheTask = (async () => {
        try {
          const cacheResult = await getSceneCache(requestSlug);
          if (!canApply()) return;
          if (cacheResult.found && cacheResult.record) {
            const presentation = resolveSceneCachePresentation({
              cacheFound: true,
              cacheExpired: cacheResult.isExpired,
            });
            hasCacheFallback = presentation.hasCacheFallback;
            cacheFresh = presentation.cacheFresh;
            if (presentation.shouldHydrateFromCache) {
              setBaseLesson(cacheResult.record.data);
              setSceneDataSource(presentation.nextDataSource);
            }
            if (presentation.shouldStopLoading) {
              setSceneLoading(false);
            }
          }
        } catch {
          // Non-blocking: cache failures should not block network flow.
        }
      })();

      await cacheTask;
      if (cacheFresh) return;

      try {
          const lesson = await getSceneDetailBySlugFromApi(sceneSlug);
        if (!canApply()) return;
        setBaseLesson(lesson);
        setSceneDataSource("network");
        setSceneLoading(false);
          void setSceneCache(requestSlug, lesson).catch(() => {
          // Non-blocking cache write.
        });

          // Low-disturb prefetch: only after current scene network result is visible.
          void (async () => {
            let sceneSlugs: string[] = [];
            let candidates: string[] = [];
            try {
              const list = await getScenesFromApi();
              if (!canApply()) return;
              sceneSlugs = list.map((item) => item.slug);
              candidates = buildScenePrefetchPlan({
                requestSlug,
                sceneSlugs,
                recentCacheKeys: [],
                extractSlugFromSceneCacheKey,
              });
            } catch {
              // Non-blocking: prefetch candidates can degrade gracefully.
            }

            if (candidates.length < 2) {
              try {
                const recentKeys = await listRecentSceneCacheKeys(8);
                candidates = buildScenePrefetchPlan({
                  requestSlug,
                  sceneSlugs,
                  recentCacheKeys: recentKeys,
                  extractSlugFromSceneCacheKey,
                });
              } catch {
                // ignore
              }
            }

            if (!canApply()) return;
            scheduleScenePrefetch(candidates, { currentSlug: requestSlug });
            if (process.env.NODE_ENV === "development") {
              console.debug("[scene-prefetch][debug]", getPrefetchDebugState());
            }
          })();
        } catch (error) {
          if (!canApply()) return;
          if (!hasCacheFallback) {
            setBaseLesson(null);
            setSceneLoading(false);
            toast.error(error instanceof Error ? error.message : "加载场景失败。");
          }
        }
      
    };

    void clearExpiredSceneCaches().catch(() => {
      // Non-blocking cleanup.
    });
    void loadScene();
    return () => {
      cancelled = true;
    };
  }, [sceneSlug]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!sceneSlug) return;
    void listRecentSceneCacheKeys(5)
      .then((keys) => {
        console.debug("[scene-cache][debug]", {
          slug: sceneSlug,
          source: sceneDataSource,
          queueTop5: keys,
          prefetch: getPrefetchDebugState(),
        });
      })
      .catch(() => {
        // ignore
      });
  }, [sceneDataSource, sceneSlug]);

  useEffect(() => {
    if (!baseLesson || learningStartedRef.current) return;
    learningStartedRef.current = true;
    lastProgressSyncMsRef.current = Date.now();
    void startSceneLearningFromApi(baseLesson.slug).catch(() => {
      // Non-blocking: scene reading should still work if progress API fails temporarily.
    });
  }, [baseLesson]);

  useEffect(() => {
    if (!baseLesson) {
      setSavedPhraseTextSet(new Set());
      return;
    }
    const candidates = collectLessonChunkTexts(baseLesson);
    if (candidates.length === 0) {
      setSavedPhraseTextSet(new Set());
      return;
    }
    let cancelled = false;
    void getSavedNormalizedPhraseTextsFromApi(candidates)
      .then((texts) => {
        if (cancelled) return;
        setSavedPhraseTextSet(new Set(texts.map((text) => normalizePhraseText(text))));
      })
      .catch(() => {
        if (cancelled) return;
        setSavedPhraseTextSet(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [baseLesson]);


  useEffect(() => {
    if (!baseLesson) return;
    let cancelled = false;

    const syncVariantsFromDb = async () => {
      try {
        const variants = await getSceneVariantsFromApi(baseLesson.slug);
        if (cancelled || variants.length === 0) return;

        const current = getSceneGeneratedState(baseLesson.id).latestVariantSet;
        if (current) return;

        const variantSet = buildVariantSet({
          baseLesson,
          variants,
          reusedChunks: buildReusedChunks(baseLesson),
          nowIso: new Date().toISOString(),
          createId: () => `db-variant-${baseLesson.id}`,
        });
        saveVariantSet(variantSet);
        refreshGeneratedState(baseLesson.id);
      } catch {
        // Keep local-only variants if db sync fails.
      }
    };

    void syncVariantsFromDb();
    return () => {
      cancelled = true;
    };
  }, [baseLesson]);

  useEffect(() => {
    const routeState = parseSceneDetailRouteState(searchParams);
    setViewMode(routeState.viewMode);
    setActiveVariantId(routeState.activeVariantId);
    setPracticeError(null);
    setVariantsError(null);
    setShowAnswerMap({});
    setVariantChunkModalOpen(false);
    setVariantChunkDetail(null);
    setVariantChunkSentence(null);
    setVariantChunkRelatedChunks([]);
    setVariantChunkHoveredKey(null);
    setExpressionMapLoading(false);
    setExpressionMapError(null);
    setExpressionMap(null);
    setExpressionMapVariantSetId(null);
    refreshGeneratedState(baseSceneId);
  }, [sceneSlug, baseSceneId, searchParams]);

  useEffect(() => {
    currentViewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    if (!baseLesson) return;
    const timer = window.setTimeout(() => {
      void flushLearningDelta(
        buildSceneLearningUpdatePayload({
          viewMode,
          activeVariantId,
        }),
      );
    }, 1200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [activeVariantId, baseLesson, flushLearningDelta, viewMode]);

  useEffect(() => {
    if (!baseLesson) return;
    if (learningPingTimerRef.current) {
      window.clearInterval(learningPingTimerRef.current);
    }
    learningPingTimerRef.current = window.setInterval(() => {
      void flushLearningDelta(
        buildSceneLearningUpdatePayload({
          viewMode,
        }),
      );
    }, 60000);

    return () => {
      if (learningPingTimerRef.current) {
        window.clearInterval(learningPingTimerRef.current);
        learningPingTimerRef.current = null;
      }
    };
  }, [baseLesson, flushLearningDelta, viewMode]);

  useEffect(() => {
    if (!baseLesson) return;
    return () => {
      void flushLearningDelta(
        buildSceneLearningUpdatePayload({
          viewMode: currentViewModeRef.current,
          withPause: true,
        }),
      );
    };
  }, [baseLesson, flushLearningDelta]);

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
      const parsedScene = mapLessonToParsedScene(sourceLesson);
      const exercises = await practiceGenerateFromApi({
        scene: parsedScene,
        exerciseCount: 8,
      });

      const practiceSet = buildPracticeSet({
        baseLesson,
        sourceLesson,
        exercises,
        nowIso: new Date().toISOString(),
        createId: createGeneratedId,
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
      const variants = await generateSceneVariantsFromApi({
        sceneSlug: baseLesson.slug,
        variantCount: 3,
        retainChunkRatio: 0.6,
      });

      const variantSet = buildVariantSet({
        baseLesson,
        variants,
        reusedChunks: buildReusedChunks(baseLesson),
        nowIso: new Date().toISOString(),
        createId: createGeneratedId,
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
    if (
      expressionMap &&
      shouldReuseExpressionMapCache({
        currentVariantSetId: latestVariantSet.id,
        cachedVariantSetId: expressionMapVariantSetId,
      })
    ) {
      return expressionMap;
    }

    setExpressionMapLoading(true);
    setExpressionMapError(null);
    try {
      const response = await generateExpressionMapFromApi({
        sourceSceneId: baseLesson.id,
        sourceSceneTitle: baseLesson.title,
        baseExpressions: buildReusedChunks(baseLesson, 50),
        variantExpressionSources: latestVariantSet.variants.map((variant) => ({
          sourceSceneId: variant.id,
          expressions: buildReusedChunks(variant.lesson, 50),
        })),
      });
      setExpressionMap(response);
      setExpressionMapVariantSetId(latestVariantSet.id);
      return response;
    } catch (error) {
      setExpressionMapError(
        error instanceof Error ? error.message : "表达地图生成失败。",
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


