import { NextResponse } from "next/server";
import { explainSelection } from "@/lib/explain/provider";
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
    const payload = (await request.json()) as Partial<ExplainSelectionRequest>;

    if (!isValid(payload)) {
      return NextResponse.json(
        { error: "参数不完整" },
        { status: 400 },
      );
    }

    const result = await explainSelection(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "释义服务暂时不可用" },
      { status: 500 },
    );
  }
}
