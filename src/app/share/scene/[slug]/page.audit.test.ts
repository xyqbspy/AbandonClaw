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
  assert.match(pageSource, /redirect\(`\/login\?redirect=\/share\/scene\/\$\{encodeURIComponent\(slug\)\}`\)/);
});

test("share/scene/[slug] 注册按钮链接带 from=share 与 scene slug,便于漏斗归因", () => {
  assert.match(pageSource, /\/register\?from=share&scene=\$\{encodeURIComponent\(slug\)\}/);
});

test("share/scene/[slug] 调 setAnonymousResponseHeaders 屏蔽中间层缓存", () => {
  assert.match(pageSource, /setAnonymousResponseHeaders/);
});

test("share/scene/[slug] 调 detectAnonymousSsrContext 让 SSR 走匿名分支", () => {
  assert.match(pageSource, /detectAnonymousSsrContext/);
});

test("share/scene/[slug] 渲染 AnonymousGuidanceState page=\"chunks\",不暴露写入按钮", () => {
  assert.match(pageSource, /AnonymousGuidanceState/);
  assert.match(pageSource, /page="chunks"/);
});

test("middleware PROTECTED_PAGE_PREFIXES 不包含 /share,允许匿名通过", () => {
  assert.doesNotMatch(middlewareSource, /["']\/share["']/);
});

test("middleware PROTECTED_PAGE_PREFIXES 显式守护 today/scene/scenes/review/chunks 主入口", () => {
  for (const prefix of ["/today", "/scenes", "/scene", "/review", "/chunks", "/progress"]) {
    assert.ok(
      middlewareSource.includes(`"${prefix}"`),
      `middleware missing protected prefix ${prefix}`,
    );
  }
});
