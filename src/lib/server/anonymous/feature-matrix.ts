import type { HighCostCapability } from "@/lib/server/high-cost-usage";

export interface AnonymousFeatureConfig {
  /** 是否允许匿名访客调用该 capability。false 表示触发即 ANON_FEATURE_DISABLED。 */
  anonAllowed: boolean;
  /** 全站匿名池每日上限。-1 表示不限。anonAllowed=false 时被忽略。 */
  globalDailyLimit: number;
  /** 单匿名会话每日上限。-1 表示不限。anonAllowed=false 时被忽略。 */
  sessionDailyLimit: number;
  /** 全站匿名池告警阈值(占比 0~1),当日累计达到此占比触发飞书通知。 */
  alertThresholdRatio: number;
}

const matrix: Record<HighCostCapability, AnonymousFeatureConfig> = {
  practice_generate: {
    anonAllowed: false,
    globalDailyLimit: 0,
    sessionDailyLimit: 0,
    alertThresholdRatio: 0,
  },
  scene_generate: {
    anonAllowed: false,
    globalDailyLimit: 0,
    sessionDailyLimit: 0,
    alertThresholdRatio: 0,
  },
  similar_generate: {
    anonAllowed: false,
    globalDailyLimit: 0,
    sessionDailyLimit: 0,
    alertThresholdRatio: 0,
  },
  expression_map_generate: {
    anonAllowed: false,
    globalDailyLimit: 0,
    sessionDailyLimit: 0,
    alertThresholdRatio: 0,
  },
  // AI 表达解释默认匿名禁用；若后续恢复灰度，可显式打开 env 并沿用 200/3 配额。
  explain_selection: {
    anonAllowed: false,
    globalDailyLimit: 200,
    sessionDailyLimit: 3,
    alertThresholdRatio: 0.8,
  },
  // TTS 实时生成:匿名禁用,只允许走预生成签名缓存
  tts_generate: {
    anonAllowed: false,
    globalDailyLimit: 0,
    sessionDailyLimit: 0,
    alertThresholdRatio: 0,
  },
  tts_regenerate: {
    anonAllowed: false,
    globalDailyLimit: 0,
    sessionDailyLimit: 0,
    alertThresholdRatio: 0,
  },
};

/** TTS 预生成播放(签名 URL 查询)是独立的非 HighCostCapability,但同样要走单会话日上限。 */
export const TTS_PLAYBACK_ANONYMOUS_SESSION_DAILY_LIMIT = 30;

const parsePositiveIntOrUnlimited = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
};

const ENV_GLOBAL_OVERRIDE_PREFIX = "ANON_QUOTA_GLOBAL_";
const ENV_SESSION_OVERRIDE_PREFIX = "ANON_QUOTA_SESSION_";
const ENV_ALLOW_OVERRIDE_PREFIX = "ANON_ALLOW_";

const parseBooleanOverride = (raw: string | undefined): boolean | null => {
  if (raw === undefined) return null;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  return null;
};

export const getAnonymousFeatureConfig = (
  capability: HighCostCapability,
): AnonymousFeatureConfig => {
  const base = matrix[capability];
  const upperCap = capability.toUpperCase();
  const allowOverride = parseBooleanOverride(
    process.env[`${ENV_ALLOW_OVERRIDE_PREFIX}${upperCap}`],
  );
  const globalOverride = parsePositiveIntOrUnlimited(
    process.env[`${ENV_GLOBAL_OVERRIDE_PREFIX}${upperCap}`],
  );
  const sessionOverride = parsePositiveIntOrUnlimited(
    process.env[`${ENV_SESSION_OVERRIDE_PREFIX}${upperCap}`],
  );
  return {
    ...base,
    anonAllowed: allowOverride ?? base.anonAllowed,
    globalDailyLimit: globalOverride ?? base.globalDailyLimit,
    sessionDailyLimit: sessionOverride ?? base.sessionDailyLimit,
  };
};
