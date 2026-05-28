import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AnonIpRateLimitedError } from "@/lib/server/errors";

const DEFAULT_IP_SESSION_DAILY_LIMIT = 5;

const getIpSessionDailyLimit = () => {
  const raw = process.env.ANON_IP_SESSION_DAILY_LIMIT?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_IP_SESSION_DAILY_LIMIT;
};

export interface AnonymousSessionStoreDependencies {
  createSupabaseAdminClient: typeof createSupabaseAdminClient;
}

const defaultDependencies: AnonymousSessionStoreDependencies = {
  createSupabaseAdminClient,
};

export interface UpsertAnonymousSessionParams {
  anonId: string;
  ipHash: string;
  now?: Date;
}

export interface UpsertAnonymousSessionResult {
  isNewAnonId: boolean;
  ipSessionCountToday: number;
}

const startOfDayIso = (now: Date) => {
  const copy = new Date(now);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString();
};

export async function upsertAnonymousSession(
  params: UpsertAnonymousSessionParams,
  dependencies: AnonymousSessionStoreDependencies = defaultDependencies,
): Promise<UpsertAnonymousSessionResult> {
  const now = params.now ?? new Date();
  const admin = dependencies.createSupabaseAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from("anonymous_sessions")
    .select("anon_id,ip_hash,created_at")
    .eq("anon_id", params.anonId)
    .maybeSingle<{ anon_id: string; ip_hash: string; created_at: string }>();

  if (lookupError) {
    throw new Error(`Failed to read anonymous_session: ${lookupError.message}`);
  }

  if (existing) {
    const { error: updateError } = await admin
      .from("anonymous_sessions")
      .update({ last_active_at: now.toISOString() } as never)
      .eq("anon_id", params.anonId);

    if (updateError) {
      throw new Error(`Failed to refresh anonymous_session: ${updateError.message}`);
    }

    return { isNewAnonId: false, ipSessionCountToday: 0 };
  }

  const todayStart = startOfDayIso(now);
  const { count: existingCount, error: countError } = await admin
    .from("anonymous_sessions")
    .select("anon_id", { count: "exact", head: true })
    .eq("ip_hash", params.ipHash)
    .gte("created_at", todayStart);

  if (countError) {
    throw new Error(`Failed to count anonymous_sessions for ip_hash: ${countError.message}`);
  }

  const ipSessionCountToday = existingCount ?? 0;
  const limit = getIpSessionDailyLimit();
  if (ipSessionCountToday >= limit) {
    throw new AnonIpRateLimitedError();
  }

  const { error: insertError } = await admin.from("anonymous_sessions").insert({
    anon_id: params.anonId,
    ip_hash: params.ipHash,
    created_at: now.toISOString(),
    last_active_at: now.toISOString(),
  } as never);

  if (insertError) {
    throw new Error(`Failed to insert anonymous_session: ${insertError.message}`);
  }

  return { isNewAnonId: true, ipSessionCountToday: ipSessionCountToday + 1 };
}

export async function cleanupExpiredAnonymousSessions(
  daysToKeep = 7,
  dependencies: AnonymousSessionStoreDependencies = defaultDependencies,
): Promise<number> {
  const admin = dependencies.createSupabaseAdminClient();
  const { data, error } = await admin.rpc("cleanup_anonymous_sessions", {
    p_days: daysToKeep,
  } as never);

  if (error) {
    throw new Error(`Failed to cleanup anonymous_sessions: ${error.message}`);
  }

  if (typeof data === "number") return data;
  if (data && typeof data === "object" && "cleanup_anonymous_sessions" in data) {
    return Number((data as { cleanup_anonymous_sessions?: number }).cleanup_anonymous_sessions ?? 0);
  }
  return 0;
}
