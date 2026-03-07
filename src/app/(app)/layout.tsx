import { ReactNode } from "react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageShell } from "@/components/layout/page-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <AppTopbar />
      <div className="app-container py-6 sm:py-8">{children}</div>
    </PageShell>
  );
}
