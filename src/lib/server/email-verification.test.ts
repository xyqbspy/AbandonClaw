import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, ValidationError } from "@/lib/server/errors";
import { resendSignupVerificationEmail } from "./email-verification";

test("resendSignupVerificationEmail calls Supabase resend with signup callback", async () => {
  let resendPayload: unknown = null;

  const result = await resendSignupVerificationEmail(
    {
      email: " USER@example.com ",
      emailRedirectTo: "https://app.example.com/auth/callback?next=%2Fscenes",
    },
    {
      createSupabaseAuthClient: () =>
        ({
          auth: {
            resend: async (payload: unknown) => {
              resendPayload = payload;
              return { error: null };
            },
          },
        }) as never,
    },
  );

  assert.deepEqual(result, { email: "user@example.com" });
  assert.deepEqual(resendPayload, {
    type: "signup",
    email: "user@example.com",
    options: {
      emailRedirectTo: "https://app.example.com/auth/callback?next=%2Fscenes",
    },
  });
});

test("resendSignupVerificationEmail rejects invalid email before Supabase call", async () => {
  let called = false;

  await assert.rejects(
    () =>
      resendSignupVerificationEmail(
        {
          email: "invalid",
          emailRedirectTo: "https://app.example.com/auth/callback?next=%2Fscenes",
        },
        {
          createSupabaseAuthClient: () =>
            ({
              auth: {
                resend: async () => {
                  called = true;
                  return { error: null };
                },
              },
            }) as never,
        },
      ),
    (error: unknown) => error instanceof ValidationError,
  );

  assert.equal(called, false);
});

test("resendSignupVerificationEmail wraps Supabase resend error", async () => {
  await assert.rejects(
    () =>
      resendSignupVerificationEmail(
        {
          email: "user@example.com",
          emailRedirectTo: "https://app.example.com/auth/callback?next=%2Fscenes",
        },
        {
          createSupabaseAuthClient: () =>
            ({
              auth: {
                resend: async () => ({ error: { message: "email provider failed" } }),
              },
            }) as never,
        },
      ),
    (error: unknown) => error instanceof AuthError,
  );
});
