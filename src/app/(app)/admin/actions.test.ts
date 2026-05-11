import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenError, ValidationError } from "@/lib/server/errors";
import {
  handleCreateAdminInviteCodesAction,
  handleUpdateAdminRegistrationModeAction,
  handleUpdateAdminInviteCodeAction,
  handleUpdateAdminUserAccessStatusAction,
} from "./actions";

const createFormData = (accessStatus: string) => {
  const formData = new FormData();
  formData.set("userId", "user-1");
  formData.set("accessStatus", accessStatus);
  formData.set("returnTo", "/admin/users?page=2");
  return formData;
};

test("admin 用户状态 action 会拒绝非管理员调用", async () => {
  await assert.rejects(
    () =>
      handleUpdateAdminUserAccessStatusAction(createFormData("active"), {
        requireAdmin: async () => {
          throw new ForbiddenError();
        },
        updateAdminUserAccessStatus: async () => {
          throw new Error("should not reach update");
        },
        redirect: ((href: string) => href) as never,
        revalidatePath: (() => {}) as never,
      }),
    ForbiddenError,
  );
});

test("admin 用户状态 action 会把非法状态收口为 danger notice", async () => {
  let updateCalled = false;

  const href = await handleUpdateAdminUserAccessStatusAction(createFormData("invalid"), {
    requireAdmin: async () => ({ id: "admin-1" } as never),
    updateAdminUserAccessStatus: async () => {
      updateCalled = true;
      throw new Error("should not reach update");
    },
    redirect: ((nextHref: string) => nextHref) as never,
    revalidatePath: (() => {}) as never,
  });

  const url = new URL(href, "http://localhost");
  assert.equal(updateCalled, false);
  assert.equal(url.pathname, "/admin/users");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("noticeTone"), "danger");
  assert.equal(url.searchParams.get("notice"), "账号状态无效，请重试。");
});

test("admin 用户状态 action 成功后会刷新后台页面并返回成功提示", async () => {
  const revalidatedPaths: string[] = [];
  let updatedParams:
    | {
        userId: string;
        accessStatus: string;
      }
    | undefined;

  const href = await handleUpdateAdminUserAccessStatusAction(createFormData("readonly"), {
    requireAdmin: async () => ({ id: "admin-1" } as never),
    updateAdminUserAccessStatus: async (params) => {
      updatedParams = params;
      return {
        userId: params.userId,
        username: "rose",
        accessStatus: params.accessStatus,
      };
    },
    redirect: ((nextHref: string) => nextHref) as never,
    revalidatePath: ((path: string) => {
      revalidatedPaths.push(path);
    }) as never,
  });

  const url = new URL(href, "http://localhost");
  assert.deepEqual(updatedParams, {
    userId: "user-1",
    accessStatus: "readonly",
  });
  assert.deepEqual(revalidatedPaths, ["/admin", "/admin/users"]);
  assert.equal(url.pathname, "/admin/users");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("noticeTone"), "success");
  assert.equal(url.searchParams.get("notice"), "账号状态已更新。");
});

test("admin 邀请码创建 action 会拒绝非管理员调用", async () => {
  await assert.rejects(
    () =>
      handleCreateAdminInviteCodesAction(
        { notice: null, tone: "success", codes: [] },
        new FormData(),
        {
          requireAdmin: async () => {
            throw new ForbiddenError();
          },
          createAdminInviteCodes: async () => {
            throw new Error("should not create invite codes");
          },
          revalidatePath: (() => {}) as never,
        },
      ),
    ForbiddenError,
  );
});

test("admin 邀请码创建 action 成功后返回本次明文", async () => {
  const formData = new FormData();
  formData.set("mode", "auto");
  formData.set("count", "2");
  const revalidatedPaths: string[] = [];

  const state = await handleCreateAdminInviteCodesAction(
    { notice: null, tone: "success", codes: [] },
    formData,
    {
      requireAdmin: async () => ({ id: "admin-1" } as never),
      createAdminInviteCodes: async (input) => [
        {
          id: "invite-1",
          code: `code-${input.count}`,
          maxUses: 1,
          expiresAt: null,
        },
      ],
      revalidatePath: ((path: string) => {
        revalidatedPaths.push(path);
      }) as never,
    },
  );

  assert.equal(state.tone, "success");
  assert.equal(state.codes[0]?.code, "code-2");
  assert.deepEqual(revalidatedPaths, ["/admin", "/admin/invites"]);
});

