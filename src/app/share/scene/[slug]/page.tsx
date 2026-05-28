import { redirect } from "next/navigation";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import {
  detectAnonymousSsrContext,
  setAnonymousResponseHeaders,
} from "@/lib/server/anonymous/ssr-response";
import { AnonymousGuidanceState } from "@/features/anonymous-trial/components/anonymous-guidance-state";

/**
 * /share/scene/[slug]
 *
 * 灰度入口:用户从外部分享链接进入,允许匿名访问场景预览。
 * - ALLOW_ANONYMOUS_TRIAL 关闭时:重定向到 /login?redirect=/share/scene/{slug},
 *   登录后再回跳到原入口,既不破坏老链路也不破坏分享体验。
 * - 开关打开 + 搜索引擎爬虫:渲染最小可索引引导态,不触发任何 AI/TTS 付费链路。
 * - 开关打开 + 真实匿名用户:渲染 chunks 引导态(说明能做什么/不能做什么),
 *   不暴露 SceneDetailClientPage 的写入按钮(后续灰度复盘后再决定是否放开)。
 *
 * 主入口(/today /scene /scenes /review /chunks)在 middleware.ts 中
 * 通过 PROTECTED_PAGE_PREFIXES 显式守护,匿名访问会被强制重定向到 /login,
 * 因此本灰度只在 /share/... 路径生效。
 */
export default async function ShareScenePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isAnonymousTrialEnabled()) {
    redirect(`/login?redirect=/share/scene/${encodeURIComponent(slug)}`);
  }

  const { headers } = await import("next/headers");
  const outgoing = await headers();
  // 不要把匿名响应缓存到任何中间层
  setAnonymousResponseHeaders(new Headers(outgoing));

  await detectAnonymousSsrContext();

  return (
    <AnonymousGuidanceState
      page="chunks"
      registerHref={`/register?from=share&scene=${encodeURIComponent(slug)}`}
    />
  );
}
