import { headers as nextHeaders } from "next/headers";
import { isSearchEngineBotRequest } from "@/lib/server/anonymous/identity";

export const ANONYMOUS_CACHE_CONTROL = "private, no-store";

const buildRequestFromHeaders = (incoming: { get: (name: string) => string | null }) => {
  const ua = incoming.get("user-agent") ?? "";
  return new Request("http://internal.local/__anon_probe", {
    headers: { "user-agent": ua },
  });
};

export const setAnonymousResponseHeaders = (headers: Headers) => {
  headers.set("Cache-Control", ANONYMOUS_CACHE_CONTROL);
};

export const isSearchEngineBotFromHeaders = (
  incoming: { get: (name: string) => string | null },
): boolean => isSearchEngineBotRequest(buildRequestFromHeaders(incoming));

export const detectAnonymousSsrContext = async (): Promise<{
  isSearchEngineBot: boolean;
  userAgent: string;
}> => {
  const incoming = await nextHeaders();
  const userAgent = incoming.get("user-agent") ?? "";
  return {
    isSearchEngineBot: isSearchEngineBotFromHeaders(incoming),
    userAgent,
  };
};
