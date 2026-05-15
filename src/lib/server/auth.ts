import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRow, UserAccessStatus } from "@/lib/server/db/types";
import { AuthError, ForbiddenError } from "@/lib/server/errors";
import { isAdminEmail } from "@/lib/shared/admin";

const isMissingSessionError = (message: string) =>
  message.toLowerCase().includes("auth session missing");

const isTransientAuthNetworkError = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("connect timeout") ||
    lower.includes("und_err_connect_timeout")
  );
};

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withAuthRetry<T>(
  label: "getSession" | "getUser",
  fn: () => Promise<{ data: T; error: unknown }>,
) {
  let lastError: { message: string } | null = null;

  const toErrorLike = (value: unknown): { message: string } | null => {
    if (!value) return null;
    if (
      typeof value === "object" &&
      "message" in value &&
      typeof (value as { message?: unknown }).message === "string"
    ) {
      return { message: (value as { message: string }).message };
    }
    return { message: String(value) };
  };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await fn();
    const error = toErrorLike(result.error);
    if (!error) {
      return {
        data: result.data,
        error: null,
      };
    }
    lastError = error;

    if (!isTransientAuthNetworkError(error.message) || attempt >= 3) {
      break;
    }

    console.warn("[auth] transient network error, retrying", {
      label,
      attempt,
      message: error.message,
    });
    await waitMs(250 * attempt);
  }

  return {
    data: {} as T,
    error: lastError,
  };
}

const defaultUsernameFromUser = (user: User) =>
  user.user_metadata?.username ||
  user.email?.split("@")[0] ||
  `user-${user.id.slice(0, 8)}`;

const getAccessStatus = (profile: Pick<ProfileRow, "access_status">): UserAccessStatus =>
  profile.access_status ?? "active";

export function assertProfileCanEnterApp(profile: Pick<ProfileRow, "access_status">) {
  if (getAccessStatus(profile) === "disabled") {
    throw new ForbiddenError("Account disabled.");
  }
}

export function assertProfileCanGenerate(profile: Pick<ProfileRow, "access_status">) {
  const status = getAccessStatus(profile);
  if (status === "disabled") {
    throw new ForbiddenError("Account disabled.");
  }
  if (status === "generation_limited") {
    throw new ForbiddenError("Generation is limited for this account.");
  }
}

export function assertProfileCanWrite(profile: Pick<ProfileRow, "access_status">) {
  const status = getAccessStatus(profile);
  if (status === "disabled") {
    throw new ForbiddenError("Account disabled.");
  }
  if (status === "readonly") {
    throw new ForbiddenError("Account is readonly.");
  }
}

const isStaleRefreshTokenError = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("refresh token not found") ||
    lower.includes("refresh_token_not_found") ||
    lower.includes("invalid refresh token") ||
    lower.includes("session_not_found") ||
    lower.includes("session not found")
  );
};

const clearStaleSupabaseSession = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  message: string,
) => {
  console.warn("[auth] clearing stale supabase session", { message });
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (signOutError) {
    console.warn("[auth] failed to clear stale supabase session", {
      error: signOutError instanceof Error ? signOutError.message : String(signOutError),
    });
  }
};

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await withAuthRetry<{ session: Session | null }>(
    "getSession",
    () => supabase.auth.getSession() as Promise<{ data: { session: Session | null }; error: unknown }>,
  );
  if (error) {
    if (isStaleRefreshTokenError(error.message)) {
      await clearStaleSupabaseSession(supabase, error.message);
      return null;
    }
    if (isMissingSessionError(error.message)) return null;
    if (isTransientAuthNetworkError(error.message)) {
      console.warn("[auth] transient timeout in getCurrentSession, fallback to null", {
        message: error.message,
      });
      return null;
    }
    throw new Error(error.message);
  }
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await withAuthRetry<{ user: User | null }>(
    "getUser",
    () => supabase.auth.getUser() as Promise<{ data: { user: User | null }; error: unknown }>,
  );
  if (error) {
    if (isStaleRefreshTokenError(error.message)) {
      await clearStaleSupabaseSession(supabase, error.message);
      return null;
    }
    if (isMissingSessionError(error.message)) return null;
    if (isTransientAuthNetworkError(error.message)) {
      console.warn("[auth] transient timeout in getCurrentUser, trying session fallback", {
        message: error.message,
      });
      try {
        const fallback = await getCurrentSession();
        return fallback?.user ?? null;
      } catch {
        return null;
      }
    }
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

export function isEmailVerifiedUser(
  user: Pick<User, "email_confirmed_at"> & { confirmed_at?: string | null },
): boolean {
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}

export async function requireVerifiedCurrentUser(): Promise<User> {
  const user = await requireCurrentUser();
  if (!isEmailVerifiedUser(user)) {
    throw new ForbiddenError("Email verification required.");
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

export async function getCurrentProfileForUser(user: User | null): Promise<ProfileRow | null> {
  if (!user) return null;
  return ensureProfile(user);
}

export async function requireCurrentProfile(): Promise<{
  user: User;
  profile: ProfileRow;
}> {
  const user = await requireCurrentUser();
  const profile = await ensureProfile(user);
  assertProfileCanEnterApp(profile);
  return { user, profile };
}

export async function requireVerifiedCurrentProfile(): Promise<{
  user: User;
  profile: ProfileRow;
}> {
  const user = await requireVerifiedCurrentUser();
  const profile = await ensureProfile(user);
  assertProfileCanEnterApp(profile);
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
