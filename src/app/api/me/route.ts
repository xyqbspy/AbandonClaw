import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentSession, getCurrentUser } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";

export async function GET() {
  try {
    const [session, user] = await Promise.all([getCurrentSession(), getCurrentUser()]);
    if (!session || !user) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 });
    }

    const profile = await getCurrentProfile();
    return NextResponse.json({ user, profile }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load current user.");
  }
}
