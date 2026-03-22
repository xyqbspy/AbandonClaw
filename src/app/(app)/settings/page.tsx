import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getCurrentUser, isAdminUser } from "@/lib/server/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const canAccessAdmin = user ? isAdminUser(user) : false;

  return <SettingsPageClient canAccessAdmin={canAccessAdmin} />;
}
