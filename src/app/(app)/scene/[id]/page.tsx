"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { LessonReader } from "@/features/lesson/components/lesson-reader";
import { getSceneBySlug } from "@/lib/data/mock-lessons";
import { Lesson } from "@/lib/types";
import { getCustomScenarioBySlug } from "@/lib/utils/custom-scenario-storage";

const subscribe = () => () => {};

export default function SceneDetailPage() {
  const params = useParams<{ id: string }>();
  const sceneId = params?.id ?? "";
  const presetScene = useMemo(() => getSceneBySlug(sceneId), [sceneId]);
  const customScene = useSyncExternalStore<Lesson | null>(
    subscribe,
    () => (presetScene ? null : getCustomScenarioBySlug(sceneId) ?? null),
    () => null,
  );

  if (presetScene) {
    return <LessonReader lesson={presetScene} />;
  }

  if (!customScene) {
    return <div className="p-4 text-sm text-muted-foreground">未找到该场景内容。</div>;
  }

  return <LessonReader lesson={customScene} />;
}

