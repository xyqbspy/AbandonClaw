import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "..", "..", "..", "..", "..");
const pageSource = readFileSync(
  path.join(projectRoot, "src", "app", "share", "scene", "[slug]", "page.tsx"),
  "utf8",
);
const middlewareSource = readFileSync(
  path.join(projectRoot, "middleware.ts"),
  "utf8",
);

test("share/scene/[slug] 检查 ALLOW_ANONYMOUS_TRIAL 开关", () => {
  assert.match(pageSource, /isAnonymousTrialEnabled\(\)/);
});

test("share/scene/[slug] 开关关闭时 redirect 到 /login,带 redirect 回跳参数", () => {
  assert.match(
    pageSource,
    /redirect\(`\/login\?redirect=\/share\/scene\/\$\{encodeURIComponent\(slug\)\}`\)/,
  );
});

test("share/scene/[slug] 注册按钮链接带 from=share 与 scene slug,便于漏斗归因", () => {
  assert.match(pageSource, /\/register\?from=share&scene=\$\{encodeURIComponent\(slug\)\}/);
});

test("share/scene/[slug] 调 detectAnonymousSsrContext 识别搜索引擎爬虫", () => {
  assert.match(pageSource, /detectAnonymousSsrContext/);
});

test("share/scene/[slug] 搜索引擎爬虫分支仍渲染 AnonymousGuidanceState(只读引导,不触发付费链路)", () => {
  assert.match(pageSource, /isSearchEngineBot/);
  assert.match(pageSource, /AnonymousGuidanceState/);
  assert.match(pageSource, /page="chunks"/);
});

test("share/scene/[slug] SSR 走 getPublicSceneBySlug(走 anon RLS,只回 is_public=true)", () => {
  assert.match(pageSource, /getPublicSceneBySlug/);
});

test("share/scene/[slug] 找不到公开场景时 notFound(),不暴露受保护数据", () => {
  assert.match(pageSource, /notFound\(\)/);
});

test("share/scene/[slug] 把 Lesson 数据传给 ShareScenePreviewClient(真业务路径,不是引导墙)", () => {
  assert.match(pageSource, /ShareScenePreviewClient/);
  assert.match(pageSource, /initialLesson=\{lesson\}/);
});

test("middleware PROTECTED_PAGE_PREFIXES 不包含 /share,允许匿名访问灰度入口", () => {
  // 用 PROTECTED_PAGE_PREFIXES 数组上下文判断,而不是简单字符串匹配,
  // 因为 middleware 现在还有 ANONYMOUS_SHARE_PATH_PREFIX 常量(用于注入 Cache-Control)。
  const protectedArrayMatch = middlewareSource.match(
    /PROTECTED_PAGE_PREFIXES\s*=\s*\[([\s\S]*?)\]/,
  );
  assert.ok(protectedArrayMatch, "middleware 必须定义 PROTECTED_PAGE_PREFIXES 数组");
  assert.doesNotMatch(protectedArrayMatch![1], /["']\/share["']/);
});

test("middleware PROTECTED_PAGE_PREFIXES 显式守护 today/scene/scenes/review/chunks/progress 主入口", () => {
  for (const prefix of ["/today", "/scenes", "/scene", "/review", "/chunks", "/progress"]) {
    assert.ok(
      middlewareSource.includes(`"${prefix}"`),
      `middleware missing protected prefix ${prefix}`,
    );
  }
});

test("middleware 对 /share/* 路径统一注入 Cache-Control: private, no-store(防 CDN 缓存匿名响应)", () => {
  assert.match(
    middlewareSource,
    /ANONYMOUS_SHARE_PATH_PREFIX\s*=\s*["']\/share["']/,
    "middleware 必须以常量声明 ANONYMOUS_SHARE_PATH_PREFIX",
  );
  assert.match(
    middlewareSource,
    /Cache-Control["']\s*,\s*["']private,\s*no-store["']|ANONYMOUS_CACHE_CONTROL\s*=\s*["']private,\s*no-store["']/,
    "middleware 必须把 Cache-Control 设为 'private, no-store'",
  );
  assert.match(
    middlewareSource,
    /isAnonymousSharePath|applyAnonymousCacheHeaders/,
    "middleware 必须在 /share 路径分支调用 share-cache 头注入函数",
  );
});
