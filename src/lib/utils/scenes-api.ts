import { Lesson } from "@/lib/types";
import { mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { ParsedScene } from "@/lib/types/scene-parser";

export interface SceneListItemResponse {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  difficulty: string;
  estimatedMinutes: number;
  sentenceCount: number;
  sourceType: "builtin" | "imported";
  createdAt: string;
  variantLinks: Array<{ id: string; label: string }>;
}

const extractError = async (response: Response, fallback: string) => {
  let message = fallback;
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body.error === "string" && body.error.trim()) {
      message = body.error;
    }
  } catch {
    // Ignore JSON parsing failure.
  }
  return message;
};

export async function getScenesFromApi() {
  const response = await fetch("/api/scenes", { method: "GET" });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to load scenes."));
  }
  const data = (await response.json()) as { scenes?: SceneListItemResponse[] };
  return data.scenes ?? [];
}

export async function getSceneDetailBySlugFromApi(slug: string): Promise<Lesson> {
  const response = await fetch(`/api/scenes/${encodeURIComponent(slug)}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to load scene detail."));
  }
  const data = (await response.json()) as { scene?: Lesson };
  if (!data.scene) throw new Error("Invalid scene detail response.");
  return data.scene;
}

export async function importSceneFromApi(payload: {
  sourceText: string;
  title?: string;
  theme?: string;
}) {
  const response = await fetch("/api/scenes/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to import scene."));
  }
  const data = (await response.json()) as { scene?: Lesson };
  if (!data.scene) throw new Error("Invalid import response.");
  return data.scene;
}

export async function deleteSceneBySlugFromApi(slug: string) {
  const response = await fetch(`/api/scenes/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to delete scene."));
  }
}

const toVariantLesson = (variant: ParsedScene, index: number): Lesson => {
  const lesson = mapParsedSceneToLesson({
    version: "v1",
    scene: variant,
  });
  const variantId = `${lesson.id}-variant-${index + 1}`;
  return {
    ...lesson,
    id: variantId,
    slug: `${lesson.slug}-variant-${index + 1}`,
    title: `${lesson.title} (Variant ${index + 1})`,
    sourceType: "variant",
  };
};

export async function getSceneVariantsFromApi(sceneId: string) {
  const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/variants`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to load variants."));
  }
  const data = (await response.json()) as {
    variants?: ParsedScene[];
  };
  const variants = data.variants ?? [];
  return variants.map((variant, index) => toVariantLesson(variant, index));
}

export async function generateSceneVariantsFromApi(params: {
  sceneId: string;
  variantCount?: number;
  retainChunkRatio?: number;
  theme?: string;
}) {
  const response = await fetch(`/api/scenes/${encodeURIComponent(params.sceneId)}/variants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      variantCount: params.variantCount,
      retainChunkRatio: params.retainChunkRatio,
      theme: params.theme,
    }),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to generate variants."));
  }
  const data = (await response.json()) as { variants?: ParsedScene[] };
  const variants = data.variants ?? [];
  return variants.map((variant, index) => toVariantLesson(variant, index));
}
