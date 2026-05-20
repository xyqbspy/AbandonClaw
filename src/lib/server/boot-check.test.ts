import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { DAILY_QUOTA_KEY_COUNT, getBootCheckSnapshot } from "./boot-check";

const TRACKED_ENV_KEYS = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_VERIFICATION_CODE_SECRET",
  "APP_ORIGIN",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "REGISTRATION_IP_LIMIT_MAX_ATTEMPTS",
  "REGISTRATION_IP_LIMIT_WINDOW_SECONDS",
  "REGISTRATION_MODE",
  "CSP_ENFORCE",
  "DAILY_QUOTA_PRACTICE_GENERATE",
  "DAILY_QUOTA_SCENE_GENERATE",
  "DAILY_QUOTA_SIMILAR_GENERATE",
  "DAILY_QUOTA_EXPRESSION_MAP_GENERATE",
  "DAILY_QUOTA_EXPLAIN_SELECTION",
  "DAILY_QUOTA_TTS_GENERATE",
  "DAILY_QUOTA_TTS_REGENERATE",
] as const;

const originalEnv = Object.fromEntries(
  TRACKED_ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof TRACKED_ENV_KEYS)[number], string | undefined>;

const clearTrackedEnv = () => {
  for (const key of TRACKED_ENV_KEYS) {
    delete process.env[key];
  }
};

afterEach(() => {
  for (const key of TRACKED_ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("getBootCheckSnapshot only exposes boolean readiness and modes", () => {
  clearTrackedEnv();
  process.env.NEXT_PUBLIC_SENTRY_DSN = "https://secret@example.ingest.sentry.io/1";
  process.env.UPSTASH_REDIS_REST_URL = "https://secret-upstash.example";
  process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
  process.env.RESEND_API_KEY = "secret-resend";
  process.env.EMAIL_FROM = "noreply@example.com";
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "secret-code";
  process.env.APP_ORIGIN = "https://app.example.com";
  process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS = "5";
  process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS = "300";
  process.env.REGISTRATION_MODE = "invite_only";
  process.env.CSP_ENFORCE = "true";

  assert.deepEqual(getBootCheckSnapshot(), {
    sentry: true,
    upstash: true,
    resend: true,
    emailFrom: true,
    emailVerificationSecret: true,
    appOrigin: true,
    registrationIpLimit: "custom",
    dailyQuotaOverrides: 0,
    registrationMode: "invite_only",
    cspMode: "enforce",
  });
});

test("getBootCheckSnapshot reports unset and default fallbacks", () => {
  clearTrackedEnv();

  assert.deepEqual(getBootCheckSnapshot(), {
    sentry: false,
    upstash: false,
    resend: false,
    emailFrom: false,
    emailVerificationSecret: false,
    appOrigin: false,
    registrationIpLimit: "default",
    dailyQuotaOverrides: 0,
    registrationMode: "unset",
    cspMode: "report-only",
  });
});

test("appOrigin treats any of APP_ORIGIN / NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL as configured", () => {
  clearTrackedEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.example.com";
  assert.equal(getBootCheckSnapshot().appOrigin, true);

  clearTrackedEnv();
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  assert.equal(getBootCheckSnapshot().appOrigin, true);

  clearTrackedEnv();
  process.env.APP_ORIGIN = "https://app.example.com";
  assert.equal(getBootCheckSnapshot().appOrigin, true);

  clearTrackedEnv();
  process.env.APP_ORIGIN = "   ";
  assert.equal(getBootCheckSnapshot().appOrigin, false);
});

test("registrationIpLimit flips to custom when either limit env is set", () => {
  clearTrackedEnv();
  process.env.REGISTRATION_IP_LIMIT_MAX_ATTEMPTS = "10";
  assert.equal(getBootCheckSnapshot().registrationIpLimit, "custom");

  clearTrackedEnv();
  process.env.REGISTRATION_IP_LIMIT_WINDOW_SECONDS = "600";
  assert.equal(getBootCheckSnapshot().registrationIpLimit, "custom");

  clearTrackedEnv();
  assert.equal(getBootCheckSnapshot().registrationIpLimit, "default");
});

test("dailyQuotaOverrides counts only non-empty overrides up to total quota keys", () => {
  clearTrackedEnv();
  assert.equal(getBootCheckSnapshot().dailyQuotaOverrides, 0);

  process.env.DAILY_QUOTA_PRACTICE_GENERATE = "20";
  process.env.DAILY_QUOTA_TTS_GENERATE = "80";
  process.env.DAILY_QUOTA_TTS_REGENERATE = "   "; // whitespace should not count
  assert.equal(getBootCheckSnapshot().dailyQuotaOverrides, 2);

  for (const key of [
    "DAILY_QUOTA_PRACTICE_GENERATE",
    "DAILY_QUOTA_SCENE_GENERATE",
    "DAILY_QUOTA_SIMILAR_GENERATE",
    "DAILY_QUOTA_EXPRESSION_MAP_GENERATE",
    "DAILY_QUOTA_EXPLAIN_SELECTION",
    "DAILY_QUOTA_TTS_GENERATE",
    "DAILY_QUOTA_TTS_REGENERATE",
  ]) {
    process.env[key] = "1";
  }
  assert.equal(getBootCheckSnapshot().dailyQuotaOverrides, DAILY_QUOTA_KEY_COUNT);
});

test("snapshot never leaks raw secret values", () => {
  clearTrackedEnv();
  process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc-secret@example/1";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-abc-secret";
  process.env.RESEND_API_KEY = "resend-abc-secret";
  process.env.EMAIL_VERIFICATION_CODE_SECRET = "code-abc-secret";

  const serialized = JSON.stringify(getBootCheckSnapshot());
  assert.doesNotMatch(serialized, /abc-secret/);
});
