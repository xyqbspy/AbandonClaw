import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getCurrentUser, isAdminUser } from "@/lib/server/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const canAccessAdmin = user ? isAdminUser(user) : false;
  const username =
    typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username.trim()
      : "";
  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const emailName = user?.email?.split("@")[0]?.trim() ?? "";
  const displayName = username || fullName || emailName || "学习者";

  return (
    <SettingsPageClient
      canAccessAdmin={canAccessAdmin}
      userDisplay={{
        displayName,
        email: user?.email ?? "",
      }}
    />
  );
}
