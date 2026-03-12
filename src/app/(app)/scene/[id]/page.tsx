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
import { PracticeExercise } from "@/lib/types/scene-parser";
import { getCustomScenarioBySlug } from "@/lib/utils/custom-scenario-storage";

const subscribe = () => () => {};
const API_SCENE_SLUG = "take-the-morning-off";

const toRawTextForParser = (lesson: Lesson) =>
  lesson.sections
    .flatMap((section) => section.sentences)
    .map((sentence) =>
      sentence.speaker ? `${sentence.speaker}: ${sentence.text}` : sentence.text,
    )
    .join("\n");

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

  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceExercises, setPracticeExercises] = useState<PracticeExercise[]>([]);
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});

  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [variantLessons, setVariantLessons] = useState<Lesson[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);

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

  useEffect(() => {
    setPracticeError(null);
    setPracticeExercises([]);
    setShowAnswerMap({});
    setVariantsError(null);
    setVariantLessons([]);
    setActiveVariantIndex(null);
  }, [sceneId]);

  const baseLesson = apiLesson ?? presetScene ?? customScene;
  const activeVariantLesson =
    activeVariantIndex !== null ? variantLessons[activeVariantIndex] ?? null : null;
  const lessonToRender = activeVariantLesson ?? baseLesson;

  const handleGeneratePractice = async () => {
    if (!lessonToRender) return;
    setPracticeLoading(true);
    setPracticeError(null);

    try {
      const parsedScene = mapLessonToParsedScene(lessonToRender);
      const exercises = await practiceGenerateFromApi({
        scene: parsedScene,
        exerciseCount: 8,
      });
      setPracticeExercises(exercises);
      setShowAnswerMap({});
    } catch (error) {
      setPracticeError(
        error instanceof Error ? error.message : "Failed to generate practice.",
      );
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (!lessonToRender) return;
    setVariantsLoading(true);
    setVariantsError(null);

    try {
      const parsedScene = mapLessonToParsedScene(lessonToRender);
      const variants = await mutateSceneFromApi({
        scene: parsedScene,
        variantCount: 3,
        retainChunkRatio: 0.6,
      });

      const nextLessons = variants.map((variant, index) => {
        const lesson = mapParsedSceneToLesson({ version: "v1", scene: variant });
        return {
          ...lesson,
          id: `${lesson.id}-variant-${index + 1}`,
          slug: `${lesson.slug}-variant-${index + 1}`,
          title: `${lesson.title} (Variant ${index + 1})`,
        };
      });

      setVariantLessons(nextLessons);
      setActiveVariantIndex(null);
    } catch (error) {
      setVariantsError(
        error instanceof Error ? error.message : "Failed to generate variants.",
      );
    } finally {
      setVariantsLoading(false);
    }
  };

  if (!lessonToRender) {
    return <div className="p-4 text-sm text-muted-foreground">Scene not found.</div>;
  }

  return (
    <div className="space-y-5">
      <LessonReader lesson={lessonToRender} />

      <section className="space-y-3 rounded-lg border border-border/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
            disabled={practiceLoading}
            onClick={handleGeneratePractice}
          >
            {practiceLoading ? "Generating..." : "Generate Practice"}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
            disabled={variantsLoading}
            onClick={handleGenerateVariants}
          >
            {variantsLoading ? "Generating..." : "Generate Variants"}
          </button>
          {activeVariantLesson ? (
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={() => setActiveVariantIndex(null)}
            >
              Back to Original
            </button>
          ) : null}
        </div>

        {practiceError ? (
          <p className="text-sm text-destructive">{practiceError}</p>
        ) : null}
        {variantsError ? <p className="text-sm text-destructive">{variantsError}</p> : null}

        {practiceExercises.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Practice</h3>
            <ul className="space-y-2">
              {practiceExercises.map((exercise, index) => {
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
                      <p className="mt-2 rounded bg-muted/40 p-2 text-sm">
                        {exercise.answer}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {variantLessons.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Variants</h3>
            <ul className="space-y-2">
              {variantLessons.map((variantLesson, index) => (
                <li
                  key={variantLesson.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{variantLesson.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {variantLesson.sections[0]?.summary ?? variantLesson.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs hover:bg-muted"
                    onClick={() => setActiveVariantIndex(index)}
                  >
                    Open Variant
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
