import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDryRunPreview,
  buildPublicRegistrationBaselineConfig,
  summarizeBaselineResults,
} from "./load-public-registration-http-baseline-lib";

test("dry-run preview 会隐藏敏感 cookie", () => {
  const config = buildPublicRegistrationBaselineConfig([
    "--base-url=http://127.0.0.1:3000",
    "--verified-cookie=verified-cookie",
    "--ip-limit-cookies=cookie-a|||cookie-b|||cookie-c",
  ]);

  const preview = buildDryRunPreview(config);

  assert.equal(preview.verifiedCookie, "[provided]");
  assert.deepEqual(preview.ipLimitCookies, ["[provided]", "[provided]", "[provided]"]);
});

test("config 会解析 invite_only 和 cookie 列表", () => {
  const config = buildPublicRegistrationBaselineConfig([
    "--expected-registration-mode=invite_only",
    "--ip-limit-cookies=cookie-a|||cookie-b|||cookie-c",
  ]);

  assert.equal(config.expectedRegistrationMode, "invite_only");
  assert.deepEqual(config.ipLimitCookies, ["cookie-a", "cookie-b", "cookie-c"]);
});

test("summary 会正确统计 passed failed blocked", () => {
  const summary = summarizeBaselineResults([
    {
      group: "registration",
      name: "one",
      description: "desc",
      status: "passed",
    },
    {
      group: "registration",
      name: "two",
      description: "desc",
      status: "failed",
      reason: "boom",
    },
    {
      group: "admin-status",
      name: "three",
      description: "desc",
      status: "blocked",
      reason: "missing cookie",
    },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    passed: 1,
    failed: 1,
    blocked: 1,
  });
});
