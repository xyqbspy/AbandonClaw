import {
  AnonFeatureDisabledError,
  AnonIpRateLimitedError,
  AnonQuotaExceededGlobalError,
  AnonQuotaExceededSessionError,
  HighCostCapabilityDisabledError,
  RateLimitError,
} from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  HIGH_COST_CAPABILITIES,
  listDisabledHighCostCapabilities,
  type HighCostCapability,
} from "@/lib/server/high-cost-usage";
import { getTodayUtcDateKey } from "@/lib/server/anonymous/daily-salt";
import { getAnonymousFeatureConfig } from "@/lib/server/anonymous/feature-matrix";
import { incrDailyCounter, peekDailyCounter, decrDailyCounter } from "@/lib/server/anonymous/counter";
import { recordAnonymousFunnelEventSafe } from "@/lib/server/anonymous/funnel-events";

const DAILY_COUNTER_TTL_SECONDS = 60 * 60 * 25; // 25h,允许跨日少量缓冲

const DEFAULT_IP_RATE_LIMIT = 30;
const IP_RATE_WINDOW_MS = 60_000;

const getIpRateLimit = () => {
  const raw = process.env.ANON_IP_RATE_LIMIT_PER_MINUTE?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return DEFAULT_IP_RATE_LIMIT;
};

export interface CheckAnonymousQuotaParams {
  capability: HighCostCapability;
  anonId: string;
  ipHash: string;
  now?: Date;
}

export interface AnonymousQuotaDependencies {
  listDisabledHighCostCapabilities: typeof listDisabledHighCostCapabilities;
}

const defaultDependencies: AnonymousQuotaDependencies = {
  listDisabledHighCostCapabilities,
};

export interface AnonymousQuotaResult {
  capability: HighCostCapability;
  globalDailyLimit: number;
  globalDailyRemaining: number;
  sessionDailyLimit: number;
  sessionDailyRemaining: number;
  resetAt: Date;
}

const startOfNextUtcDay = (now: Date) => {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next;
};

const buildGlobalKey = (capability: HighCostCapability, dateKey: string) =>
  `anon:quota:global:${capability}:${dateKey}`;

const buildSessionKey = (capability: HighCostCapability, anonId: string, dateKey: string) =>
  `anon:quota:session:${anonId}:${capability}:${dateKey}`;

const buildIpRateScope = () => "anon-ip-rate";

const assertNotEmergencyDisabled = async (
  capability: HighCostCapability,
  dependencies: AnonymousQuotaDependencies,
) => {
  const disabled = await dependencies.listDisabledHighCostCapabilities();
  if (disabled.includes(capability)) {
    throw new HighCostCapabilityDisabledError(
      "This capability is temporarily disabled.",
      { capability },
    );
  }
};

