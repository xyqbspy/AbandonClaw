import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { getAdminOverviewStats } from "@/lib/server/admin/service";
import { getTodayHighCostUsageSummary } from "@/lib/server/high-cost-usage";
import { getRateLimitBackendStatus } from "@/lib/server/rate-limit";

interface AdminStatusDependencies {
  requireAdmin: typeof requireAdmin;
  getAdminOverviewStats: typeof getAdminOverviewStats;
  getTodayHighCostUsageSummary: typeof getTodayHighCostUsageSummary;
  getRateLimitBackendStatus: typeof getRateLimitBackendStatus;
}

const defaultDependencies: AdminStatusDependencies = {
  requireAdmin,
  getAdminOverviewStats,
  getTodayHighCostUsageSummary,
  getRateLimitBackendStatus,
};

export async function handleAdminStatusGet(
  dependencies: AdminStatusDependencies = defaultDependencies,
  request?: Request,
) {
  try {
    const adminUser = await dependencies.requireAdmin();
    const [stats, todayHighCostUsage] = await Promise.all([
      dependencies.getAdminOverviewStats(),
      dependencies.getTodayHighCostUsageSummary(),
    ]);
    return NextResponse.json(
      {
        adminEmail: adminUser.email ?? null,
        rateLimitBackend: dependencies.getRateLimitBackendStatus(),
        todayHighCostUsage,
        ...stats,
      },
      { status: 200 },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to load admin status.", { request });
  }
}

export async function GET(request: Request) {
  return handleAdminStatusGet(defaultDependencies, request);
}

