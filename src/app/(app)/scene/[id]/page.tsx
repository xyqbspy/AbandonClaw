"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { LessonReader } from "@/features/lesson/components/lesson-reader";
import { getSceneBySlug } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import {
  mapLessonToParsedScene,
  mapParsedSceneToLesson,
} from "@/lib/adapters/scene-parser-adapter";
import { mutateSceneFromApi } from "@/lib/utils/scene-mutate-api";
import { parseSceneFromApi } from "@/lib/utils/scene-parser-api";
import { practiceGenerateFromApi } from "@/lib/utils/practice-generate-api";
import { getCustomScenarioBySlug } from "@/lib/utils/custom-scenario-storage";
import {
  getSceneGeneratedState,
  markPracticeSetCompleted,
  markVariantItemStatus,
  markVariantSetCompleted,
  savePracticeSet,
  saveVariantSet,
} from "@/lib/utils/scene-learning-flow-storage";
import { SceneGeneratedState } from "@/lib/types/learning-flow";

const subscribe = () => () => {};
const API_SCENE_SLUG = "take-the-morning-off";

type SceneViewMode = "scene" | "practice" | "variants" | "variant-study";

const toRawTextForParser = (lesson: Lesson) =>
  lesson.sections
    .flatMap((section) => section.sentences)
    .map((sentence) =>
      sentence.speaker ? `${sentence.speaker}: ${sentence.text}` : sentence.text,
    )
    .join("\n");

const buildReusedChunks = (lesson: Lesson, limit = 12) => {
  const seen = new Set<string>();
  const chunks: string[] = [];

  for (const section of lesson.sections) {
    for (const sentence of section.sentences) {
      const source = sentence.chunkDetails?.map((item) => item.text) ?? sentence.chunks;
      for (const chunk of source) {
        const normalized = chunk.trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        chunks.push(normalized);
        if (chunks.length >= limit) return chunks;
      }
    }
  }

  return chunks;
};