test("admin 邀请码更新 action 会停用邀请码并返回提示", async () => {
  const formData = new FormData();
  formData.set("inviteCodeId", "invite-1");
  formData.set("inviteAction", "deactivate");
  formData.set("returnTo", "/admin/invites?page=2");
  const revalidatedPaths: string[] = [];
  let updatedParams:
    | {
        inviteCodeId: string;
        isActive?: boolean;
      }
    | undefined;

  const href = await handleUpdateAdminInviteCodeAction(formData, {
    requireAdmin: async () => ({ id: "admin-1" } as never),
    updateAdminInviteCode: async (params) => {
      updatedParams = params;
      return { inviteCodeId: params.inviteCodeId };
    },
    redirect: ((nextHref: string) => nextHref) as never,
    revalidatePath: ((path: string) => {
      revalidatedPaths.push(path);
    }) as never,
  });

  const url = new URL(href, "http://localhost");
  assert.equal(updatedParams?.inviteCodeId, "invite-1");
  assert.equal(updatedParams?.isActive, false);
  assert.deepEqual(revalidatedPaths, ["/admin", "/admin/invites"]);
  assert.equal(url.pathname, "/admin/invites");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("noticeTone"), "success");
});

test("admin 注册模式 action 会拒绝非管理员调用", async () => {
  await assert.rejects(
    () =>
      handleUpdateAdminRegistrationModeAction(new FormData(), {
        requireAdmin: async () => {
          throw new ForbiddenError();
        },
        updateAdminRegistrationMode: async () => {
          throw new Error("should not update registration mode");
        },
        redirect: ((href: string) => href) as never,
        revalidatePath: (() => {}) as never,
      }),
    ForbiddenError,
  );
});

test("admin 注册模式 action 成功后刷新注册相关页面", async () => {
  const formData = new FormData();
  formData.set("registrationMode", "invite_only");
  formData.set("returnTo", "/admin/invites");
  const revalidatedPaths: string[] = [];
  let updatedParams:
    | {
        mode: string;
        updatedBy: string;
      }
    | undefined;

  const href = await handleUpdateAdminRegistrationModeAction(formData, {
    requireAdmin: async () => ({ id: "admin-1" } as never),
    updateAdminRegistrationMode: async (params) => {
      updatedParams = params;
      return { mode: params.mode };
    },
    redirect: ((nextHref: string) => nextHref) as never,
    revalidatePath: ((path: string) => {
      revalidatedPaths.push(path);
    }) as never,
  });

  const url = new URL(href, "http://localhost");
  assert.deepEqual(updatedParams, {
    mode: "invite_only",
    updatedBy: "admin-1",
  });
  assert.deepEqual(revalidatedPaths, ["/admin", "/admin/invites", "/signup"]);
  assert.equal(url.pathname, "/admin/invites");
  assert.equal(url.searchParams.get("noticeTone"), "success");
});

test("admin 注册模式 action 会把非法模式收口为 danger notice", async () => {
  const formData = new FormData();
  formData.set("registrationMode", "bad");
  let updateCalled = false;

  const href = await handleUpdateAdminRegistrationModeAction(formData, {
    requireAdmin: async () => ({ id: "admin-1" } as never),
    updateAdminRegistrationMode: async () => {
      updateCalled = true;
      throw new ValidationError("bad");
    },
    redirect: ((nextHref: string) => nextHref) as never,
    revalidatePath: (() => {}) as never,
  });

  const url = new URL(href, "http://localhost");
  assert.equal(updateCalled, true);
  assert.equal(url.searchParams.get("noticeTone"), "danger");
});
