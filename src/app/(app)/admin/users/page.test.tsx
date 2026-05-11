import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const listAdminUsersCalls: Array<Record<string, unknown>> = [];
let listAdminUsersResult = {
  rows: [
    {
      userId: "user-1",
      email: "rose@example.com",
      username: "rose",
      accessStatus: "generation_limited",
      createdAt: "2026-05-09T02:00:00.000Z",
    },
  ],
  total: 1,
  page: 2,
  pageSize: 20,
};

const mockedModules = {
  "@/lib/server/admin/service": {
    listAdminUsers: async (filters: Record<string, unknown>) => {
      listAdminUsersCalls.push(filters);
      return listAdminUsersResult;
    },
  },
  "@/app/(app)/admin/actions": {
    updateAdminUserAccessStatusAction: async () => {},
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
      props: { searchParams: Promise<Record<string, string | string[] | undefined>> },
    ) => Promise<React.ReactElement>)
  | null = null;

const getPageModule = () => {
  if (!PageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: (
        props: { searchParams: Promise<Record<string, string | string[] | undefined>> },
      ) => Promise<React.ReactElement>;
    };
    PageModule = imported.default;
  }
  return PageModule;
};

afterEach(() => {
  listAdminUsersCalls.length = 0;
  listAdminUsersResult = {
    rows: [
      {
        userId: "user-1",
        email: "rose@example.com",
        username: "rose",
        accessStatus: "generation_limited",
        createdAt: "2026-05-09T02:00:00.000Z",
      },
    ],
    total: 1,
    page: 2,
    pageSize: 20,
  };
  PageModule = null;
});

test("/admin/users 页面会按 searchParams 拉取并渲染最小用户处置列表", async () => {
  const Page = getPageModule();
  const element = await Page({
    searchParams: Promise.resolve({
      q: "rose",
      accessStatus: "generation_limited",
      page: "2",
    }),
  });
  const html = renderToStaticMarkup(element);

  assert.deepEqual(listAdminUsersCalls, [
    {
      q: "rose",
      accessStatus: "generation_limited",
      page: 2,
      pageSize: 20,
    },
  ]);
  assert.match(html, /用户状态管理/);
  assert.match(html, /rose@example.com/);
  assert.match(html, /限制生成/);
  assert.match(html, /更新状态/);
  assert.match(html, /page=2/);
});

test("/admin/users 页面在没有结果时会渲染空状态", async () => {
  listAdminUsersResult = {
    rows: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };

  const Page = getPageModule();
  const element = await Page({
    searchParams: Promise.resolve({}),
  });
  const html = renderToStaticMarkup(element);

  assert.match(html, /未找到匹配的用户/);
});
