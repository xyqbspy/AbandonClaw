import { ReactNode } from "react";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { RoutePendingOverlay } from "@/components/layout/route-pending-overlay";
import { SiteHeader } from "@/components/layout/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <RoutePendingOverlay />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
