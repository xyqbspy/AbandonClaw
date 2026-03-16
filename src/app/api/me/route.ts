import { NextResponse } from "next/server";
import { ensureProfile, getCurrentSession, getCurrentUser } from "@/lib/server/auth";

export async function GET() {
  try {
    const [session, user] = await Promise.all([getCurrentSession(), getCurrentUser()]);
    if (!session || !user) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 });
    }

    const profile = await ensureProfile(user);
    return NextResponse.json({ user, profile }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load current user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
