import { getClientIp } from "@/lib/server/rate-limit";
import { AnonIdRequiredError } from "@/lib/server/errors";
import {
  hashIp,
  getDailySalt,
} from "@/lib/server/anonymous/daily-salt";
import {
  upsertAnonymousSession,
  type AnonymousSessionStoreDependencies,
} from "@/lib/server/anonymous/session-store";

const ANON_HEADER = "x-anonymous-id";

const ANON_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SEARCH_ENGINE_BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /duckduckbot/i,
  /sogou/i,
];

export interface AnonymousIdentity {
  anonId: string;
  ipHash: string;
  isSearchEngineBot: false;
}

export interface SearchEngineBotIdentity {
  anonId: null;
  ipHash: null;
  isSearchEngineBot: true;
}

export type ResolvedAnonymousContext = AnonymousIdentity | SearchEngineBotIdentity;

export const isSearchEngineBotRequest = (request: Request) => {
  const ua = request.headers.get("user-agent") ?? "";
  return SEARCH_ENGINE_BOT_PATTERNS.some((re) => re.test(ua));
};

export const readAnonymousIdHeader = (request: Request): string | null => {
  const value = request.headers.get(ANON_HEADER)?.trim();
  if (!value || !ANON_ID_REGEX.test(value)) return null;
  return value;
};

export async function resolveAnonymousContext(
  request: Request,
  dependencies?: AnonymousSessionStoreDependencies,
): Promise<ResolvedAnonymousContext> {
  if (isSearchEngineBotRequest(request)) {
    return { anonId: null, ipHash: null, isSearchEngineBot: true };
  }

  const anonId = readAnonymousIdHeader(request);
  if (!anonId) {
    throw new AnonIdRequiredError();
  }

  const ipHash = await hashIp(getClientIp(request), getDailySalt());
  await upsertAnonymousSession({ anonId, ipHash }, dependencies);

  return { anonId, ipHash, isSearchEngineBot: false };
}
