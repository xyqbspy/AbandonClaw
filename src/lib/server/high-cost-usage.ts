import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DailyQuotaExceededError } from "@/lib/server/errors";

export const HIGH_COST_CAPABILITIES = [
  "practice_generate",
  "scene_generate",
  "similar_generate",
  "expression_map_generate",
  "explain_selection",
  "tts_generate",
  "tts_regenerate",
] as const;

export type HighCostCapability = (typeof HIGH_COST_CAPABILITIES)[number];
export type HighCostUsageStatus = "success" | "failed";

export type HighCostUsageReservation = {
  userId: string;
  usageDate: string;
  capability: HighCostCapability;
  limitCount: number;
};

export type HighCostUsageSummaryItem = {
  capability: HighCostCapability;
  reservedCount: number;
  successCount: number;
  failedCount: number;
  limitCount: number;
};

const DEFAULT_DAILY_QUOTAS: Record<HighCostCapability, number> = {
  practice_generate: 20,
  scene_generate: 8,
  similar_generate: 20,
  expression_map_generate: 20,
  explain_selection: 30,
  tts_generate: 80,
  tts_regenerate: 12,
};

const ENV_KEYS: Record<HighCostCapability, string> = {
  practice_generate: "DAILY_QUOTA_PRACTICE_GENERATE",
  scene_generate: "DAILY_QUOTA_SCENE_GENERATE",
  similar_generate: "DAILY_QUOTA_SIMILAR_GENERATE",
  expression_map_generate: "DAILY_QUOTA_EXPRESSION_MAP_GENERATE",
  explain_selection: "DAILY_QUOTA_EXPLAIN_SELECTION",
  tts_generate: "DAILY_QUOTA_TTS_GENERATE",
  tts_regenerate: "DAILY_QUOTA_TTS_REGENERATE",
};

const todayDate = (now = new Date()) => now.toISOString().slice(0, 10);

export const getDailyQuotaLimit = (capability: HighCostCapability) => {
  const raw = process.env[ENV_KEYS[capability]]?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_DAILY_QUOTAS[capability];
};

export async function reserveHighCostUsage(params: {
  userId: string;
  capability: HighCostCapability;
  now?: Date;
}): Promise<HighCostUsageReservation> {
  const usageDate = todayDate(params.now);
  const limitCount = getDailyQuotaLimit(params.capability);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("reserve_daily_high_cost_usage", {
    p_user_id: params.userId,
    p_usage_date: usageDate,
    p_capability: params.capability,
    p_limit_count: limitCount,
  } as never);

  if (error) {
    throw new Error(`Failed to reserve high cost usage: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const allowed = Boolean((row as { allowed?: boolean } | null)?.allowed);
  const reservedCount = Number((row as { reserved_count?: number } | null)?.reserved_count ?? 0);

  if (!allowed) {
    throw new DailyQuotaExceededError("Daily quota exceeded.", {
      capability: params.capability,
      limitCount,
      reservedCount,
    });
  }

  return {
    userId: params.userId,
    usageDate,
    capability: params.capability,
    limitCount,
  };
}

export async function markHighCostUsage(
  reservation: HighCostUsageReservation | null | undefined,
  status: HighCostUsageStatus,
) {
  if (!reservation) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("mark_daily_high_cost_usage", {
    p_user_id: reservation.userId,
    p_usage_date: reservation.usageDate,
    p_capability: reservation.capability,
    p_status: status,
  } as never);

  if (error) {
    throw new Error(`Failed to mark high cost usage: ${error.message}`);
  }
}

export async function getTodayHighCostUsageSummary(now = new Date()) {
  const usageDate = todayDate(now);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_daily_high_cost_usage")
    .select("capability,reserved_count,success_count,failed_count,limit_count")
    .eq("usage_date", usageDate);

  if (error) {
    throw new Error(`Failed to read high cost usage summary: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    capability: string;
    reserved_count: number;
    success_count: number;
    failed_count: number;
    limit_count: number;
  }>;
  const byCapability = new Map(rows.map((row) => [row.capability, row]));

  return {
    date: usageDate,
    items: HIGH_COST_CAPABILITIES.map((capability): HighCostUsageSummaryItem => {
      const row = byCapability.get(capability);
      return {
        capability,
        reservedCount: Number(row?.reserved_count ?? 0),
        successCount: Number(row?.success_count ?? 0),
        failedCount: Number(row?.failed_count ?? 0),
        limitCount: Number(row?.limit_count ?? getDailyQuotaLimit(capability)),
      };
    }),
  };
}
