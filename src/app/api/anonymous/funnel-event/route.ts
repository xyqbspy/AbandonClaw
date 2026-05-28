import { NextResponse } from "next/server";
import {
  isAnonymousFunnelEventName,
  recordAnonymousFunnelEventSafe,
  type AnonymousFunnelEventName,
} from "@/lib/server/anonymous/funnel-events";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { resolveAnonymousContext } from "@/lib/server/anonymous/identity";
import { logApiError } from "@/lib/server/logger";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { assertAllowedOrigin } from "@/lib/server/request-guard";

/**
 * 仅允许 client 端主动上报的"用户行为"类匿名漏斗事件。
 * server 端触发的事件(session_created / quota_blocked / ai_explain_used)
 * 由各自业务路径内部发,不通过这里,避免客户端伪造关键指标。
 */
const CLIENT_REPORTABLE_EVENTS = new Set<AnonymousFunnelEventName>([
  "anon_register_prompt_shown",
  "anon_register_prompt_clicked",
  "anon_first_scene_viewed",
  "anon_first_scene_completed",
]);

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    if (!isAnonymousTrialEnabled()) {
      return NextResponse.json({ ok: false, code: "ANON_TRIAL_DISABLED" }, { status: 404 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { event?: unknown; payload?: unknown }
      | null;
    const rawEvent = typeof payload?.event === "string" ? payload.event.trim() : "";
    if (!rawEvent || !isAnonymousFunnelEventName(rawEvent)) {
      throw new ValidationError("Unknown anonymous funnel event name.");
    }
    if (!CLIENT_REPORTABLE_EVENTS.has(rawEvent)) {
      throw new ValidationError("This funnel event is not reportable from the client.");
    }

    const anonContext = await resolveAnonymousContext(request);
    if (anonContext.isSearchEngineBot) {
      return new NextResponse(null, { status: 204 });
    }

    const eventPayload =
      payload?.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
        ? (payload.payload as Record<string, unknown>)
        : null;

    recordAnonymousFunnelEventSafe({
      eventName: rawEvent,
      anonId: anonContext.anonId,
      ipHash: anonContext.ipHash,
      payload: eventPayload,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logApiError("api/anonymous/funnel-event", error, { request, userType: "anonymous" });
    return toApiErrorResponse(error, "Failed to record anonymous funnel event.", {
      request,
      userType: "anonymous",
    });
  }
}
