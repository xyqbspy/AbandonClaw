import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { ValidationError } from "@/lib/server/errors";
import { parseJsonBody } from "@/lib/server/validation";
import { ExplainSelectionRequest } from "@/lib/types";

const isValid = (payload: Partial<ExplainSelectionRequest>): payload is ExplainSelectionRequest =>
  Boolean(
    payload.selectedText?.trim() &&
      payload.sourceSentence?.trim() &&
      payload.lessonId?.trim() &&
      payload.lessonTitle?.trim() &&
      payload.lessonDifficulty?.trim(),
  );

interface ExplainSelectionDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  explainSelection: typeof explainSelection;
}

const defaultDependencies: ExplainSelectionDependencies = {
  requireCurrentProfile,
  explainSelection,
};

export async function handleExplainSelectionPost(
  request: Request,
  dependencies: ExplainSelectionDependencies = defaultDependencies,
) {
  try {
    await dependencies.requireCurrentProfile();
    const payload = await parseJsonBody<Partial<ExplainSelectionRequest>>(request);

    if (!isValid(payload)) {
      throw new ValidationError("参数不完整。");
    }

    const result = await dependencies.explainSelection(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "释义服务暂时不可用。");
  }
}

export async function POST(request: Request) {
  return handleExplainSelectionPost(request);
}
