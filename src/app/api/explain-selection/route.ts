import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
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

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody<Partial<ExplainSelectionRequest>>(request);

    if (!isValid(payload)) {
      return NextResponse.json({ error: "\u53c2\u6570\u4e0d\u5b8c\u6574\u3002" }, { status: 400 });
    }

    const result = await explainSelection(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "\u91ca\u4e49\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\u3002" },
      { status: 500 },
    );
  }
}
