import {
  PracticeGenerateRequest,
  PracticeGenerateResponse,
} from "@/lib/types/scene-parser";

const isPracticeGenerateResponse = (
  value: unknown,
): value is PracticeGenerateResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as PracticeGenerateResponse;
  return response.version === "v1" && Array.isArray(response.exercises);
};

export async function practiceGenerateFromApi(
  payload: PracticeGenerateRequest,
) {
  const response = await fetch("/api/practice/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to generate practice.";
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as unknown;
  if (!isPracticeGenerateResponse(data)) {
    throw new Error("Invalid practice response format.");
  }

  return data.exercises;
}
