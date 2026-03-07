import { ReactNode } from "react";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
