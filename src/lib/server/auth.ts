import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRow } from "@/lib/server/db/types";
import { AuthError, ForbiddenError } from "@/lib/server/errors";
import { isAdminEmail } from "@/lib/shared/admin";

const isMissingSessionError = (message: string) =>
  message.toLowerCase().includes("auth session missing");

const defaultUsernameFromUser = (user: User) =>
  user.user_metadata?.username ||
  user.email?.split("@")[0] ||
  `user-${user.id.slice(0, 8)}`;

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (isMissingSessionError(error.message)) return null;
    throw new Error(error.message);
  }
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isMissingSessionError(error.message)) return null;
    throw new Error(error.message);
  }
  return data.user;
}

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError();
  }
  return user;
}

export function isAdminUser(user: Pick<User, "email">): boolean {
  return isAdminEmail(user.email);
}

export async function requireAdmin(): Promise<User> {
  const user = await requireCurrentUser();
  if (!isAdminUser(user)) {
    throw new ForbiddenError();
  }
  return user;
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureProfile(user);
}

export async function requireCurrentProfile(): Promise<{
  user: User;
  profile: ProfileRow;
}> {
  const user = await requireCurrentUser();
  const profile = await ensureProfile(user);
  return { user, profile };
}

export async function ensureProfile(user: User): Promise<ProfileRow> {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: findError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (findError) {
    throw new Error(`Failed to read profile: ${findError.message}`);
  }

  if (existing) return existing;

  const insertPayload = {
    id: user.id,
    username: defaultUsernameFromUser(user),
    avatar_url:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
    english_level:
      typeof user.user_metadata?.english_level === "string"
        ? user.user_metadata.english_level
        : null,
  };

  const { data: inserted, error: insertError } = await admin
    .from("profiles")
    .upsert(insertPayload as never, { onConflict: "id" })
    .select("*")
    .single<ProfileRow>();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create profile: ${insertError?.message ?? "unknown error"}`,
    );
  }

  return inserted;
}
