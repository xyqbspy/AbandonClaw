import { NextResponse } from "next/server";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import {
  listUserSavedPhraseTextsByNormalized,
  listUserSavedPhrases,
} from "@/lib/server/phrases/service";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { UserPhraseReviewStatus } from "@/lib/server/db/types";

const parsePositiveInt = (
  value: string | null,
  fieldName: string,
  fallback: number,
  max: number,
) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number.`);
  }
  return Math.min(max, Math.floor(parsed));
};

export async function GET(request: Request) {
  try {
    const { user } = await requireCurrentProfile();
    const { searchParams } = new URL(request.url);

    const normalizedTextsRaw = searchParams.get("normalizedTexts");
    if (normalizedTextsRaw) {
      const normalizedTexts = normalizedTextsRaw
        .split(",")
        .map((item) => normalizePhraseText(item))
        .filter(Boolean)
        .slice(0, 120);
      const texts = await listUserSavedPhraseTextsByNormalized(user.id, normalizedTexts);
      return NextResponse.json({ texts }, { status: 200 });
    }

    const query = searchParams.get("query")?.trim() ?? "";
    const page = parsePositiveInt(searchParams.get("page"), "page", 1, 10000);
    const limit = parsePositiveInt(searchParams.get("limit"), "limit", 20, 100);
    const statusRaw = searchParams.get("status");
    const status =
      statusRaw === "archived"
        ? "archived"
        : statusRaw === "saved" || !statusRaw
          ? "saved"
          : (() => {
              throw new ValidationError("status must be saved or archived.");
            })();
    const reviewStatusRaw = searchParams.get("reviewStatus");
    const reviewStatus: UserPhraseReviewStatus | "all" =
      reviewStatusRaw === "saved" ||
      reviewStatusRaw === "reviewing" ||
      reviewStatusRaw === "mastered" ||
      reviewStatusRaw === "archived"
        ? reviewStatusRaw
        : reviewStatusRaw === "all" || !reviewStatusRaw
          ? "all"
          : (() => {
              throw new ValidationError(
                "reviewStatus must be all/saved/reviewing/mastered/archived.",
              );
            })();
    const learningItemTypeRaw = searchParams.get("learningItemType");
    const learningItemType: "expression" | "sentence" | "all" =
      learningItemTypeRaw === "expression" || learningItemTypeRaw === "sentence"
        ? learningItemTypeRaw
        : learningItemTypeRaw === "all" || !learningItemTypeRaw
          ? "all"
          : (() => {
              throw new ValidationError("learningItemType must be all/expression/sentence.");
            })();

    const result = await listUserSavedPhrases({
      userId: user.id,
      query,
      page,
      limit,
      status,
      reviewStatus,
      learningItemType,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to list user phrases.");
  }
}
