import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const mockedModules = {
  "@/lib/server/auth": {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com" }),
  },
  "@/lib/server/admin/service": {
    getAdminOverviewStats: async () => ({
      totalScenes: 1,
      importedScenes: 0,
      totalVariants: 2,
      totalCacheRows: 3,
      latestCacheCreatedAt: null,
      totalUsersWithProgress: 4,
      scenesInProgressCount: 5,
      scenesCompletedCount: 6,
      latestLearningActivityAt: null,
    }),
    getAdminHighCostCapabilityControls: async () => [
      { capability: "practice_generate", disabled: true },
      { capability: "tts_generate", disabled: false },
    ],
  },
  "@/app/(app)/admin/actions": {
    syncSeedScenesAction: async () => {},
    updateAdminHighCostControlAction: async () => {},
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let PageModule:
  | ((props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>)
  | null = null;

const getPageModule = () => {
  if (!PageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: (props: {
        searchParams: Promise<Record<string, string | string[] | undefined>>;
      }) => Promise<React.ReactElement>;
    };
    PageModule = imported.default;
  }
  return PageModule;
};

afterEach(() => {
  PageModule = null;
});

test("/admin 首页会渲染高成本紧急开关", async () => {
  const Page = getPageModule();
  const element = await Page({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(element);

  assert.match(html, /高成本紧急开关/);
  assert.match(html, /练习生成/);
  assert.match(html, /TTS 生成/);
  assert.match(html, /1 个已关闭/);
  assert.match(html, /恢复/);
  assert.match(html, /关闭/);
});
