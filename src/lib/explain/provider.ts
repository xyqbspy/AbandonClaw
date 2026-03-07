import { ExplainSelectionRequest, SelectionExplainResponse } from "@/lib/types";
import { explainWithMock } from "@/lib/explain/providers/mock";
import { explainWithOpenAI } from "@/lib/explain/providers/openai";

export async function explainSelection(
  payload: ExplainSelectionRequest,
): Promise<SelectionExplainResponse> {
  const provider = process.env.EXPLAIN_PROVIDER ?? "mock";

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      return await explainWithOpenAI(payload);
    } catch {
      return explainWithMock(payload);
    }
  }

  return explainWithMock(payload);
}
