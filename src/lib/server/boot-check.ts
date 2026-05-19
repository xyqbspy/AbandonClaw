import { isCspEnforce } from "./csp";

const DAILY_QUOTA_KEYS = [
  "DAILY_QUOTA_PRACTICE_GENERATE",
  "DAILY_QUOTA_SCENE_GENERATE",
  "DAILY_QUOTA_SIMILAR_GENERATE",
  "DAILY_QUOTA_EXPRESSION_MAP_GENERATE",
  "DAILY_QUOTA_EXPLAIN_SELECTION",
  "DAILY_QUOTA_TTS_GENERATE",
  "DAILY_QUOTA_TTS_REGENERATE",
] as const;

export const DAILY_QUOTA_KEY_COUNT = DAILY_QUOTA_KEYS.length;

export const getBootCheckSnapshot = () => {
  const dailyQuotaOverrides = DAILY_QUOTA_KEYS.filter((key) =>
    Boolean(process.env[key]?.trim()),
  ).length;

  return {
    sentry: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()),
    upstash: Boolean(
      process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    ),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    emailFrom: Boolean(process.env.EMAIL_FROM?.trim()),
    emailVerificationSecret: Boolean(process.env.EMAIL_VERIFICATION_CODE_SECRET?.trim()),
    appOrigin: Boolean(
      process.env.APP_ORIGIN?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    ),
    registrationIpLimit:
      process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS?.trim() ||
      process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS?.trim()
        ? "custom"
        : "default",
    dailyQuotaOverrides,
    registrationMode: process.env.REGISTRATION_MODE?.trim() || "unset",
    cspMode: isCspEnforce() ? "enforce" : "report-only",
  };
};
