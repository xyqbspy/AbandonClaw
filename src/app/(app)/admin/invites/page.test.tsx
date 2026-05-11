import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const listAdminInviteCodesCalls: Array<Record<string, unknown>> = [];
const getAdminRegistrationModeStateCalls: Array<true> = [];
let listAdminInviteCodesResult = {
  rows: [
    {
      id: "invite-1",
      maxUses: 2,
      usedCount: 1,
      expiresAt: null,
      isActive: true,
      createdAt: "2026-05-09T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
      attempts: [
        {
          id: "attempt-1",
          email: "rose@example.com",
          status: "used",
          failureReason: null,
          authUserId: "user-1",
          createdAt: "2026-05-09T01:00:00.000Z",
          account: {
            username: "rose",
            accessStatus: "active",
            emailVerified: true,
            studySeconds: 120,
            scenesCompleted: 1,
            reviewItemsCompleted: 2,
            phrasesSaved: 3,
            highCostReserved: 4,
            highCostSuccess: 3,
            highCostFailed: 1,
          },
        },
      ],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

const mockedModules = {
  "@/lib/server/admin/service": {
    getAdminRegistrationModeState: async () => {
      getAdminRegistrationModeStateCalls.push(true);
      return {
        mode: "invite_only",
        source: "runtime",
        updatedBy: "admin-1",
        updatedAt: "2026-05-11T00:00:00.000Z",
      };
    },
    listAdminInviteCodes: async (filters: Record<string, unknown>) => {
      listAdminInviteCodesCalls.push(filters);
      return listAdminInviteCodesResult;
    },
  },
  "@/app/(app)/admin/actions": {
    updateAdminInviteCodeAction: async () => {},
    updateAdminRegistrationModeAction: async () => {},
  },
  "@/app/(app)/admin/invites/invite-code-create-panel": {
    InviteCodeCreatePanel: () => React.createElement("section", null, "生成邀请码"),
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
  listAdminInviteCodesCalls.length = 0;
  getAdminRegistrationModeStateCalls.length = 0;
  listAdminInviteCodesResult = {
    rows: [
      {
        id: "invite-1",
        maxUses: 2,
        usedCount: 1,
        expiresAt: null,
        isActive: true,
        createdAt: "2026-05-09T00:00:00.000Z",
        updatedAt: "2026-05-09T00:00:00.000Z",
        attempts: [
          {
            id: "attempt-1",
            email: "rose@example.com",
            status: "used",
            failureReason: null,
            authUserId: "user-1",
            createdAt: "2026-05-09T01:00:00.000Z",
            account: {
              username: "rose",
              accessStatus: "active",
              emailVerified: true,
              studySeconds: 120,
              scenesCompleted: 1,
              reviewItemsCompleted: 2,
              phrasesSaved: 3,
              highCostReserved: 4,
              highCostSuccess: 3,
              highCostFailed: 1,
            },
          },
        ],
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  };
  PageModule = null;
});

test("/admin/invites 页面会渲染邀请码使用账号与活动摘要", async () => {
  const Page = getPageModule();
  const element = await Page({
    searchParams: Promise.resolve({ page: "1" }),
  });
  const html = renderToStaticMarkup(element);

  assert.deepEqual(listAdminInviteCodesCalls, [{ page: 1, pageSize: 20 }]);
  assert.equal(getAdminRegistrationModeStateCalls.length, 1);
  assert.match(html, /邀请码管理/);
  assert.match(html, /注册模式/);
  assert.match(html, /邀请注册/);
  assert.match(html, /来源：后台配置/);
  assert.match(html, /生成邀请码/);
  assert.match(html, /rose@example.com/);
  assert.match(html, /user-1/);
  assert.match(html, /学习秒数：120/);
  assert.doesNotMatch(html, /AC-TEST/);
});

test("/admin/invites 页面在没有邀请码时会渲染空状态", async () => {
  listAdminInviteCodesResult = {
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

  assert.match(html, /还没有邀请码/);
});
