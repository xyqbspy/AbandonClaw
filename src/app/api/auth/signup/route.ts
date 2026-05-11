import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { getEffectiveRegistrationMode, registerWithEmailPassword } from "@/lib/server/registration";
import { enforceRegistrationIpRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { parseJsonBody } from "@/lib/server/validation";
import { buildEmailVerificationRedirectTo } from "@/lib/server/email-verification-url";
import {
  consumeSignupEmailCode,
  verifySignupEmailCode,
} from "@/lib/server/signup-email-code";

type SignupRequestBody = {
  email?: string;
  password?: string;
  username?: string;
  inviteCode?: string;
  emailCode?: string;
};

interface SignupRouteDependencies {
  assertAllowedOrigin: typeof assertAllowedOrigin;
  parseJsonBody: typeof parseJsonBody<SignupRequestBody>;
  getEffectiveRegistrationMode: typeof getEffectiveRegistrationMode;
  enforceRegistrationIpRateLimit: typeof enforceRegistrationIpRateLimit;
  verifySignupEmailCode: typeof verifySignupEmailCode;
  consumeSignupEmailCode: typeof consumeSignupEmailCode;
  registerWithEmailPassword: typeof registerWithEmailPassword;
}

const signupRouteDependencies: SignupRouteDependencies = {
  assertAllowedOrigin,
  parseJsonBody,
  getEffectiveRegistrationMode,
  enforceRegistrationIpRateLimit,
  verifySignupEmailCode,
  consumeSignupEmailCode,
  registerWithEmailPassword,
};

export async function GET() {
  const registrationMode = await getEffectiveRegistrationMode();
  return NextResponse.json(
    {
      mode: registrationMode.mode,
      source: registrationMode.source,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function handleSignupPost(
  request: Request,
  dependencies: SignupRouteDependencies = signupRouteDependencies,
) {
  try {
    dependencies.assertAllowedOrigin(request);
    const payload = await dependencies.parseJsonBody(request);
    const registrationMode = await dependencies.getEffectiveRegistrationMode();
    const mode = registrationMode.mode;

    if (mode !== "closed") {
      await dependencies.enforceRegistrationIpRateLimit(request);
    }

    const emailCode =
      mode === "closed"
        ? null
        : await dependencies.verifySignupEmailCode({
            email: payload.email ?? "",
            code: payload.emailCode ?? "",
          });

    const result = await dependencies.registerWithEmailPassword({
      email: payload.email ?? "",
      password: payload.password ?? "",
      username: payload.username,
      inviteCode: payload.inviteCode,
      registrationMode: mode,
      emailRedirectTo: buildEmailVerificationRedirectTo(request),
    });

    if (emailCode) {
      await dependencies.consumeSignupEmailCode(emailCode.id);
    }

    return NextResponse.json(result, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logApiError("api/auth/signup", error, { request });
    return toApiErrorResponse(error, "Failed to sign up.", { request });
  }
}

export async function POST(request: Request) {
  return handleSignupPost(request);
}
