import { NextResponse } from "next/server";
import { isAppError } from "@/lib/server/errors";

const mapLegacyMessageToStatus = (message: string) => {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 500;
};

export const toApiErrorResponse = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details ?? null,
      },
      { status: error.status },
    );
  }

  if (error instanceof Error) {
    const status = mapLegacyMessageToStatus(error.message);
    if (status !== 500) {
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      {
        error: fallbackMessage,
        code: "INTERNAL_ERROR",
        details: null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      code: "INTERNAL_ERROR",
      details: null,
    },
    { status: 500 },
  );
};