const makeGeneratedId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function SceneDetailPage() {
  const params = useParams<{ id: string }>();
  const sceneId = params?.id ?? "";
  const presetScene = useMemo(() => getSceneBySlug(sceneId), [sceneId]);
  const [apiLesson, setApiLesson] = useState<Lesson | null>(null);
  const shouldFetchFromApi = sceneId === API_SCENE_SLUG && Boolean(presetScene);
  const customScene = useSyncExternalStore<Lesson | null>(
    subscribe,
    () => (presetScene ? null : getCustomScenarioBySlug(sceneId) ?? null),
    () => null,
  );

  const baseLesson = apiLesson ?? presetScene ?? customScene;
  const baseSceneId = baseLesson?.id ?? "";

  const [viewMode, setViewMode] = useState<SceneViewMode>("scene");
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});
  const [generatedState, setGeneratedState] = useState<SceneGeneratedState>({
    latestPracticeSet: null,
    latestVariantSet: null,
    practiceStatus: "idle",
    variantStatus: "idle",
  });

  useEffect(() => {
    if (!shouldFetchFromApi || !presetScene) {
      setApiLesson(null);
      return;
    }

    let disposed = false;
    parseSceneFromApi({
      rawText: toRawTextForParser(presetScene),
      sourceLanguage: "en",
    })
      .then((lesson) => {
        if (disposed) return;
        setApiLesson(lesson);
      })
      .catch(() => {
        if (disposed) return;
        setApiLesson(null);
      });

    return () => {
      disposed = true;
    };
  }, [presetScene, shouldFetchFromApi]);

  const refreshGeneratedState = (sceneKey: string) => {
    if (!sceneKey) return;
    setGeneratedState(getSceneGeneratedState(sceneKey));
  };

  useEffect(() => {
    setViewMode("scene");
    setActiveVariantId(null);
    setPracticeError(null);
    setVariantsError(null);
    setShowAnswerMap({});
    refreshGeneratedState(baseSceneId);
  }, [sceneId, baseSceneId]);

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

      const isVariantSource = sourceLesson.sourceType === "variant";
      const practiceSet = {
        id: makeGeneratedId("practice"),
        sourceSceneId: baseLesson.id,
        sourceSceneTitle: baseLesson.title,
        sourceType: isVariantSource ? ("variant" as const) : ("original" as const),
        sourceVariantId: isVariantSource ? sourceLesson.id : undefined,
        sourceVariantTitle: isVariantSource ? sourceLesson.title : undefined,
        exercises,
        status: "generated" as const,
        createdAt: new Date().toISOString(),
      };

      savePracticeSet(practiceSet);
      refreshGeneratedState(baseLesson.id);
      setShowAnswerMap({});
      setViewMode("practice");
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
      const parsedScene = mapLessonToParsedScene(baseLesson);
      const variants = await mutateSceneFromApi({
        scene: parsedScene,
        variantCount: 3,
        retainChunkRatio: 0.6,
      });

      const variantItems = variants.map((variant, index) => {
        const lesson = mapParsedSceneToLesson({ version: "v1", scene: variant });
        const variantId = `${lesson.id}-variant-${index + 1}`;
        const normalizedLesson: Lesson = {
          ...lesson,
          id: variantId,
          slug: `${lesson.slug}-variant-${index + 1}`,
          title: `${lesson.title} (Variant ${index + 1})`,
          sourceType: "variant",
        };

        return {
          id: variantId,
          lesson: normalizedLesson,
          status: "unviewed" as const,
        };
      });

      const variantSet = {
        id: makeGeneratedId("variant"),
        sourceSceneId: baseLesson.id,
        sourceSceneTitle: baseLesson.title,
        reusedChunks: buildReusedChunks(baseLesson),
        variants: variantItems,
        status: "generated" as const,
        createdAt: new Date().toISOString(),
      };

      saveVariantSet(variantSet);
      refreshGeneratedState(baseLesson.id);
      setActiveVariantId(null);
      setViewMode("variants");
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
  };

  const handleMarkVariantSetComplete = () => {
    if (!baseLesson || !latestVariantSet) return;
    markVariantSetCompleted(baseLesson.id, latestVariantSet.id);
    refreshGeneratedState(baseLesson.id);
  };

  const handleOpenVariant = (variantId: string) => {
    if (!baseLesson || !latestVariantSet) return;
    markVariantItemStatus(baseLesson.id, latestVariantSet.id, variantId, "viewed");
    refreshGeneratedState(baseLesson.id);
    setActiveVariantId(variantId);
    setViewMode("variant-study");
  };

  const handlePracticeToolClick = () => {
    if (!baseLesson || practiceLoading) return;
    if (generatedState.practiceStatus === "idle") {
      void handleGeneratePractice(baseLesson);
      return;
    }
    setViewMode("practice");
  };

  const handleVariantToolClick = () => {
    if (!baseLesson || variantsLoading) return;
    if (generatedState.variantStatus === "idle") {
      void handleGenerateVariants();
      return;
    }
    setViewMode("variants");
  };

  if (!baseLesson) {
    return <div className="p-4 text-sm text-muted-foreground">Scene not found.</div>;
  }

  if (viewMode === "practice") {
    return (
      <div className="space-y-4">
        <section className="space-y-3 rounded-lg border border-border/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={() => setViewMode("scene")}
            >
              返回原场景 / Back to Original Scene
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
              onClick={handleMarkPracticeComplete}
              disabled={!latestPracticeSet || latestPracticeSet.status === "completed"}
            >
              标记为已完成 / Mark as Complete
            </button>
          </div>

          <div className="text-sm text-muted-foreground">
            {latestPracticeSet?.sourceType === "variant" ? (
              <p>
                当前练习基于：{latestPracticeSet.sourceVariantTitle ?? "Variant"}；来源场景：
                {latestPracticeSet.sourceSceneTitle}
              </p>
            ) : (
              <p>当前练习基于：{baseLesson.title}</p>
            )}
            <p className="mt-1">
              这组练习基于当前场景生成，用来帮助你回忆、填空和改写核心表达。
            </p>
          </div>
        </section>

        {!latestPracticeSet ? (
          <p className="text-sm text-muted-foreground">还没有可查看的练习集。</p>
        ) : (
          <section className="space-y-3 rounded-lg border border-border/70 p-4">
            <ul className="space-y-2">
              {latestPracticeSet.exercises.map((exercise, index) => {
                const visible = Boolean(showAnswerMap[exercise.id]);
                return (
                  <li key={`${exercise.id}-${index}`} className="rounded-md border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">{exercise.type}</p>
                    <p className="mt-1">{exercise.prompt}</p>
                    {exercise.targetChunk ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        targetChunk: {exercise.targetChunk}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-2 rounded border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() =>
                        setShowAnswerMap((prev) => ({
                          ...prev,
                          [exercise.id]: !prev[exercise.id],
                        }))
                      }
                    >
                      {visible ? "Hide Answer" : "Show Answer"}
                    </button>
                    {visible ? (
                      <p className="mt-2 rounded bg-muted/40 p-2 text-sm">{exercise.answer}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (viewMode === "variants") {
    return (
      <div className="space-y-4">
        <section className="space-y-3 rounded-lg border border-border/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={() => setViewMode("scene")}
            >
              返回原场景 / Back to Original Scene
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
              onClick={handleMarkVariantSetComplete}
              disabled={!latestVariantSet || latestVariantSet.status === "completed"}
            >
              标记为已完成 / Mark as Complete
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            这些相似场景基于：{baseLesson.title}。这些相似场景会复用当前场景的核心 chunk，帮助你在新语境中继续练习。
          </p>
          {latestVariantSet?.reusedChunks?.length ? (
            <div className="flex flex-wrap gap-2">
              {latestVariantSet.reusedChunks.map((chunk) => (
                <span
                  key={chunk}
                  className="rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs"
                >
                  {chunk}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {!latestVariantSet ? (
          <p className="text-sm text-muted-foreground">还没有可查看的变体集。</p>
        ) : (
          <section className="space-y-2 rounded-lg border border-border/70 p-4">
            <ul className="space-y-2">
              {latestVariantSet.variants.map((variant) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{variant.lesson.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant.lesson.sections[0]?.summary ?? variant.lesson.subtitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">状态：{variant.status}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs hover:bg-muted"
                    onClick={() => handleOpenVariant(variant.id)}
                  >
                    Open Variant
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (viewMode === "variant-study" && activeVariantLesson) {
    return (
      <div className="space-y-4">
        <section className="space-y-3 rounded-lg border border-border/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={() => setViewMode("variants")}
            >
              Back to Similar Scenes
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
              disabled={!canGeneratePractice}
              onClick={() => handleGeneratePractice(activeVariantLesson)}
            >
              {practiceLoading ? "正在生成练习…" : "练习这个场景 / Practice This Scene"}
            </button>
            {latestPracticeSet ? (
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                onClick={() => setViewMode("practice")}
              >
                查看练习 / View Practice
              </button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            当前学习中：{activeVariantLesson.title}。你可以基于这个 variant 继续生成练习。
          </p>
        </section>
        <LessonReader lesson={activeVariantLesson} />
      </div>
    );
  }

  const headerTools = (
    <>
      <button
        type="button"
        className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-60"
        onClick={handlePracticeToolClick}
        disabled={practiceLoading}
      >
        {practiceLoading
          ? "练习中…"
          : generatedState.practiceStatus === "idle"
            ? "练习"
            : "查看练习"}
      </button>
      {generatedState.practiceStatus === "completed" ? (
        <button
          type="button"
          className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-60"
          onClick={() => handleGeneratePractice(baseLesson)}
          disabled={practiceLoading}
        >
          重新练习
        </button>
      ) : null}
      <button
        type="button"
        className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-60"
        onClick={handleVariantToolClick}
        disabled={variantsLoading}
      >
        {variantsLoading
          ? "生成中…"
          : generatedState.variantStatus === "idle"
            ? "变体"
            : "查看变体"}
      </button>
      {generatedState.variantStatus === "completed" ? (
        <button
          type="button"
          className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-60"
          onClick={handleGenerateVariants}
          disabled={variantsLoading}
        >
          新变体
        </button>
      ) : null}
    </>
  );

  return (
    <div className="space-y-5">
      {practiceError ? <p className="text-sm text-destructive">{practiceError}</p> : null}
      {variantsError ? <p className="text-sm text-destructive">{variantsError}</p> : null}

      <LessonReader lesson={baseLesson} headerTools={headerTools} />
    </div>
  );
}
