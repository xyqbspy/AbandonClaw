import { TodayPageClient } from "@/features/today/components/today-page-client";
import { requireCurrentProfile } from "@/lib/server/auth";

export default async function TodayPage() {
  const { user, profile } = await requireCurrentProfile();
  const displayName = profile.username ?? user.email?.split("@")[0] ?? "学习者";
  return <TodayPageClient displayName={displayName} />;
}
