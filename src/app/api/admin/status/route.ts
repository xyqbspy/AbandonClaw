import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getAdminOverviewStats } from "@/lib/server/admin/service";
import { getTodayHighCostUsageSummary } from "@/lib/server/high-cost-usage";
import { getRateLimitBackendStatus } from "@/lib/server/rate-limit";

export async function GET() {
  try {
    const adminUser = await requireAdmin();
    const [stats, todayHighCostUsage] = await Promise.all([
      getAdminOverviewStats(),
      getTodayHighCostUsageSummary(),
    ]);
    return NextResponse.json(
      {
        adminEmail: adminUser.email ?? null,
        rateLimitBackend: getRateLimitBackendStatus(),
        todayHighCostUsage,
        ...stats,
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load admin status.");
  }
}

