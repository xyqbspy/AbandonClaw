import assert from "node:assert/strict";
import test from "node:test";
import { listAdminUsers, updateAdminUserAccessStatus } from "./service";

type AuthUserRow = {
  id: string;
  email?: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  access_status?: "active" | "disabled" | "generation_limited" | "readonly";
};

const createListDependencies = (params: {
  authUsers: AuthUserRow[];
  profiles: ProfileRow[];
}) =>
  ({
    createSupabaseAdminClient: () =>
      ({
        auth: {
          admin: {
            listUsers: async ({ page, perPage }: { page: number; perPage: number }) => ({
              data: {
                users: params.authUsers.slice((page - 1) * perPage, page * perPage),
              },
              error: null,
            }),
          },
        },
        from: (table: string) => {
          assert.equal(table, "profiles");
          return {
            select: () => ({
              in: async (_column: string, ids: string[]) => ({
                data: params.profiles.filter((row) => ids.includes(row.id)),
                error: null,
              }),
            }),
          };
        },
      }) as never,
  }) as const;

const createUpdateDependencies = (params: {
  result: ProfileRow | null;
  onUpdate?: (payload: Record<string, unknown>, userId: string) => void;
}) =>
  ({
    createSupabaseAdminClient: () =>
      ({
        from: (table: string) => {
          assert.equal(table, "profiles");
          return {
            update: (payload: Record<string, unknown>) => ({
              eq: (_column: string, userId: string) => ({
                select: () => ({
                  maybeSingle: async () => {
                    params.onUpdate?.(payload, userId);
                    return {
                      data: params.result,
                      error: null,
                    };
                  },
                }),
              }),
            }),
          };
        },
      }) as never,
  }) as const;

test("listAdminUsers 会按 q 和 accessStatus 返回最小用户列表", async () => {
  const result = await listAdminUsers(
    {
      q: "rose",
      accessStatus: "generation_limited",
      page: 1,
      pageSize: 10,
    },
    createListDependencies({
      authUsers: [
        {
          id: "user-1",
          email: "rose@example.com",
          created_at: "2026-05-09T02:00:00.000Z",
        },
        {
          id: "user-2",
          email: "leo@example.com",
          created_at: "2026-05-08T02:00:00.000Z",
        },
        {
          id: "user-3",
          email: "guest@example.com",
          created_at: "2026-05-07T02:00:00.000Z",
        },
      ],
      profiles: [
        {
          id: "user-1",
          username: "rose",
          access_status: "generation_limited",
        },
        {
          id: "user-2",
          username: "leo",
          access_status: "active",
        },
        {
          id: "user-3",
          username: "rose-reader",
        },
      ],
    }),
  );

  assert.equal(result.total, 1);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    userId: "user-1",
    email: "rose@example.com",
    username: "rose",
    accessStatus: "generation_limited",
    createdAt: "2026-05-09T02:00:00.000Z",
  });
});

test("listAdminUsers 会把缺省 access_status 保守回退为 active", async () => {
  const result = await listAdminUsers(
    {
      q: "guest@example.com",
      page: 1,
      pageSize: 10,
    },
    createListDependencies({
      authUsers: [
        {
          id: "user-3",
          email: "guest@example.com",
          created_at: "2026-05-07T02:00:00.000Z",
        },
      ],
      profiles: [
        {
          id: "user-3",
          username: "guest",
        },
      ],
    }),
  );

  assert.equal(result.rows[0]?.accessStatus, "active");
});

test("updateAdminUserAccessStatus 会更新 profiles.access_status", async () => {
  let updatePayload: Record<string, unknown> | null = null;
  let updateUserId = "";

  const result = await updateAdminUserAccessStatus(
    {
      userId: "user-1",
      accessStatus: "readonly",
    },
    createUpdateDependencies({
      result: {
        id: "user-1",
        username: "rose",
        access_status: "readonly",
      },
      onUpdate: (payload, userId) => {
        updatePayload = payload;
        updateUserId = userId;
      },
    }),
  );

  assert.deepEqual(updatePayload, { access_status: "readonly" });
  assert.equal(updateUserId, "user-1");
  assert.deepEqual(result, {
    userId: "user-1",
    username: "rose",
    accessStatus: "readonly",
  });
});

test("updateAdminUserAccessStatus 遇到缺失资料会返回受控失败", async () => {
  await assert.rejects(
    () =>
      updateAdminUserAccessStatus(
        {
          userId: "missing-user",
          accessStatus: "disabled",
        },
        createUpdateDependencies({
          result: null,
        }),
      ),
    /User profile not found/,
  );
});
