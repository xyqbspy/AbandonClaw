import { createClient } from "@supabase/supabase-js";
import { AuthError, ValidationError } from "@/lib/server/errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

type ResendVerificationPayload = {
  email: string;
  emailRedirectTo: string;
};

type ResendVerificationDependencies = {
  createSupabaseAuthClient: () => ReturnType<typeof createClient>;
};

const defaultDependencies: ResendVerificationDependencies = {
  createSupabaseAuthClient: () =>
    createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }),
};

const normalizeEmail = (email: unknown) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export async function resendSignupVerificationEmail(
  payload: ResendVerificationPayload,
  dependencies: ResendVerificationDependencies = defaultDependencies,
) {
  const email = normalizeEmail(payload.email);

  if (!email || !email.includes("@")) {
    throw new ValidationError("email is required.");
  }

  const supabase = dependencies.createSupabaseAuthClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: payload.emailRedirectTo,
    },
  });

  if (error) {
    throw new AuthError(error.message);
  }

  return { email };
}
