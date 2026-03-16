import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getAdminOverviewStats } from "@/lib/server/admin/service";

export async function GET() {
  try {
    const adminUser = await requireAdmin();
    const stats = await getAdminOverviewStats();
    return NextResponse.json(
      {
        adminEmail: adminUser.email ?? null,
        ...stats,
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load admin status.");
  }
}

