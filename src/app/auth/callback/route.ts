import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getEmailVerificationCallbackErrorTarget,
  getEmailVerificationCallbackSuccessTarget,
} from "@/lib/server/email-verification-url";

type CallbackDependencies = {
  createSupabaseServerClient: typeof createSupabaseServerClient;
};

const defaultDependencies: CallbackDependencies = {
  createSupabaseServerClient,
};

export async function handleAuthCallback(
  request: Request,
  dependencies: CallbackDependencies = defaultDependencies,
) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL(getEmailVerificationCallbackErrorTarget(), request.url));
  }

  const supabase = await dependencies.createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(getEmailVerificationCallbackErrorTarget(), request.url));
  }

  return NextResponse.redirect(
    new URL(getEmailVerificationCallbackSuccessTarget(request), request.url),
  );
}

export async function GET(request: Request) {
  return handleAuthCallback(request);
}
