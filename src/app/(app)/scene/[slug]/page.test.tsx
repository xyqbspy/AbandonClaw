import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

let currentUserId = "user-1";
const requireCurrentProfileCalls: string[] = [];

const mockedModules = {
  "@/lib/server/auth": {
    requireCurrentProfile: async () => {
      requireCurrentProfileCalls.push(currentUserId);
      return { user: { id: currentUserId } };
    },
  },
  "./scene-detail-page": {
    __esModule: true,
    default: () => React.createElement("div", { "data-testid": "scene-detail-client-page" }),
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
  | ((
      props: { params: Promise<{ slug: string }> },
    ) => Promise<React.ReactElement>)
  | null = null;

function getPageModule() {
  if (!PageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: (props: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>;
    };
    PageModule = imported.default;
  }
  return PageModule;
}

afterEach(() => {
  currentUserId = "user-1";
  requireCurrentProfileCalls.length = 0;
  PageModule = null;
});

test("Scene page 会先完成登录校验，再返回客户端场景页", async () => {
  const Page = getPageModule();

  const element = await Page({
    params: Promise.resolve({ slug: "test-scene" }),
  });

  assert.deepEqual(requireCurrentProfileCalls, ["user-1"]);
  assert.equal(typeof element.type, "function");
});
