import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRow } from "@/lib/server/db/types";
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

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await fn();
    const error = toErrorLike(result.error);
    if (!error) {
      return {
        data: result.data,
        error: null,
      };
    }
    lastError = error;

    if (!isTransientAuthNetworkError(error.message) || attempt >= 2) {
      break;
    }

    console.warn("[auth] transient network error, retrying", {
      label,
      attempt,
      message: error.message,
    });
    await waitMs(250);
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

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await withAuthRetry<{ session: Session | null }>(
    "getSession",
    () => supabase.auth.getSession() as Promise<{ data: { session: Session | null }; error: unknown }>,
  );
  if (error) {
    if (isMissingSessionError(error.message)) return null;
    if (isTransientAuthNetworkError(error.message)) {
      throw new Error(
        "Supabase auth network timeout while reading session. Please retry.",
      );
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
    if (isMissingSessionError(error.message)) return null;
    if (isTransientAuthNetworkError(error.message)) {
      throw new Error(
        "Supabase auth network timeout while reading current user. Please retry.",
      );
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
