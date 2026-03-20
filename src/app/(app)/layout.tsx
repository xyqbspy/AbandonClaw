import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageShell } from "@/components/layout/page-shell";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { getCurrentUser } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <PageShell>
      <AppTopbar />
      <PullToRefresh>
        <div className="app-container py-6 sm:py-8">{children}</div>
      </PullToRefresh>
    </PageShell>
  );
}
