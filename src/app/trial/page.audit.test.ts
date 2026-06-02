import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "..", "..", "..");
const pageSource = readFileSync(path.join(projectRoot, "src", "app", "trial", "page.tsx"), "utf8");
const scenePageSource = readFileSync(
  path.join(projectRoot, "src", "app", "trial", "scene", "[slug]", "page.tsx"),
  "utf8",
);
const middlewareSource = readFileSync(path.join(projectRoot, "middleware.ts"), "utf8");

test("/trial 检查 ALLOW_ANONYMOUS_TRIAL 开关", () => {
  assert.match(pageSource, /isAnonymousTrialEnabled\(\)/);
  assert.match(scenePageSource, /isAnonymousTrialEnabled\(\)/);
});

test("/trial 列表读取精选公开场景,不走用户态 scenes 列表", () => {
  assert.match(pageSource, /listPublicTrialScenes/);
  assert.doesNotMatch(pageSource, /listScenes\(/);
});

test("/trial/scene/[slug] 复用匿名分享预览 UI,并打开本地练习预览", () => {
  assert.match(scenePageSource, /ShareScenePreviewClient/);
  assert.match(scenePageSource, /showPracticePreview/);
  assert.match(scenePageSource, /backHref="\/trial"/);
});

test("middleware 对 /trial/* 注入匿名 no-store 响应头", () => {
  assert.match(middlewareSource, /ANONYMOUS_TRIAL_PATH_PREFIX\s*=\s*["']\/trial["']/);
  assert.match(middlewareSource, /isAnonymousPublicPath/);
  assert.match(middlewareSource, /applyAnonymousCacheHeaders\(passthrough\)/);
});

test("middleware PROTECTED_PAGE_PREFIXES 仍显式守护主应用入口", () => {
  const protectedArrayMatch = middlewareSource.match(
    /PROTECTED_PAGE_PREFIXES\s*=\s*\[([\s\S]*?)\]/,
  );
  assert.ok(protectedArrayMatch, "middleware 必须定义 PROTECTED_PAGE_PREFIXES 数组");
  assert.doesNotMatch(protectedArrayMatch![1], /["']\/trial["']/);
  for (const prefix of ["/today", "/scenes", "/scene", "/review", "/chunks", "/progress"]) {
    assert.ok(
      protectedArrayMatch![1].includes(`"${prefix}"`),
      `middleware missing protected prefix ${prefix}`,
    );
  }
});
