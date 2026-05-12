import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminDateTime } from "./admin-format";

test("formatAdminDateTime 会按北京时间输出 admin 时间", () => {
  assert.equal(formatAdminDateTime("2026-05-11T03:27:47.879944+00:00"), "2026/5/11 11:27");
  assert.equal(formatAdminDateTime("2026-05-12T02:42:00.000Z"), "2026/5/12 10:42");
});

test("formatAdminDateTime 遇到空值或非法值返回兜底", () => {
  assert.equal(formatAdminDateTime(null), "-");
  assert.equal(formatAdminDateTime(undefined), "-");
  assert.equal(formatAdminDateTime("bad-date", "未知"), "未知");
});
