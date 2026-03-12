import {
  MutateSceneRequest,
  ParsedScene,
  SceneMutateResponse,
} from "@/lib/types/scene-parser";

const isSceneMutateResponse = (value: unknown): value is SceneMutateResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as SceneMutateResponse;
  return response.version === "v1" && Array.isArray(response.variants);
};

export async function mutateSceneFromApi(
  payload: MutateSceneRequest,
): Promise<ParsedScene[]> {
  const response = await fetch("/api/scene/mutate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to mutate scene.";
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as unknown;
  if (!isSceneMutateResponse(data)) {
    throw new Error("Invalid mutate response format.");
  }

  return data.variants;
}
