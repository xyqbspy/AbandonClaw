import { NextResponse } from "next/server";
import {
  getCurrentProfileForUser,
  getCurrentSession,
  getCurrentUser,
} from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";

interface MeRouteDependencies {
  getCurrentSession: typeof getCurrentSession;
  getCurrentUser: typeof getCurrentUser;
  getCurrentProfileForUser: typeof getCurrentProfileForUser;
}

const defaultDependencies: MeRouteDependencies = {
  getCurrentSession,
  getCurrentUser,
  getCurrentProfileForUser,
};

export async function handleMeGet(dependencies: MeRouteDependencies = defaultDependencies) {
  try {
    const [session, user] = await Promise.all([
      dependencies.getCurrentSession(),
      dependencies.getCurrentUser(),
    ]);
    if (!session || !user) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 });
    }

    const profile = await dependencies.getCurrentProfileForUser(user);
    return NextResponse.json({ user, profile }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load current user.");
  }
}

export async function GET() {
  return handleMeGet();
}
