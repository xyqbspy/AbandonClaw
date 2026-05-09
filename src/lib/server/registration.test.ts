import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { AuthError, ValidationError } from "@/lib/server/errors";
import {
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
