import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

let currentUser: { id: string } | null = null;
const redirectCalls: string[] = [];

const mockedModules = {
  "next/navigation": {
    redirect: (target: string) => {
      redirectCalls.push(target);
      throw new Error(`REDIRECT:${target}`);
    },
  },
  "@/lib/server/auth": {
    getCurrentUser: async () => currentUser,
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

let AuthLayout: ((props: { children: React.ReactNode }) => Promise<React.ReactNode>) | null = null;

const getAuthLayout = () => {
  if (!AuthLayout) {
    const modulePath = localRequire.resolve("./layout");
    delete localRequire.cache[modulePath];
    AuthLayout = localRequire("./layout").default;
  }
  return AuthLayout;
};

afterEach(() => {
  currentUser = null;
  redirectCalls.length = 0;
  AuthLayout = null;
});

test("AuthLayout 对已登录用户默认重定向到 /today", async () => {
  currentUser = { id: "user-1" };

  await assert.rejects(
    () => getAuthLayout()({ children: React.createElement("div", null, "child") }),
    /REDIRECT:\/today/,
  );
  assert.deepEqual(redirectCalls, ["/today"]);
});

test("AuthLayout 对未登录用户渲染 auth 容器", async () => {
  const element = await getAuthLayout()({
    children: React.createElement("div", { id: "child" }, "child"),
  });

  assert.ok(React.isValidElement(element));
  assert.equal((element as React.ReactElement).type, "main");
});
