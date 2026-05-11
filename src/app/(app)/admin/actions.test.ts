import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenError } from "@/lib/server/errors";
import { handleUpdateAdminUserAccessStatusAction } from "./actions";

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
