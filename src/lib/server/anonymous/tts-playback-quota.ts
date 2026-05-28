import {
  AnonIpRateLimitedError,
  AnonQuotaExceededSessionError,
  RateLimitError,
} from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getTodayUtcDateKey } from "@/lib/server/anonymous/daily-salt";
import {
  decrDailyCounter,
  incrDailyCounter,
  peekDailyCounter,
} from "@/lib/server/anonymous/counter";
import { recordAnonymousFunnelEventSafe } from "@/lib/server/anonymous/funnel-events";
import { TTS_PLAYBACK_ANONYMOUS_SESSION_DAILY_LIMIT } from "@/lib/server/anonymous/feature-matrix";

/**
 * `tts_play` 是"预生成 TTS 播放"——只读 Storage 已存在的 mp3,不调上游合成。
 *
 * 它**不**属于 HighCostCapability(无边际付费成本),所以走独立配额函数,
 * 不复用 checkAnonymousQuota(后者签名限定 HighCostCapability,且会跑 emergency
 * disable 分支)。
 *
 * 防御维度比 explain_selection 少一层:
 * - IP 滑窗 QPS(复用同一 scope,同 IP 跟 explain_selection 共享 60s 窗口)
 * - 单 anon 会话每日上限(默认 30,环境变量 ANON_QUOTA_SESSION_TTS_PLAY 可覆盖)
 *
 * 不做全站每日池——预生成音频是 storage HEAD 请求 + signed URL 签发,几乎零成本,
 * 防全站 DDoS 由 IP 滑窗 + session 数(在 upsertAnonymousSession)兜底已经够。
 */

const DAILY_COUNTER_TTL_SECONDS = 60 * 60 * 25;
const IP_RATE_WINDOW_MS = 60_000;
const DEFAULT_IP_RATE_LIMIT = 30;
const TTS_PLAY_CAPABILITY = "tts_play" as const;

const getIpRateLimit = () => {
  const raw = process.env.ANON_IP_RATE_LIMIT_PER_MINUTE?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return DEFAULT_IP_RATE_LIMIT;
};

export const getAnonymousTtsPlaybackSessionDailyLimit = () => {
  const raw = process.env.ANON_QUOTA_SESSION_TTS_PLAY?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return TTS_PLAYBACK_ANONYMOUS_SESSION_DAILY_LIMIT;
};

const buildSessionKey = (anonId: string, dateKey: string) =>
  `anon:quota:session:${anonId}:${TTS_PLAY_CAPABILITY}:${dateKey}`;

const startOfNextUtcDay = (now: Date) => {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next;
};

export interface AnonymousTtsPlaybackQuotaResult {
  capability: typeof TTS_PLAY_CAPABILITY;
  sessionDailyLimit: number;
  sessionDailyRemaining: number;
  /** TTS 预生成播放不设全站池;字段以 -1 表示 unlimited,前端配额头格式化为 "unlimited"。 */
  globalDailyLimit: -1;
  globalDailyRemaining: number;
  resetAt: Date;
}

const enforceIpSlidingWindow = async (ipHash: string, anonId: string) => {
  try {
    await enforceRateLimit({
      key: `ip:${ipHash}`,
      limit: getIpRateLimit(),
      windowMs: IP_RATE_WINDOW_MS,
      scope: "anon-ip-rate",
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      recordAnonymousFunnelEventSafe({
        eventName: "anon_quota_blocked",
        anonId,
        ipHash,
        payload: { capability: TTS_PLAY_CAPABILITY, blocked_layer: "ip_rate" },
      });
      throw new AnonIpRateLimitedError();
    }
    throw error;
  }
};

export interface CheckAnonymousTtsPlaybackQuotaParams {
  anonId: string;
  ipHash: string;
  now?: Date;
}

export async function checkAnonymousTtsPlaybackQuota(
  params: CheckAnonymousTtsPlaybackQuotaParams,
): Promise<AnonymousTtsPlaybackQuotaResult> {
  const now = params.now ?? new Date();

  await enforceIpSlidingWindow(params.ipHash, params.anonId);

  const sessionLimit = getAnonymousTtsPlaybackSessionDailyLimit();
  const dateKey = getTodayUtcDateKey(now);
  const resetAt = startOfNextUtcDay(now);

  const sessionKey = buildSessionKey(params.anonId, dateKey);
  const incr = await incrDailyCounter(sessionKey, DAILY_COUNTER_TTL_SECONDS, now.getTime());
  let sessionCount = incr.count;
  if (sessionCount > sessionLimit) {
    await decrDailyCounter(sessionKey, now.getTime());
    sessionCount = sessionLimit;
    recordAnonymousFunnelEventSafe({
      eventName: "anon_quota_blocked",
      anonId: params.anonId,
      ipHash: params.ipHash,
      payload: {
        capability: TTS_PLAY_CAPABILITY,
        blocked_layer: "session",
        limit: sessionLimit,
        count: sessionCount,
      },
    });
    throw new AnonQuotaExceededSessionError(TTS_PLAY_CAPABILITY, {
      sessionDailyLimit: sessionLimit,
      resetAt: resetAt.toISOString(),
    });
  }

  return {
    capability: TTS_PLAY_CAPABILITY,
    sessionDailyLimit: sessionLimit,
    sessionDailyRemaining: Math.max(0, sessionLimit - sessionCount),
    globalDailyLimit: -1,
    globalDailyRemaining: Number.POSITIVE_INFINITY,
    resetAt,
  };
}

export async function peekAnonymousTtsPlaybackQuota(
  params: CheckAnonymousTtsPlaybackQuotaParams,
): Promise<AnonymousTtsPlaybackQuotaResult> {
  const now = params.now ?? new Date();
  const sessionLimit = getAnonymousTtsPlaybackSessionDailyLimit();
  const dateKey = getTodayUtcDateKey(now);
  const resetAt = startOfNextUtcDay(now);
  const sessionKey = buildSessionKey(params.anonId, dateKey);
  const peek = await peekDailyCounter(sessionKey, now.getTime());
  return {
    capability: TTS_PLAY_CAPABILITY,
    sessionDailyLimit: sessionLimit,
    sessionDailyRemaining: Math.max(0, sessionLimit - peek.count),
    globalDailyLimit: -1,
    globalDailyRemaining: Number.POSITIVE_INFINITY,
    resetAt,
  };
}
