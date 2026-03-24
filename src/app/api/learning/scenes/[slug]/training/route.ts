import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import {
  recordSceneTrainingEvent,
  SceneTrainingEvent,
} from "@/lib/server/learning/service";
import {
  parseJsonBody,
  parseOptionalTrimmedString,
} from "@/lib/server/validation";
import { ValidationError } from "@/lib/server/errors";

interface TrainingPayload extends Record<string, unknown> {
  event?: unknown;
  selectedBlockId?: unknown;
}

const parseTrainingEvent = (value: unknown): SceneTrainingEvent => {
  if (
    value === "full_play" ||
    value === "open_expression" ||
    value === "practice_sentence" ||
    value === "scene_practice_complete"
  ) {
    return value;
  }
  throw new ValidationError(
    "event must be one of full_play/open_expression/practice_sentence/scene_practice_complete.",
  );
};

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { user } = await requireCurrentProfile();
    const { slug } = await context.params;
    const payload = await parseJsonBody<TrainingPayload>(request);
    const result = await recordSceneTrainingEvent(user.id, slug, {
      event: parseTrainingEvent(payload.event),
      selectedBlockId: parseOptionalTrimmedString(
        payload.selectedBlockId,
        "selectedBlockId",
        120,
      ),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to record scene training event.");
  }
}
