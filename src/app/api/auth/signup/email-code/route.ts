import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { AuthError } from "@/lib/server/errors";
import { getEffectiveRegistrationMode } from "@/lib/server/registration";
import { issueSignupEmailCode } from "@/lib/server/signup-email-code";
import { enforceRegistrationIpRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { parseJsonBody } from "@/lib/server/validation";
import { logApiError } from "@/lib/server/logger";

type SignupEmailCodeRequestBody = {
  email?: string;
};

interface SignupEmailCodeRouteDependencies {
  assertAllowedOrigin: typeof assertAllowedOrigin;
  parseJsonBody: typeof parseJsonBody<SignupEmailCodeRequestBody>;
  getEffectiveRegistrationMode: typeof getEffectiveRegistrationMode;
  enforceRegistrationIpRateLimit: typeof enforceRegistrationIpRateLimit;
  issueSignupEmailCode: typeof issueSignupEmailCode;
}

const defaultDependencies: SignupEmailCodeRouteDependencies = {
  assertAllowedOrigin,
  parseJsonBody,
  getEffectiveRegistrationMode,
  enforceRegistrationIpRateLimit,
  issueSignupEmailCode,
};

export async function handleSignupEmailCodePost(
  request: Request,
  dependencies: SignupEmailCodeRouteDependencies = defaultDependencies,
) {
  try {
    dependencies.assertAllowedOrigin(request);
    const payload = await dependencies.parseJsonBody(request);
    const registrationMode = await dependencies.getEffectiveRegistrationMode();
    if (registrationMode.mode === "closed") {
      throw new AuthError("Registration is currently closed.");
    }

    await dependencies.enforceRegistrationIpRateLimit(request);
    const result = await dependencies.issueSignupEmailCode({
      email: payload.email ?? "",
    });

    return NextResponse.json(
      {
        email: result.email,
        expiresInSeconds: result.expiresInSeconds,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logApiError("api/auth/signup/email-code", error, { request });
    return toApiErrorResponse(error, "Failed to send signup email code.", { request });
  }
}

export async function POST(request: Request) {
  return handleSignupEmailCodePost(request);
}
