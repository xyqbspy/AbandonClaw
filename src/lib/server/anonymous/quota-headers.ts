import { NextResponse } from "next/server";

/**
 * Structural 类型,兼容 AnonymousQuotaResult(HighCostCapability)与
 * AnonymousTtsPlaybackQuotaResult(`tts_play`),让两类匿名配额都能复用响应头格式化。
 */
export interface AnonymousQuotaHeadersInput {
  capability: string;
  globalDailyLimit: number;
  globalDailyRemaining: number;
  sessionDailyLimit: number;
  sessionDailyRemaining: number;
  resetAt: Date;
}

const formatRemaining = (value: number) =>
  Number.isFinite(value) ? String(value) : "unlimited";
const formatLimit = (value: number) =>
  value < 0 ? "unlimited" : String(value);

export const buildAnonymousQuotaHeaders = (
  result: AnonymousQuotaHeadersInput,
): Record<string, string> => ({
  "X-Quota-Type": result.capability,
  "X-Quota-Daily-Limit": formatLimit(result.globalDailyLimit),
  "X-Quota-Daily-Remaining": formatRemaining(result.globalDailyRemaining),
  "X-Quota-Session-Limit": formatLimit(result.sessionDailyLimit),
  "X-Quota-Session-Remaining": formatRemaining(result.sessionDailyRemaining),
  "X-Quota-Reset-At": result.resetAt.toISOString(),
});

export const attachAnonymousQuotaHeaders = <T extends NextResponse>(
  response: T,
  result: AnonymousQuotaHeadersInput,
): T => {
  for (const [key, value] of Object.entries(buildAnonymousQuotaHeaders(result))) {
    response.headers.set(key, value);
  }
  return response;
};
