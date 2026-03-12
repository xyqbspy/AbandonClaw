import {
  ExpressionMapGenerateRequest,
  ExpressionMapResponse,
} from "@/lib/types/expression-map";

const isExpressionMapResponse = (
  value: unknown,
): value is ExpressionMapResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as ExpressionMapResponse;
  return response.version === "v1" && Array.isArray(response.families);
};

export async function generateExpressionMapFromApi(
  payload: ExpressionMapGenerateRequest,
): Promise<ExpressionMapResponse> {
  const response = await fetch("/api/expression-map/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to generate expression map.";
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as unknown;
  if (!isExpressionMapResponse(data)) {
    throw new Error("Invalid expression map response format.");
  }

  return data;
}
