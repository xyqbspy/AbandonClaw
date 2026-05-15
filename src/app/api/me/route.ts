import { NextResponse } from "next/server";
import {
  getCurrentProfileForUser,
  getCurrentUser,
} from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";

interface MeRouteDependencies {
  getCurrentUser: typeof getCurrentUser;
  getCurrentProfileForUser: typeof getCurrentProfileForUser;
}

const defaultDependencies: MeRouteDependencies = {
  getCurrentUser,
  getCurrentProfileForUser,
};

export async function handleMeGet(
  dependencies: MeRouteDependencies = defaultDependencies,
  request?: Request,
) {
  try {
    const user = await dependencies.getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 });
    }

    const profile = await dependencies.getCurrentProfileForUser(user);
    return NextResponse.json({ user, profile }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load current user.", { request });
  }
}

export async function GET(request: Request) {
  return handleMeGet(defaultDependencies, request);
}
