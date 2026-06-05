import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { RoutePendingOverlay } from "@/components/layout/route-pending-overlay";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * /share/... 分享灰度入口:不强制登录,但需在 ALLOW_ANONYMOUS_TRIAL 开关打开时
 * 才能落到匿名分支,否则各子路由自己负责重定向到 /login。
 */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <RoutePendingOverlay />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
