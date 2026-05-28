import { NextResponse } from "next/server";
import type { AnonymousQuotaResult } from "@/lib/server/anonymous/quota";

const formatRemaining = (value: number) =>
  Number.isFinite(value) ? String(value) : "unlimited";
const formatLimit = (value: number) =>
  value < 0 ? "unlimited" : String(value);

export const buildAnonymousQuotaHeaders = (
  result: AnonymousQuotaResult,
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
  result: AnonymousQuotaResult,
): T => {
  for (const [key, value] of Object.entries(buildAnonymousQuotaHeaders(result))) {
    response.headers.set(key, value);
  }
  return response;
};
