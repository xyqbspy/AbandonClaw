import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { logApiError } from "@/lib/server/logger";
import { getRegistrationMode, registerWithEmailPassword } from "@/lib/server/registration";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import { parseJsonBody } from "@/lib/server/validation";

type SignupRequestBody = {
  email?: string;
  password?: string;
  username?: string;
  inviteCode?: string;
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

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    const payload = await parseJsonBody<SignupRequestBody>(request);
    const result = await registerWithEmailPassword({
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
