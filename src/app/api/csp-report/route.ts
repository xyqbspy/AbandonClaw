import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { enforceRateLimit, getClientIp } from "@/lib/server/rate-limit";

const CSP_REPORT_RATE_LIMIT = 30;
const CSP_REPORT_WINDOW_MS = 60_000;

type CspReportPayload = {
  "csp-report"?: Record<string, unknown>;
};

type ReportingApiPayload = Array<{
  type?: string;
  body?: Record<string, unknown>;
  url?: string;
  user_agent?: string;
}>;

const isCspReport = (value: unknown): value is CspReportPayload =>
  typeof value === "object" && value !== null && "csp-report" in value;

const isReportingApiArray = (value: unknown): value is ReportingApiPayload =>
  Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null);

const extractViolation = (raw: unknown): Record<string, unknown> | null => {
  if (isCspReport(raw)) {
    return (raw["csp-report"] as Record<string, unknown>) ?? {};
  }
  if (isReportingApiArray(raw)) {
    const cspEntry = raw.find((entry) => entry?.type === "csp-violation" || entry?.type === "csp");
    if (cspEntry?.body) {
      return cspEntry.body;
    }
    if (raw[0]?.body) {
      return raw[0].body;
    }
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `ip:${clientIp}`,
      limit: CSP_REPORT_RATE_LIMIT,
      windowMs: CSP_REPORT_WINDOW_MS,
      scope: "csp-report",
    });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const violation = extractViolation(raw);
    if (!violation) {
      return NextResponse.json({ error: "Invalid CSP report payload." }, { status: 400 });
    }

    Sentry.withScope((scope) => {
      scope.setTag("csp_violation", "true");
      scope.setExtras(violation);
      Sentry.captureMessage("CSP violation", "warning");
    });

    console.warn("[csp-report]", violation);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to record CSP report.", { request });
  }
}