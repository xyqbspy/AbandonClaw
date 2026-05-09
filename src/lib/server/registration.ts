import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { AuthError, ValidationError } from "@/lib/server/errors";

export type RegistrationMode = "closed" | "invite_only" | "open";

type InviteCodeRow = {
  id: string;
  code_hash: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

type InviteAttemptStatus = "pending" | "used" | "rejected" | "failed" | "needs_repair";

export type SignupPayload = {
  email: string;
  password: string;
  username?: string;
  inviteCode?: string;
};

export type SignupResult = {
  userId: string | null;
  email: string;
  mode: RegistrationMode;
  emailVerificationRequired: boolean;
};

export const getRegistrationMode = (): RegistrationMode => {
  const raw = process.env.REGISTRATION_MODE?.trim();
  if (raw === "closed" || raw === "invite_only" || raw === "open") {
    return raw;
  }
  return "closed";
};

export const normalizeInviteCode = (code: string) => code.trim();

export const hashInviteCode = (code: string) =>
  createHash("sha256").update(normalizeInviteCode(code), "utf8").digest("hex");

const normalizeEmail = (email: unknown) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const normalizePassword = (password: unknown) =>
  typeof password === "string" ? password : "";

const normalizeUsername = (username: unknown) =>
  typeof username === "string" ? username.trim().slice(0, 80) : "";

const updateAttempt = async (
  attemptId: string,
  status: InviteAttemptStatus,
  extra?: { authUserId?: string | null; failureReason?: string | null },
) => {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("registration_invite_attempts")
    .update({
      status,
      auth_user_id: extra?.authUserId ?? null,
      failure_reason: extra?.failureReason ?? null,
    } as never)
    .eq("id", attemptId);

  if (error) {
    throw new Error(`Failed to update invite attempt: ${error.message}`);
  }
};

const createAttempt = async (
  email: string,
  status: InviteAttemptStatus,
  inviteCodeId?: string | null,
  failureReason?: string | null,
) => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("registration_invite_attempts")
    .insert({
      email,
      status,
      invite_code_id: inviteCodeId ?? null,
      failure_reason: failureReason ?? null,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Failed to create invite attempt: ${error?.message ?? "unknown error"}`);
  }

  return data.id;
};

const getValidInviteCode = async (inviteCode: string) => {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("registration_invite_codes")
    .select("id, code_hash, max_uses, used_count, expires_at, is_active")
    .eq("code_hash", hashInviteCode(inviteCode))
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle<InviteCodeRow>();

  if (error) {
    throw new Error(`Failed to read invite code: ${error.message}`);
  }

  if (!data || data.used_count >= data.max_uses) {
    return null;
  }

  return data;
};

const consumeInviteCode = async (inviteCode: InviteCodeRow) => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("registration_invite_codes")
    .update({ used_count: inviteCode.used_count + 1 } as never)
    .eq("id", inviteCode.id)
    .eq("used_count", inviteCode.used_count)
    .lt("used_count", inviteCode.max_uses)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Failed to consume invite code: ${error.message}`);
  }

  return Boolean(data);
};

export async function registerWithEmailPassword(payload: SignupPayload): Promise<SignupResult> {
  const mode = getRegistrationMode();
  const email = normalizeEmail(payload.email);
  const password = normalizePassword(payload.password);
  const username = normalizeUsername(payload.username);
  const inviteCode = typeof payload.inviteCode === "string" ? payload.inviteCode.trim() : "";

  if (!email || !email.includes("@")) {
    throw new ValidationError("email is required.");
  }
  if (password.length < 8) {
    throw new ValidationError("password must be at least 8 characters.");
  }
  if (mode === "closed") {
    throw new AuthError("Registration is currently closed.");
  }

  let invite: InviteCodeRow | null = null;
  let attemptId: string | null = null;

  if (mode === "invite_only") {
    if (!inviteCode) {
      await createAttempt(email, "rejected", null, "missing_invite_code");
      throw new AuthError("Invite code is required.");
    }

    invite = await getValidInviteCode(inviteCode);
    if (!invite) {
      await createAttempt(email, "rejected", null, "invalid_invite_code");
      throw new AuthError("Invite code is invalid or expired.");
    }

    attemptId = await createAttempt(email, "pending", invite.id);
  }

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: username ? { data: { username } } : undefined,
  });

  if (error) {
    if (attemptId) {
      await updateAttempt(attemptId, "failed", { failureReason: error.message });
    }
    throw new AuthError(error.message);
  }

  const userId = data.user?.id ?? null;

  if (invite && attemptId) {
    const consumed = await consumeInviteCode(invite);
    await updateAttempt(attemptId, consumed ? "used" : "needs_repair", {
      authUserId: userId,
      failureReason: consumed ? null : "invite_consume_conflict",
    });
  }

  return {
    userId,
    email,
    mode,
    emailVerificationRequired: true,
  };
}
