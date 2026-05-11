import { createHash, randomInt } from "node:crypto";
import { AuthError, RateLimitError, ValidationError } from "@/lib/server/errors";
import { logServerEvent } from "@/lib/server/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EmailCodeRow = {
  id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempt_count: number;
  max_attempts: number;
  last_sent_at: string;
};

type SendSignupEmailCodePayload = {
  email: string;
  code: string;
};

type EmailCodeDependencies = {
  createSupabaseAdminClient: typeof createSupabaseAdminClient;
  now: () => Date;
  randomCode: () => string;
  sendSignupEmailCode: (payload: SendSignupEmailCodePayload) => Promise<void>;
};

type IssueSignupEmailCodePayload = {
  email: string;
};

type VerifySignupEmailCodePayload = {
  email: string;
  code: string;
};

const CODE_TTL_SECONDS = 10 * 60;
const SEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const normalizeEmail = (email: unknown) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const normalizeCode = (code: unknown) =>
  typeof code === "string" ? code.trim() : "";

const validateEmail = (email: string) => {
  if (!email || !email.includes("@")) {
    throw new ValidationError("email is required.");
  }
};

export const generateSignupEmailCode = () =>
  String(randomInt(0, 1_000_000)).padStart(6, "0");

const getCodeSecret = () =>
  process.env.EMAIL_VERIFICATION_CODE_SECRET?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  "local-email-code-secret";

export const hashSignupEmailCode = (email: string, code: string) =>
  createHash("sha256")
    .update(`${normalizeEmail(email)}:${normalizeCode(code)}:${getCodeSecret()}`, "utf8")
    .digest("hex");

const getLatestActiveCode = async (
  email: string,
  dependencies: Pick<EmailCodeDependencies, "createSupabaseAdminClient">,
) => {
  const admin = dependencies.createSupabaseAdminClient();
  const { data, error } = await admin
    .from("registration_email_verification_codes")
    .select("id,email,code_hash,expires_at,consumed_at,attempt_count,max_attempts,last_sent_at")
    .eq("email", email)
    .eq("purpose", "signup")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<EmailCodeRow>();

  if (error) {
    throw new Error(`Failed to read email verification code: ${error.message}`);
  }

  return data ?? null;
};

export async function sendSignupEmailCodeViaProvider({
  email,
  code,
}: SendSignupEmailCodePayload) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (resendApiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Abridge English 注册验证码",
        text: `你的注册验证码是 ${code}，10 分钟内有效。`,
      }),
    });

    if (!response.ok) {
      throw new AuthError("Failed to send verification code email.");
    }
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new AuthError("Email provider is not configured.");
  }

  logServerEvent("info", "signup email code generated", {
    module: "signup-email-code",
    details: { email, code },
  });
}

const defaultDependencies: EmailCodeDependencies = {
  createSupabaseAdminClient,
  now: () => new Date(),
  randomCode: generateSignupEmailCode,
  sendSignupEmailCode: sendSignupEmailCodeViaProvider,
};

export async function issueSignupEmailCode(
  payload: IssueSignupEmailCodePayload,
  dependencies: EmailCodeDependencies = defaultDependencies,
) {
  const email = normalizeEmail(payload.email);
  validateEmail(email);

  const now = dependencies.now();
  const latest = await getLatestActiveCode(email, dependencies);
  if (latest) {
    const lastSentAt = new Date(latest.last_sent_at).getTime();
    const retryAfterSeconds = Math.ceil(
      (lastSentAt + SEND_COOLDOWN_SECONDS * 1000 - now.getTime()) / 1000,
    );
    if (retryAfterSeconds > 0) {
      throw new RateLimitError(retryAfterSeconds, "Please wait before requesting another code.");
    }
  }

  const code = dependencies.randomCode();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Generated email verification code is invalid.");
  }

  const expiresAt = new Date(now.getTime() + CODE_TTL_SECONDS * 1000).toISOString();
  const admin = dependencies.createSupabaseAdminClient();
  const { data, error } = await admin
    .from("registration_email_verification_codes")
    .insert({
      email,
      purpose: "signup",
      code_hash: hashSignupEmailCode(email, code),
      expires_at: expiresAt,
      max_attempts: MAX_ATTEMPTS,
      last_sent_at: now.toISOString(),
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Failed to create email verification code: ${error?.message ?? "unknown error"}`);
  }

  await dependencies.sendSignupEmailCode({ email, code });

  return {
    id: data.id,
    email,
    expiresInSeconds: CODE_TTL_SECONDS,
  };
}

export async function verifySignupEmailCode(
  payload: VerifySignupEmailCodePayload,
  dependencies: Pick<EmailCodeDependencies, "createSupabaseAdminClient" | "now"> = defaultDependencies,
) {
  const email = normalizeEmail(payload.email);
  const code = normalizeCode(payload.code);
  validateEmail(email);

  if (!/^\d{6}$/.test(code)) {
    throw new ValidationError("email verification code must be 6 digits.");
  }

  const row = await getLatestActiveCode(email, dependencies);
  if (!row) {
    throw new ValidationError("email verification code is invalid or expired.");
  }

  const admin = dependencies.createSupabaseAdminClient();
  const now = dependencies.now();
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    throw new ValidationError("email verification code is invalid or expired.");
  }

  if (row.attempt_count >= row.max_attempts) {
    throw new ValidationError("email verification code attempts exceeded.");
  }

  if (row.code_hash !== hashSignupEmailCode(email, code)) {
    await admin
      .from("registration_email_verification_codes")
      .update({ attempt_count: row.attempt_count + 1 } as never)
      .eq("id", row.id);
    throw new ValidationError("email verification code is invalid or expired.");
  }

  return {
    id: row.id,
    email,
  };
}

export async function consumeSignupEmailCode(
  codeId: string,
  dependencies: Pick<EmailCodeDependencies, "createSupabaseAdminClient" | "now"> = defaultDependencies,
) {
  const admin = dependencies.createSupabaseAdminClient();
  const { error } = await admin
    .from("registration_email_verification_codes")
    .update({ consumed_at: dependencies.now().toISOString() } as never)
    .eq("id", codeId)
    .is("consumed_at", null);

  if (error) {
    throw new Error(`Failed to consume email verification code: ${error.message}`);
  }
}
