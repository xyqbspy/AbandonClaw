import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { resendSignupVerificationEmail } from "@/lib/server/email-verification";
import { buildEmailVerificationRedirectTo } from "@/lib/server/email-verification-url";
import { logApiError } from "@/lib/server/logger";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { parseJsonBody } from "@/lib/server/validation";

type ResendVerificationRequestBody = {
  email?: string;
};

type ResendVerificationDependencies = {
  assertAllowedOrigin: typeof assertAllowedOrigin;
  parseJsonBody: typeof parseJsonBody<ResendVerificationRequestBody>;
  resendSignupVerificationEmail: typeof resendSignupVerificationEmail;
};

const defaultDependencies: ResendVerificationDependencies = {
  assertAllowedOrigin,
  parseJsonBody,
  resendSignupVerificationEmail,
};

export async function handleResendVerificationPost(
  request: Request,
  dependencies: ResendVerificationDependencies = defaultDependencies,
) {
  try {
    dependencies.assertAllowedOrigin(request);
    const payload = await dependencies.parseJsonBody(request);
    const result = await dependencies.resendSignupVerificationEmail({
      email: payload.email ?? "",
      emailRedirectTo: buildEmailVerificationRedirectTo(request),
    });

    return NextResponse.json(
      { email: result.email },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logApiError("api/auth/resend-verification", error, { request });
    return toApiErrorResponse(error, "Failed to resend verification email.", { request });
  }
}

export async function POST(request: Request) {
  return handleResendVerificationPost(request);
}
