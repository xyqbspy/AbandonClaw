import { NextResponse } from "next/server";
import { getPreGeneratedTtsAudioUrl } from "@/lib/server/tts/service";
import type { TtsRequestPayload } from "@/lib/server/tts/service";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { requireCurrentProfile } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";
import {
  AuthError,
  NotFoundError,
  ValidationError,
} from "@/lib/server/errors";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import {
  resolveAnonymousContext,
  type ResolvedAnonymousContext,
} from "@/lib/server/anonymous/identity";
import {
  checkAnonymousTtsPlaybackQuota,
  type AnonymousTtsPlaybackQuotaResult,
} from "@/lib/server/anonymous/tts-playback-quota";
import {
  attachAnonymousQuotaHeaders,
  buildAnonymousQuotaHeaders,
} from "@/lib/server/anonymous/quota-headers";
import { isAnonymousAccessError } from "@/lib/server/anonymous/route-guard";
import { assertAllowedOrigin } from "@/lib/server/request-guard";
import type { AnonymousSessionStoreDependencies } from "@/lib/server/anonymous/session-store";

/**
 * GET /api/anonymous/tts/play
 *
 * 已登录与匿名都允许:仅返回已存在于 Storage 的预生成 TTS 签名 URL,
 * Storage miss 返 404(**不** fallback 上游 MsEdgeTTS,匿名分支不允许触发付费链路)。
 *
 * 匿名分支:
 * - middleware 不在 PROTECTED_API_PREFIXES 列表,直接透传到本路由
 * - ALLOW_ANONYMOUS_TRIAL 关闭时:resolveAnonymousContext 之前会因 AuthError 透传到 401
 * - 解析 X-Anonymous-Id 头 + IP 滑窗 30/min + 单 anon 会话每日 30 次(env 可调)
 * - 命中阈值时返 429 ANON_QUOTA_EXCEEDED_SESSION,只用于"次签发数"控制
 *
 * 已登录分支:跳过 quota(已在 /api/tts 主路由计算),直接查 storage。
 * 注:本路由对已登录用户是 fast path,主路径 /api/tts 仍然能 storage hit 不调上游。
 */

const SUPPORTED_KINDS = new Set(["sentence", "chunk", "scene_full"]);

interface TtsPlayDependencies {
  requireCurrentProfile: typeof requireCurrentProfile;
  getPreGeneratedTtsAudioUrl: typeof getPreGeneratedTtsAudioUrl;
  checkAnonymousTtsPlaybackQuota: typeof checkAnonymousTtsPlaybackQuota;
  resolveAnonymousContext: typeof resolveAnonymousContext;
  anonymous?: {
    sessionStore?: AnonymousSessionStoreDependencies;
  };
}

const defaultDependencies: TtsPlayDependencies = {
  requireCurrentProfile,
  getPreGeneratedTtsAudioUrl,
  checkAnonymousTtsPlaybackQuota,
  resolveAnonymousContext,
};

const parsePayloadFromQuery = (request: Request): TtsRequestPayload => {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (!kind || !SUPPORTED_KINDS.has(kind)) {
    throw new ValidationError(
      `Unsupported kind: ${kind ?? "<missing>"}. Expected one of ${[...SUPPORTED_KINDS].join("/")}.`,
    );
  }
  const text = url.searchParams.get("text") ?? undefined;
  if (kind !== "scene_full" && (!text || !text.trim())) {
    throw new ValidationError("`text` query param is required for kind=sentence|chunk.");
  }
  return {
    kind,
    mode: url.searchParams.get("mode") ?? undefined,
    speed: url.searchParams.get("speed") ?? undefined,
    speaker: url.searchParams.get("speaker") ?? undefined,
    sceneSlug: url.searchParams.get("sceneSlug") ?? undefined,
    sentenceId: url.searchParams.get("sentenceId") ?? undefined,
    chunkKey: url.searchParams.get("chunkKey") ?? undefined,
    sceneType: url.searchParams.get("sceneType") ?? undefined,
    text,
  };
};

const setNoStoreCacheHeaders = (response: NextResponse) => {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

export async function handleAnonymousTtsPlay(
  request: Request,
  dependencies: TtsPlayDependencies = defaultDependencies,
) {
  let quotaResult: AnonymousTtsPlaybackQuotaResult | null = null;
  let anonContext: ResolvedAnonymousContext | null = null;
  let registered = false;
  try {
    assertAllowedOrigin(request);

    const payload = parsePayloadFromQuery(request);

    // 鉴权分支:已登录直接通过;否则按匿名链路解析,关闭开关时透传 AuthError(401)
    try {
      await dependencies.requireCurrentProfile();
      registered = true;
    } catch (error) {
      if (!(error instanceof AuthError)) throw error;
      if (!isAnonymousTrialEnabled()) throw error;

      anonContext = await dependencies.resolveAnonymousContext(
        request,
        dependencies.anonymous?.sessionStore,
      );
      if (anonContext.isSearchEngineBot) {
        // 爬虫不能拿 signed URL,统一透传 401 与 explain-selection 行为一致
        throw error;
      }

      quotaResult = await dependencies.checkAnonymousTtsPlaybackQuota({
        anonId: anonContext.anonId,
        ipHash: anonContext.ipHash,
      });
    }

    const lookup = await dependencies.getPreGeneratedTtsAudioUrl(payload);
    if (!lookup) {
      throw new NotFoundError("Pre-generated TTS audio not found for this payload.");
    }

    const response = NextResponse.json(
      { signedUrl: lookup.signedUrl, source: lookup.source },
      { status: 200 },
    );
    setNoStoreCacheHeaders(response);
    if (quotaResult) {
      attachAnonymousQuotaHeaders(response, quotaResult);
    }
    return response;
  } catch (error) {
    const userType =
      anonContext !== null || (!registered && isAnonymousAccessError(error))
        ? "anonymous"
        : "registered";
    logApiError("api/anonymous/tts/play", error, { request, userType });
    const response = toApiErrorResponse(error, "Failed to resolve TTS audio.", {
      request,
      userType,
    });
    setNoStoreCacheHeaders(response);
    if (quotaResult) {
      const headers = buildAnonymousQuotaHeaders(quotaResult);
      for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
      }
    }
    return response;
  }
}

export async function GET(request: Request) {
  return handleAnonymousTtsPlay(request);
}
