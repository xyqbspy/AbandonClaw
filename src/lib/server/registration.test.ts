import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { AuthError, ValidationError } from "@/lib/server/errors";
import {
  getEffectiveRegistrationMode,
  getRegistrationMode,
  hashInviteCode,
  normalizeInviteCode,
  registerWithEmailPassword,
} from "./registration";

const originalMode = process.env.REGISTRATION_MODE;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.REGISTRATION_MODE;
  } else {
    process.env.REGISTRATION_MODE = originalMode;
  }
});

test("getRegistrationMode defaults to closed for missing or invalid values", () => {
  delete process.env.REGISTRATION_MODE;
  assert.equal(getRegistrationMode(), "closed");

  process.env.REGISTRATION_MODE = "bad-value";
  assert.equal(getRegistrationMode(), "closed");
});

test("getRegistrationMode accepts supported public registration modes", () => {
  process.env.REGISTRATION_MODE = "invite_only";
  assert.equal(getRegistrationMode(), "invite_only");

  process.env.REGISTRATION_MODE = "open";
  assert.equal(getRegistrationMode(), "open");
});

test("getEffectiveRegistrationMode prefers runtime setting", async () => {
  process.env.REGISTRATION_MODE = "closed";

  const result = await getEffectiveRegistrationMode({
    createSupabaseAdminClient: () =>
      ({
        from: (table: string) => {
          assert.equal(table, "app_runtime_settings");
          return {
            select: () => ({
              eq: (_column: string, key: string) => {
                assert.equal(key, "registration_mode");
                return {
                  maybeSingle: async () => ({
                    data: {
                      value: "invite_only",
                      updated_by: "admin-1",
                      updated_at: "2026-05-11T00:00:00.000Z",
                    },
                    error: null,
                  }),
                };
              },
            }),
          };
        },
      }) as never,
  });

  assert.deepEqual(result, {
    mode: "invite_only",
    source: "runtime",
    updatedBy: "admin-1",
    updatedAt: "2026-05-11T00:00:00.000Z",
  });
});

test("getEffectiveRegistrationMode falls back to env and default closed", async () => {
  process.env.REGISTRATION_MODE = "open";

  const envResult = await getEffectiveRegistrationMode({
    createSupabaseAdminClient: () =>
      ({
        from: () => {
          throw new Error("missing table");
        },
      }) as never,
  });
  assert.equal(envResult.mode, "open");
  assert.equal(envResult.source, "environment");

  process.env.REGISTRATION_MODE = "bad";
  const defaultResult = await getEffectiveRegistrationMode({
    createSupabaseAdminClient: () =>
      ({
        from: () => {
          throw new Error("missing table");
        },
      }) as never,
  });
  assert.equal(defaultResult.mode, "closed");
  assert.equal(defaultResult.source, "default");
});

test("invite code hash is stable and never stores trimmed plaintext", () => {
  assert.equal(normalizeInviteCode("  abc123  "), "abc123");
  assert.equal(hashInviteCode("abc123"), hashInviteCode("  abc123  "));
  assert.notEqual(hashInviteCode("abc123"), "abc123");
});

test("registerWithEmailPassword rejects closed registration before creating auth user", async () => {
  process.env.REGISTRATION_MODE = "closed";

  await assert.rejects(
    () =>
      registerWithEmailPassword({
        email: "user@example.com",
        password: "password123",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.message, "Registration is currently closed.");
      return true;
    },
  );
});

test("registerWithEmailPassword validates basic signup input", async () => {
  process.env.REGISTRATION_MODE = "open";

  await assert.rejects(
    () =>
      registerWithEmailPassword({
        email: "invalid",
        password: "password123",
      }),
    (error: unknown) => error instanceof ValidationError,
  );
});
