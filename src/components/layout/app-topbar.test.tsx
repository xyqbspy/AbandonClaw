import assert from "node:assert/strict";
import test from "node:test";
import { resolveTopbarBreadcrumb } from "./app-topbar-breadcrumb";

test("resolveTopbarBreadcrumb 会为普通学习页输出全局面包屑", () => {
  assert.deepEqual(resolveTopbarBreadcrumb("/today"), [
    { label: "学习空间" },
    { label: "今日学习", active: true },
  ]);
  assert.deepEqual(resolveTopbarBreadcrumb("/chunks"), [
    { label: "学习空间" },
    { label: "表达库", active: true },
  ]);
});

test("resolveTopbarBreadcrumb 会为详情页输出所属模块", () => {
  assert.deepEqual(resolveTopbarBreadcrumb("/scene/dinner-plan-cancelled"), [
    { label: "场景" },
    { label: "学习详情", active: true },
  ]);
});

test("resolveTopbarBreadcrumb 会为 admin 页输出管理后台面包屑", () => {
  assert.deepEqual(resolveTopbarBreadcrumb("/admin"), [
    { label: "管理后台" },
    { label: "总览", active: true },
  ]);
  assert.deepEqual(resolveTopbarBreadcrumb("/admin/observability"), [
    { label: "管理后台" },
    { label: "可观测性", active: true },
  ]);
});
