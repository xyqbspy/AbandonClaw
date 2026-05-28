import assert from "node:assert/strict";
import test from "node:test";
import { isAnonymousTrialEnabled } from "./env-gate";

const ORIGINAL = process.env.ALLOW_ANONYMOUS_TRIAL;

const restore = () => {
  if (ORIGINAL === undefined) {
    delete process.env.ALLOW_ANONYMOUS_TRIAL;
  } else {
    process.env.ALLOW_ANONYMOUS_TRIAL = ORIGINAL;
  }
};

test("isAnonymousTrialEnabled 默认关闭(env 未设置)", () => {
  delete process.env.ALLOW_ANONYMOUS_TRIAL;
  assert.equal(isAnonymousTrialEnabled(), false);
  restore();
});

test("isAnonymousTrialEnabled 接受 true / 1 / on(大小写不敏感)", () => {
  for (const value of ["true", "TRUE", "1", "on", "On"]) {
    process.env.ALLOW_ANONYMOUS_TRIAL = value;
    assert.equal(isAnonymousTrialEnabled(), true, `expected ${value} -> true`);
  }
  restore();
});

test("isAnonymousTrialEnabled 对其他值统一返 false", () => {
  for (const value of ["false", "0", "off", "yes", "  ", ""]) {
    process.env.ALLOW_ANONYMOUS_TRIAL = value;
    assert.equal(isAnonymousTrialEnabled(), false, `expected ${value} -> false`);
  }
  restore();
});
