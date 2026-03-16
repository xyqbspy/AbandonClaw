import { mapParsedSceneToLesson } from "@/lib/adapters/scene-parser-adapter";
import { Lesson } from "@/lib/types";
import { ParseSceneRequest, SceneParserResponse } from "@/lib/types/scene-parser";

const isSceneParserResponse = (value: unknown): value is SceneParserResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as SceneParserResponse;
  return (
    response.version === "v1" &&
    Boolean(response.scene) &&
    typeof response.scene?.id === "string" &&
    typeof response.scene?.slug === "string" &&
    Array.isArray(response.scene?.sections)
  );
};

export async function parseSceneFromApi(payload: ParseSceneRequest): Promise<Lesson> {
  const response = await fetch("/api/scene/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "解析场景失败。";
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as unknown;
  if (!isSceneParserResponse(data)) {
    throw new Error("场景解析响应格式无效。");
  }

  return mapParsedSceneToLesson(data);
}
