import { notFound, redirect } from "next/navigation";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { detectAnonymousSsrContext } from "@/lib/server/anonymous/ssr-response";
import { getPublicSceneBySlug } from "@/lib/server/scene/service";
import { AnonymousGuidanceState } from "@/features/anonymous-trial/components/anonymous-guidance-state";
import { ShareScenePreviewClient } from "@/features/anonymous-trial/components/share-scene-preview-client";

/**
 * /share/scene/[slug]
 *
 * 灰度入口:用户从外部分享链接进入,允许匿名访问场景预览。
 * - ALLOW_ANONYMOUS_TRIAL 关闭时:重定向到 /login?redirect=/share/scene/{slug},
 *   登录后再回跳到原入口,既不破坏老链路也不破坏分享体验。
 * - 开关打开 + 搜索引擎爬虫:渲染最小可索引引导态,不触发任何 AI/TTS 付费链路,
 *   也不会创建 anonymous_session(资源获取走 anon SELECT,RLS 自然只回 is_public=true)。
 * - 开关打开 + 真实匿名用户:SSR 直读 scenes 表(走 anon RLS),把 Lesson 数据
 *   传给 ShareScenePreviewClient,客户端做"看 + 选词 → AI 解释"最小闭环,
 *   触发 explain_selection 时按 anon 配额 200/3 拦截。
 * - 场景找不到 / 不公开:走 notFound(),返回 404。
 *
 * 主入口(/today /scene /scenes /review /chunks /progress)在 middleware.ts 中
 * 通过 PROTECTED_PAGE_PREFIXES 显式守护,匿名访问会被强制重定向到 /login,
 * 因此本灰度只在 /share/... 路径生效。
 *
 * 响应头(Cache-Control: private, no-store)由 middleware.ts 在 /share 路径下统一注入,
 * 避免阻断弹窗状态被中间层缓存命中。
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

  const { isSearchEngineBot } = await detectAnonymousSsrContext();
  const registerHref = `/register?from=share&scene=${encodeURIComponent(slug)}`;

  if (isSearchEngineBot) {
    return <AnonymousGuidanceState page="chunks" registerHref={registerHref} />;
  }

  const lesson = await getPublicSceneBySlug(slug);
  if (!lesson) {
    notFound();
  }

  return (
    <ShareScenePreviewClient initialLesson={lesson} registerHref={registerHref} />
  );
}
