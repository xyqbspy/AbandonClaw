import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DailyQuotaExceededError, HighCostCapabilityDisabledError } from "@/lib/server/errors";

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

export type HighCostCapabilityControlItem = {
  capability: HighCostCapability;
  disabled: boolean;
};

type RuntimeSettingRow = {
  value: string | null;
};

interface HighCostUsageDependencies {
  createSupabaseAdminClient: typeof createSupabaseAdminClient;
}

const highCostUsageDependencies: HighCostUsageDependencies = {
  createSupabaseAdminClient,
};

export const HIGH_COST_DISABLED_CAPABILITIES_SETTING_KEY = "high_cost_disabled_capabilities";

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

export const parseHighCostCapability = (value: unknown): HighCostCapability | null =>
  typeof value === "string" && (HIGH_COST_CAPABILITIES as readonly string[]).includes(value)
    ? (value as HighCostCapability)
    : null;

export const parseDisabledHighCostCapabilities = (value: unknown): HighCostCapability[] => {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map(parseHighCostCapability)
          .filter((item): item is HighCostCapability => item !== null),
      ),
    );
  } catch {
    return [];
  }
};

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
  dependencies?: HighCostUsageDependencies;
}): Promise<HighCostUsageReservation> {
  const dependencies = params.dependencies ?? highCostUsageDependencies;
  const disabledCapabilities = await listDisabledHighCostCapabilities(dependencies);
  if (disabledCapabilities.includes(params.capability)) {
    throw new HighCostCapabilityDisabledError("This capability is temporarily disabled.", {
      capability: params.capability,
    });
  }

  const usageDate = todayDate(params.now);
  const limitCount = getDailyQuotaLimit(params.capability);
  const admin = dependencies.createSupabaseAdminClient();

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

export async function listDisabledHighCostCapabilities(
  dependencies: HighCostUsageDependencies = highCostUsageDependencies,
) {
  const admin = dependencies.createSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_runtime_settings")
    .select("value")
    .eq("key", HIGH_COST_DISABLED_CAPABILITIES_SETTING_KEY)
    .maybeSingle<RuntimeSettingRow>();

  if (error || !data) return [];
  return parseDisabledHighCostCapabilities(data.value);
}

export async function getHighCostCapabilityControls(
  dependencies: HighCostUsageDependencies = highCostUsageDependencies,
): Promise<HighCostCapabilityControlItem[]> {
  const disabled = await listDisabledHighCostCapabilities(dependencies);
  return HIGH_COST_CAPABILITIES.map((capability) => ({
    capability,
    disabled: disabled.includes(capability),
  }));
}

export async function updateHighCostCapabilityDisabled(params: {
  capability: HighCostCapability;
  disabled: boolean;
  updatedBy: string;
}, dependencies: HighCostUsageDependencies = highCostUsageDependencies) {
  const capability = parseHighCostCapability(params.capability);
  if (!capability) {
    throw new Error("Invalid high cost capability.");
  }

  const current = await listDisabledHighCostCapabilities(dependencies);
  const next = params.disabled
    ? Array.from(new Set([...current, capability]))
    : current.filter((item) => item !== capability);

  const admin = dependencies.createSupabaseAdminClient();
  const { error } = await admin
    .from("app_runtime_settings")
    .upsert(
      {
        key: HIGH_COST_DISABLED_CAPABILITIES_SETTING_KEY,
        value: JSON.stringify(next),
        updated_by: params.updatedBy,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "key" },
    );

  if (error) {
    throw new Error(`Failed to update high cost emergency controls: ${error.message}`);
  }

  return getHighCostCapabilityControls(dependencies);
}
