import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isAppError } from "@/lib/server/errors";
import {
  attachRequestIdToResponse,
  getOrCreateRequestId,
} from "@/lib/server/request-context";
import type { RequestUserType } from "@/lib/server/logger";

const mapLegacyMessageToStatus = (message: string) => {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 500;
};

type CaptureUnknownServerError = (
  error: unknown,
  requestId: string,
  userType?: RequestUserType | null,
) => void;

const defaultCaptureUnknownServerError: CaptureUnknownServerError = (error, requestId, userType) => {
  Sentry.withScope((scope) => {
    scope.setTag("requestId", requestId);
    if (userType) scope.setTag("user_type", userType);
    Sentry.captureException(error);
  });
};

export const toApiErrorResponse = (
  error: unknown,
  fallbackMessage: string,
  options?: {
    request?: Request | Headers | null;
    requestId?: string;
    userType?: RequestUserType | null;
    captureUnknownServerError?: CaptureUnknownServerError;
  },
) => {
  const requestId = options?.requestId ?? getOrCreateRequestId(options?.request);
  const userType = options?.userType ?? null;
  const captureUnknownServerError =
    options?.captureUnknownServerError ?? defaultCaptureUnknownServerError;

  if (isAppError(error)) {
    return attachRequestIdToResponse(
      NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details ?? null,
          requestId,
        },
        { status: error.status },
      ),
      requestId,
    );
  }

  if (error instanceof Error) {
    const status = mapLegacyMessageToStatus(error.message);
    if (status !== 500) {
      return attachRequestIdToResponse(
        NextResponse.json({ error: error.message, requestId }, { status }),
        requestId,
      );
    }

    captureUnknownServerError(error, requestId, userType);

    return attachRequestIdToResponse(
      NextResponse.json(
        {
          error: fallbackMessage,
          code: "INTERNAL_ERROR",
          details: null,
          requestId,
        },
        { status: 500 },
      ),
      requestId,
    );
  }

  captureUnknownServerError(error, requestId, userType);

  return attachRequestIdToResponse(
    NextResponse.json(
      {
        error: fallbackMessage,
        code: "INTERNAL_ERROR",
        details: null,
        requestId,
      },
      { status: 500 },
    ),
    requestId,
  );
};
