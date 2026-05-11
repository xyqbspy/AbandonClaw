import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { RateLimitError, ValidationError } from "@/lib/server/errors";
import {
  consumeSignupEmailCode,
  hashSignupEmailCode,
  issueSignupEmailCode,
  verifySignupEmailCode,
} from "./signup-email-code";

const originalSecret = process.env.EMAIL_VERIFICATION_CODE_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.EMAIL_VERIFICATION_CODE_SECRET;
  } else {
    process.env.EMAIL_VERIFICATION_CODE_SECRET = originalSecret;
  }
});

function createDb(rows: Array<Record<string, unknown>> = []) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  const client = {
    from: (table: string) => {
      assert.equal(table, "registration_email_verification_codes");
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: rows[0] ?? null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          inserts.push(payload);
          return {
            select: () => ({
              single: async () => ({
                data: { id: "code-1" },
                error: null,
              }),
            }),
          };
        },
        update: (payload: Record<string, unknown>) => {
          updates.push(payload);
          return {
            eq: () => ({
              is: async () => ({ error: null }),
            }),
          };
        },
      };
    },
  };

  return {
    client,
    inserts,
    updates,
  };
}

test("issueSignupEmailCode stores hash and sends code", async () => {
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "test-secret";
  const db = createDb();
  let sent: { email: string; code: string } | null = null;

  const result = await issueSignupEmailCode(
    { email: " USER@example.com " },
    {
      createSupabaseAdminClient: () => db.client as never,
      now: () => new Date("2026-05-11T00:00:00.000Z"),
      randomCode: () => "123456",
      sendSignupEmailCode: async (payload) => {
        sent = payload;
      },
    },
  );

  assert.equal(result.email, "user@example.com");
  assert.equal(result.expiresInSeconds, 600);
  assert.equal(db.inserts[0]?.email, "user@example.com");
  assert.equal(db.inserts[0]?.code_hash, hashSignupEmailCode("user@example.com", "123456"));
  assert.notEqual(db.inserts[0]?.code_hash, "123456");
  assert.deepEqual(sent, { email: "user@example.com", code: "123456" });
});

test("issueSignupEmailCode enforces resend cooldown", async () => {
  const db = createDb([
    {
      id: "code-1",
      email: "user@example.com",
      code_hash: "hash",
      expires_at: "2026-05-11T00:10:00.000Z",
      consumed_at: null,
      attempt_count: 0,
      max_attempts: 5,
      last_sent_at: "2026-05-11T00:00:30.000Z",
    },
  ]);

  await assert.rejects(
    () =>
      issueSignupEmailCode(
        { email: "user@example.com" },
        {
          createSupabaseAdminClient: () => db.client as never,
          now: () => new Date("2026-05-11T00:01:00.000Z"),
          randomCode: () => "123456",
          sendSignupEmailCode: async () => {},
        },
      ),
    (error: unknown) => error instanceof RateLimitError,
  );
});

test("verifySignupEmailCode accepts latest valid code", async () => {
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "test-secret";
  const db = createDb([
    {
      id: "code-1",
      email: "user@example.com",
      code_hash: hashSignupEmailCode("user@example.com", "123456"),
      expires_at: "2026-05-11T00:10:00.000Z",
      consumed_at: null,
      attempt_count: 0,
      max_attempts: 5,
      last_sent_at: "2026-05-11T00:00:00.000Z",
    },
  ]);

  const result = await verifySignupEmailCode(
    { email: "user@example.com", code: "123456" },
    {
      createSupabaseAdminClient: () => db.client as never,
      now: () => new Date("2026-05-11T00:01:00.000Z"),
    },
  );

  assert.deepEqual(result, { id: "code-1", email: "user@example.com" });
});

test("verifySignupEmailCode increments attempts for wrong code", async () => {
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "test-secret";
  const db = createDb([
    {
      id: "code-1",
      email: "user@example.com",
      code_hash: hashSignupEmailCode("user@example.com", "123456"),
      expires_at: "2026-05-11T00:10:00.000Z",
      consumed_at: null,
      attempt_count: 1,
      max_attempts: 5,
      last_sent_at: "2026-05-11T00:00:00.000Z",
    },
  ]);

  await assert.rejects(
    () =>
      verifySignupEmailCode(
        { email: "user@example.com", code: "000000" },
        {
          createSupabaseAdminClient: () => db.client as never,
          now: () => new Date("2026-05-11T00:01:00.000Z"),
        },
      ),
    (error: unknown) => error instanceof ValidationError,
  );

  assert.deepEqual(db.updates[0], { attempt_count: 2 });
});

test("verifySignupEmailCode rejects expired code", async () => {
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "test-secret";
  const db = createDb([
    {
      id: "code-1",
      email: "user@example.com",
      code_hash: hashSignupEmailCode("user@example.com", "123456"),
      expires_at: "2026-05-11T00:00:30.000Z",
      consumed_at: null,
      attempt_count: 0,
      max_attempts: 5,
      last_sent_at: "2026-05-11T00:00:00.000Z",
    },
  ]);

  await assert.rejects(
    () =>
      verifySignupEmailCode(
        { email: "user@example.com", code: "123456" },
        {
          createSupabaseAdminClient: () => db.client as never,
          now: () => new Date("2026-05-11T00:01:00.000Z"),
        },
      ),
    (error: unknown) => error instanceof ValidationError,
  );
});

test("verifySignupEmailCode rejects consumed or missing active code", async () => {
  const db = createDb([]);

  await assert.rejects(
    () =>
      verifySignupEmailCode(
        { email: "user@example.com", code: "123456" },
        {
          createSupabaseAdminClient: () => db.client as never,
          now: () => new Date("2026-05-11T00:01:00.000Z"),
        },
      ),
    (error: unknown) => error instanceof ValidationError,
  );
});

test("verifySignupEmailCode rejects code after max attempts", async () => {
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "test-secret";
  const db = createDb([
    {
      id: "code-1",
      email: "user@example.com",
      code_hash: hashSignupEmailCode("user@example.com", "123456"),
      expires_at: "2026-05-11T00:10:00.000Z",
      consumed_at: null,
      attempt_count: 5,
      max_attempts: 5,
      last_sent_at: "2026-05-11T00:00:00.000Z",
    },
  ]);

  await assert.rejects(
    () =>
      verifySignupEmailCode(
        { email: "user@example.com", code: "123456" },
        {
          createSupabaseAdminClient: () => db.client as never,
          now: () => new Date("2026-05-11T00:01:00.000Z"),
        },
      ),
    (error: unknown) => error instanceof ValidationError,
  );
});

test("consumeSignupEmailCode marks code consumed", async () => {
  const db = createDb();

  await consumeSignupEmailCode("code-1", {
    createSupabaseAdminClient: () => db.client as never,
    now: () => new Date("2026-05-11T00:01:00.000Z"),
  });

  assert.deepEqual(db.updates[0], {
    consumed_at: "2026-05-11T00:01:00.000Z",
  });
});
