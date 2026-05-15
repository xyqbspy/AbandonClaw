import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthRedirectHref,
  isSafeRedirectTarget,
  resolveSafeRedirectTarget,
} from "./auth-redirect";

test("auth redirect helper 会保留合法站内路径", () => {
  assert.equal(isSafeRedirectTarget("/review"), true);
  assert.equal(resolveSafeRedirectTarget("/review"), "/review");
  assert.equal(buildAuthRedirectHref("/login", "/review"), "/login?redirect=%2Freview");
});

test("auth redirect helper 会拒绝协议相对与外部路径，并默认回退 /today", () => {
  assert.equal(isSafeRedirectTarget("//evil.example"), false);
  assert.equal(isSafeRedirectTarget("https://evil.example"), false);
  assert.equal(resolveSafeRedirectTarget("//evil.example"), "/today");
  assert.equal(buildAuthRedirectHref("/signup", "//evil.example"), "/signup");
});
