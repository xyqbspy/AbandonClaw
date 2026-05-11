import { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageShell } from "@/components/layout/page-shell";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { getCurrentUser } from "@/lib/server/auth";

function resolveUserDisplay(user: User) {
  const username =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username.trim()
      : "";
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const emailName = user.email?.split("@")[0]?.trim() ?? "";
  const displayName = username || fullName || emailName || "学习者";
  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return {
    displayName,
    email: user.email ?? "",
    initials: initials || displayName.slice(0, 2).toUpperCase(),
  };
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const userDisplay = resolveUserDisplay(user);

  return (
    <PageShell>
      <AppTopbar userDisplay={userDisplay} />
      <PullToRefresh>
        <div className="app-container py-6 sm:py-8 lg:px-10">{children}</div>
      </PullToRefresh>
    </PageShell>
  );
}
