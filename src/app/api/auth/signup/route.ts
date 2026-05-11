import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { getRegistrationMode, registerWithEmailPassword } from "@/lib/server/registration";
import { enforceRegistrationIpRateLimit } from "@/lib/server/rate-limit";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { parseJsonBody } from "@/lib/server/validation";

type SignupRequestBody = {
  email?: string;
  password?: string;
  username?: string;
  inviteCode?: string;
};

interface SignupRouteDependencies {
  assertAllowedOrigin: typeof assertAllowedOrigin;
  parseJsonBody: typeof parseJsonBody<SignupRequestBody>;
  getRegistrationMode: typeof getRegistrationMode;
  enforceRegistrationIpRateLimit: typeof enforceRegistrationIpRateLimit;
  registerWithEmailPassword: typeof registerWithEmailPassword;
}

const signupRouteDependencies: SignupRouteDependencies = {
  assertAllowedOrigin,
  parseJsonBody,
  getRegistrationMode,
  enforceRegistrationIpRateLimit,
  registerWithEmailPassword,
};

export async function GET() {
  return NextResponse.json(
    {
      mode: getRegistrationMode(),
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
    const mode = dependencies.getRegistrationMode();

    if (mode !== "closed") {
      await dependencies.enforceRegistrationIpRateLimit(request);
    }

    const result = await dependencies.registerWithEmailPassword({
      email: payload.email ?? "",
      password: payload.password ?? "",
      username: payload.username,
      inviteCode: payload.inviteCode,
    });

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
