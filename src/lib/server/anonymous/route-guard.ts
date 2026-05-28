import type { User } from "@supabase/supabase-js";
import {
  AnonFeatureDisabledError,
  AuthError,
  type AppError,
} from "@/lib/server/errors";
import { isAppError } from "@/lib/server/errors";
import type { ProfileRow } from "@/lib/server/db/types";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { getAnonymousFeatureConfig } from "@/lib/server/anonymous/feature-matrix";
import {
  resolveAnonymousContext,
  type ResolvedAnonymousContext,
} from "@/lib/server/anonymous/identity";
import {
  checkAnonymousQuota,
  type AnonymousQuotaDependencies,
  type AnonymousQuotaResult,
} from "@/lib/server/anonymous/quota";
import type { HighCostCapability } from "@/lib/server/high-cost-usage";
import type { AnonymousSessionStoreDependencies } from "@/lib/server/anonymous/session-store";

/**
 * 适用于"匿名禁用"写入/高成本接口的入口守护:
 * - 已登录:直接返回 getProfile() 结果(可能是 { user, profile })。
 * - 匿名 + 试用关闭(ALLOW_ANONYMOUS_TRIAL 未开):原 AuthError 透传,保持既有 401 行为。
 * - 匿名 + 试用打开:抛 AnonFeatureDisabledError(403, code=ANON_FEATURE_DISABLED, details.capability=capability),
 *   便于前端按 capability 提示"注册解锁"。
 *
 * capability 仅作为 details.capability 字段透传给前端文案映射,不必属于 HighCostCapability。
 */
export async function ensureProfileOrRejectAnonymous<T>(
  capability: string,
  getProfile: () => Promise<T>,
): Promise<T> {
  try {
    return await getProfile();
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    if (!isAnonymousTrialEnabled()) throw error;
    throw new AnonFeatureDisabledError(capability);
  }
}

export interface ProfileOrAnonymousRegistered {
  mode: "registered";
  user: User;
  profile: ProfileRow;
  anonContext: null;
  quotaResult: null;
}

export interface ProfileOrAnonymousAnonymous {
  mode: "anonymous";
  user: null;
  profile: null;
  anonContext: ResolvedAnonymousContext;
  quotaResult: AnonymousQuotaResult;
}

export type ProfileOrAnonymousResult =
  | ProfileOrAnonymousRegistered
  | ProfileOrAnonymousAnonymous;

export interface ProfileOrAnonymousDependencies {
  sessionStore?: AnonymousSessionStoreDependencies;
  quota?: AnonymousQuotaDependencies;
}

/**
 * 适用于"允许匿名 + 配额隔离"的高成本接口入口守护(例如 AI 表达解释、TTS 预生成播放)。
 * - 已登录:返回 { mode: "registered", user, profile },后续走原 reserveHighCostUsage 流程。
 * - 匿名 + 试用关闭:AuthError 透传(保持 401)。
 * - 匿名 + 试用打开 + featureMatrix.anonAllowed=false:抛 AnonFeatureDisabledError。
 * - 匿名 + 试用打开 + featureMatrix.anonAllowed=true + 搜索引擎爬虫:不能触发付费 AI/TTS,透传 AuthError。
 * - 匿名 + 试用打开 + featureMatrix.anonAllowed=true:解析 anon_id/ip_hash → 走 checkAnonymousQuota,
 *   返回 { mode: "anonymous", anonContext, quotaResult },调用方负责挂载 X-Quota-* 响应头。
 */
export async function ensureProfileOrAnonymousQuota(
  capability: HighCostCapability,
  request: Request,
  getProfile: () => Promise<{ user: User; profile: ProfileRow }>,
  dependencies?: ProfileOrAnonymousDependencies,
): Promise<ProfileOrAnonymousResult> {
  try {
    const { user, profile } = await getProfile();
    return {
      mode: "registered",
      user,
      profile,
      anonContext: null,
      quotaResult: null,
    };
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    if (!isAnonymousTrialEnabled()) throw error;
    const config = getAnonymousFeatureConfig(capability);
    if (!config.anonAllowed) {
      throw new AnonFeatureDisabledError(capability);
    }
    const anonContext = await resolveAnonymousContext(request, dependencies?.sessionStore);
    if (anonContext.isSearchEngineBot) {
      throw error;
    }
    const quotaResult = await checkAnonymousQuota(
      {
        capability,
        anonId: anonContext.anonId,
        ipHash: anonContext.ipHash,
      },
      dependencies?.quota,
    );
    return {
      mode: "anonymous",
      user: null,
      profile: null,
      anonContext,
      quotaResult,
    };
  }
}

/** 便于在 catch 分支判定是否已经是匿名链路的受控错误,避免重复 Sentry 上报。 */
export const isAnonymousAccessError = (error: unknown): error is AppError =>
  isAppError(error) &&
  (error.code === "ANON_FEATURE_DISABLED" ||
    error.code === "ANON_QUOTA_EXCEEDED_SESSION" ||
    error.code === "ANON_QUOTA_EXCEEDED_GLOBAL" ||
    error.code === "ANON_IP_RATE_LIMITED" ||
    error.code === "ANON_ID_REQUIRED");
