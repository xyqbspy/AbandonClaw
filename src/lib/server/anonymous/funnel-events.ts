import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const ANONYMOUS_FUNNEL_EVENT_NAMES = [
  "anon_session_created",
  "anon_first_scene_viewed",
  "anon_first_scene_completed",
  "anon_ai_explain_used",
  "anon_quota_blocked",
  "anon_register_prompt_shown",
  "anon_register_prompt_clicked",
  "anon_registered",
] as const;

export type AnonymousFunnelEventName = (typeof ANONYMOUS_FUNNEL_EVENT_NAMES)[number];

export const isAnonymousFunnelEventName = (
  value: string,
): value is AnonymousFunnelEventName =>
  (ANONYMOUS_FUNNEL_EVENT_NAMES as readonly string[]).includes(value);

export interface AnonymousFunnelEventDependencies {
  createSupabaseAdminClient: typeof createSupabaseAdminClient;
}

const defaultDependencies: AnonymousFunnelEventDependencies = {
  createSupabaseAdminClient,
};

export interface RecordAnonymousFunnelEventParams {
  eventName: AnonymousFunnelEventName;
  anonId: string;
  ipHash: string;
  payload?: Record<string, unknown> | null;
  now?: Date;
}

export async function recordAnonymousFunnelEvent(
  params: RecordAnonymousFunnelEventParams,
  dependencies: AnonymousFunnelEventDependencies = defaultDependencies,
): Promise<void> {
  if (!isAnonymousFunnelEventName(params.eventName)) {
    throw new Error(
      `recordAnonymousFunnelEvent: unknown event_name "${params.eventName}"`,
    );
  }
  if (!params.anonId || !params.ipHash) {
    throw new Error("recordAnonymousFunnelEvent: anonId/ipHash required");
  }

  const admin = dependencies.createSupabaseAdminClient();
  const createdAt = (params.now ?? new Date()).toISOString();

  const { error } = await admin.from("anonymous_funnel_events").insert({
    event_name: params.eventName,
    anon_id: params.anonId,
    ip_hash: params.ipHash,
    payload: params.payload ?? null,
    created_at: createdAt,
  } as never);

  if (error) {
    throw new Error(
      `Failed to record anonymous_funnel_event "${params.eventName}": ${error.message}`,
    );
  }
}