const enforceIpSlidingWindow = async (
  ipHash: string,
  anonId: string,
  capability: HighCostCapability,
) => {
  try {
    await enforceRateLimit({
      key: `ip:${ipHash}`,
      limit: getIpRateLimit(),
      windowMs: IP_RATE_WINDOW_MS,
      scope: buildIpRateScope(),
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      recordAnonymousFunnelEventSafe({
        eventName: "anon_quota_blocked",
        anonId,
        ipHash,
        payload: { capability, blocked_layer: "ip_rate" },
      });
      throw new AnonIpRateLimitedError();
    }
    throw error;
  }
};

const computeRemaining = (limit: number, count: number) => {
  if (limit < 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, limit - count);
};

/**
 * 匿名访客高成本接口入口判定。按 spec 四层防御顺序:
 * 1. 紧急关闭 (优先于配额,失败不消耗任何计数)
 * 2. featureMatrix.anonAllowed 直接禁用
 * 3. IP 滑窗 QPS
 * 4. 全站匿名池(INCR + 检查)
 * 5. 单会话日配额(INCR + 检查)
 *
 * 注:IP 当日 session 数上限已在 `upsertAnonymousSession` 阶段判定,这里不重复。
 */
export async function checkAnonymousQuota(
  params: CheckAnonymousQuotaParams,
  dependencies: AnonymousQuotaDependencies = defaultDependencies,
): Promise<AnonymousQuotaResult> {
  const { capability, anonId, ipHash } = params;
  const now = params.now ?? new Date();

  await assertNotEmergencyDisabled(capability, dependencies);

  const config = getAnonymousFeatureConfig(capability);
  if (!config.anonAllowed) {
    throw new AnonFeatureDisabledError(capability);
  }

  await enforceIpSlidingWindow(ipHash, anonId, capability);

  const dateKey = getTodayUtcDateKey(now);
  const resetAt = startOfNextUtcDay(now);

  let globalCount = 0;
  let globalKeyForRollback: string | null = null;
  if (config.globalDailyLimit >= 0) {
    const globalKey = buildGlobalKey(capability, dateKey);
    const globalIncr = await incrDailyCounter(globalKey, DAILY_COUNTER_TTL_SECONDS, now.getTime());
    globalCount = globalIncr.count;
    if (globalCount > config.globalDailyLimit) {
      // 已经命中阈值,DECR 把刚才那次 INCR 回滚,避免持续失败请求让计数无限漂移。
      await decrDailyCounter(globalKey, now.getTime());
      globalCount = config.globalDailyLimit;
      recordAnonymousFunnelEventSafe({
        eventName: "anon_quota_blocked",
        anonId,
        ipHash,
        payload: {
          capability,
          blocked_layer: "global",
          limit: config.globalDailyLimit,
          count: globalCount,
        },
      });
      throw new AnonQuotaExceededGlobalError(capability, {
        globalDailyLimit: config.globalDailyLimit,
        resetAt: resetAt.toISOString(),
      });
    }
    globalKeyForRollback = globalKey;
  }

  let sessionCount = 0;
  if (config.sessionDailyLimit >= 0) {
    const sessionKey = buildSessionKey(capability, anonId, dateKey);
    const sessionIncr = await incrDailyCounter(sessionKey, DAILY_COUNTER_TTL_SECONDS, now.getTime());
    sessionCount = sessionIncr.count;
    if (sessionCount > config.sessionDailyLimit) {
      // 同 global:回滚 session 计数;同时也回滚已经 INCR 的 global,
      // 避免单 session 已满后还在持续消耗全站匿名池。
      await decrDailyCounter(sessionKey, now.getTime());
      if (globalKeyForRollback) {
        await decrDailyCounter(globalKeyForRollback, now.getTime());
      }
      sessionCount = config.sessionDailyLimit;
      recordAnonymousFunnelEventSafe({
        eventName: "anon_quota_blocked",
        anonId,
        ipHash,
        payload: {
          capability,
          blocked_layer: "session",
          limit: config.sessionDailyLimit,
          count: sessionCount,
        },
      });
      throw new AnonQuotaExceededSessionError(capability, {
        sessionDailyLimit: config.sessionDailyLimit,
        resetAt: resetAt.toISOString(),
      });
    }
  }

  return {
    capability,
    globalDailyLimit: config.globalDailyLimit,
    globalDailyRemaining: computeRemaining(config.globalDailyLimit, globalCount),
    sessionDailyLimit: config.sessionDailyLimit,
    sessionDailyRemaining: computeRemaining(config.sessionDailyLimit, sessionCount),
    resetAt,
  };
}

/** 仅查询当前配额状态(不增计数),用于失败响应携带 reset 信息。 */
export async function peekAnonymousQuota(
  params: CheckAnonymousQuotaParams,
): Promise<AnonymousQuotaResult> {
  const { capability, anonId } = params;
  const now = params.now ?? new Date();
  const config = getAnonymousFeatureConfig(capability);
  const dateKey = getTodayUtcDateKey(now);
  const resetAt = startOfNextUtcDay(now);

  const globalCount = config.globalDailyLimit >= 0
    ? (await peekDailyCounter(buildGlobalKey(capability, dateKey), now.getTime())).count
    : 0;
  const sessionCount = config.sessionDailyLimit >= 0
    ? (await peekDailyCounter(buildSessionKey(capability, anonId, dateKey), now.getTime())).count
    : 0;

  return {
    capability,
    globalDailyLimit: config.globalDailyLimit,
    globalDailyRemaining: computeRemaining(config.globalDailyLimit, globalCount),
    sessionDailyLimit: config.sessionDailyLimit,
    sessionDailyRemaining: computeRemaining(config.sessionDailyLimit, sessionCount),
    resetAt,
  };
}

/** 校验 HighCostCapability 合法性(便于其它入口 narrow 类型)。 */
export const isHighCostCapability = (value: unknown): value is HighCostCapability =>
  typeof value === "string" &&
  (HIGH_COST_CAPABILITIES as readonly string[]).includes(value);
