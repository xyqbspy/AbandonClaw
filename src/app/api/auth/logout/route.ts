import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toApiErrorResponse } from "@/lib/server/api-error";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to logout.");
  }
}

