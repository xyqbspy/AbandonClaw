import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { AuthError } from "@/lib/server/errors";

interface LogoutRouteDependencies {
  createSupabaseServerClient: typeof createSupabaseServerClient;
}

const defaultDependencies: LogoutRouteDependencies = {
  createSupabaseServerClient,
};

export async function handleLogoutPost(
  request: Request,
  dependencies: LogoutRouteDependencies = defaultDependencies,
) {
  try {
    const supabase = await dependencies.createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AuthError(error.message);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to logout.", { request });
  }
}

export async function POST(request: Request) {
  return handleLogoutPost(request);
}

