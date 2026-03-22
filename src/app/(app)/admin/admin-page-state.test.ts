import assert from "node:assert/strict";
import test from "node:test";
import {
  appendAdminNotice,
  buildAdminHref,
  normalizeAdminReturnTo,
  readAdminNotice,
} from "@/app/(app)/admin/admin-page-state";

test("buildAdminHref 会忽略空查询并稳定拼接参数", () => {
  assert.equal(
    buildAdminHref("/admin/phrases", { q: "hello", itemType: "chunk", page: 2, empty: "" }),
    "/admin/phrases?q=hello&itemType=chunk&page=2",
  );
});

test("normalizeAdminReturnTo 只接受 admin 站内路径", () => {
  assert.equal(normalizeAdminReturnTo("/admin/scenes?page=2", "/admin"), "/admin/scenes?page=2");
  assert.equal(normalizeAdminReturnTo("https://example.com", "/admin"), "/admin");
});

test("appendAdminNotice 和 readAdminNotice 会稳定读写提示", () => {
  const href = appendAdminNotice("/admin/phrases?page=2", "已补全 3 条", "success");
  assert.equal(href, "/admin/phrases?page=2&notice=%E5%B7%B2%E8%A1%A5%E5%85%A8+3+%E6%9D%A1&noticeTone=success");
  assert.deepEqual(
    readAdminNotice({ notice: "已补全 3 条", noticeTone: "success" }),
    { notice: "已补全 3 条", tone: "success" },
  );
});
