import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminInviteCodes,
  listAdminInviteCodes,
  listAdminUsers,
  updateAdminRegistrationMode,
  updateAdminInviteCode,
  updateAdminUserAccessStatus,
} from "./service";
import { hashInviteCode } from "@/lib/server/registration";

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

const createInviteCreateDependencies = (params: {
  onInsert?: (rows: Array<Record<string, unknown>>) => void;
  data?: Array<{ id: string; max_uses: number; expires_at: string | null }>;
  error?: { message: string } | null;
}) =>
  ({
    createSupabaseAdminClient: () =>
      ({
        from: (table: string) => {
          assert.equal(table, "registration_invite_codes");
          return {
            insert: (rows: Array<Record<string, unknown>>) => {
              params.onInsert?.(rows);
              return {
                select: async () => ({
                  data: params.data ?? rows.map((_, index) => ({
                    id: `invite-${index + 1}`,
                    max_uses: Number(rows[index]?.max_uses ?? 1),
                    expires_at: String(rows[index]?.expires_at ?? ""),
                  })),
                  error: params.error ?? null,
                }),
              };
            },
          };
        },
      }) as never,
  }) as const;

test("createAdminInviteCodes 只写入 hash 并返回本次明文", async () => {
  let insertedRows: Array<Record<string, unknown>> = [];
  const result = await createAdminInviteCodes(
    {
      mode: "manual",
      code: "  AC-TEST-001  ",
      maxUses: 2,
      expiresInDays: 7,
    },
    createInviteCreateDependencies({
      onInsert: (rows) => {
        insertedRows = rows;
      },
      data: [{ id: "invite-1", max_uses: 2, expires_at: "2026-05-18T00:00:00.000Z" }],
    }),
  );

  assert.equal(result[0]?.code, "AC-TEST-001");
  assert.equal(insertedRows[0]?.code_hash, hashInviteCode("AC-TEST-001"));
  assert.equal("code" in insertedRows[0]!, false);
  assert.equal(insertedRows[0]?.max_uses, 2);
});

test("createAdminInviteCodes 会限制批量生成数量", async () => {
  await assert.rejects(
    () =>
      createAdminInviteCodes(
        {
          mode: "auto",
          count: 51,
        },
        createInviteCreateDependencies({}),
      ),
    /count must be between 1 and 50/,
  );
});

test("updateAdminInviteCode 会更新元数据或停用邀请码", async () => {
  let updatePayload: Record<string, unknown> | null = null;

  const result = await updateAdminInviteCode(
    {
      inviteCodeId: "invite-1",
      maxUses: 3,
      expiresInDays: 0,
      isActive: false,
    },
    {
      createSupabaseAdminClient: () =>
        ({
          from: (table: string) => {
            assert.equal(table, "registration_invite_codes");
            return {
              update: (payload: Record<string, unknown>) => {
                updatePayload = payload;
                return {
                  eq: (_column: string, inviteCodeId: string) => ({
                    select: () => ({
                      maybeSingle: async () => ({
                        data: { id: inviteCodeId },
                        error: null,
                      }),
                    }),
                  }),
                };
              },
            };
          },
        }) as never,
    },
  );

  assert.equal(result.inviteCodeId, "invite-1");
  assert.deepEqual(updatePayload, {
    max_uses: 3,
    expires_at: null,
    is_active: false,
  });
});

test("updateAdminRegistrationMode 会写入运行时注册模式", async () => {
  let upsertPayload: Record<string, unknown> | null = null;

  const result = await updateAdminRegistrationMode(
    {
      mode: "invite_only",
      updatedBy: "admin-1",
    },
    {
      createSupabaseAdminClient: () =>
        ({
          from: (table: string) => {
            assert.equal(table, "app_runtime_settings");
            return {
              upsert: (payload: Record<string, unknown>, options: Record<string, unknown>) => {
                upsertPayload = payload;
                assert.deepEqual(options, { onConflict: "key" });
                return {
                  select: () => ({
                    maybeSingle: async () => ({
                      data: { key: "registration_mode" },
                      error: null,
                    }),
                  }),
                };
              },
            };
          },
        }) as never,
    },
  );

  assert.equal(result.mode, "invite_only");
  assert.ok(upsertPayload);
  const payload = upsertPayload as Record<string, unknown>;
  assert.equal(payload.key, "registration_mode");
  assert.equal(payload.value, "invite_only");
  assert.equal(payload.updated_by, "admin-1");
  assert.equal(typeof payload.updated_at, "string");
});

test("updateAdminRegistrationMode 会拒绝非法模式", async () => {
  await assert.rejects(
    () =>
      updateAdminRegistrationMode(
        {
          mode: "bad" as never,
          updatedBy: "admin-1",
        },
        {
          createSupabaseAdminClient: () => {
            throw new Error("should not write");
          },
        },
      ),
    /registration mode is invalid/,
  );
});

test("listAdminInviteCodes 会返回使用明细与账号活动摘要", async () => {
  const result = await listAdminInviteCodes(
    { page: 1, pageSize: 10 },
    {
      createSupabaseAdminClient: () =>
        ({
          auth: {
            admin: {
              listUsers: async () => ({
                data: {
                  users: [
                    {
                      id: "user-1",
                      email: "rose@example.com",
                      created_at: "2026-05-09T00:00:00.000Z",
                      email_confirmed_at: "2026-05-09T01:00:00.000Z",
                    },
                  ],
                },
                error: null,
              }),
            },
          },
          from: (table: string) => {
            if (table === "registration_invite_codes") {
              return {
                select: () => ({
                  order: () => ({
                    range: async () => ({
                      data: [
                        {
                          id: "invite-1",
                          max_uses: 2,
                          used_count: 1,
                          expires_at: null,
                          is_active: true,
                          created_at: "2026-05-09T00:00:00.000Z",
                          updated_at: "2026-05-09T00:00:00.000Z",
                        },
                      ],
                      error: null,
                      count: 1,
                    }),
                  }),
                }),
              };
            }
            if (table === "registration_invite_attempts") {
              return {
                select: () => ({
                  in: () => ({
                    order: async () => ({
                      data: [
                        {
                          id: "attempt-1",
                          invite_code_id: "invite-1",
                          email: "rose@example.com",
                          status: "used",
                          auth_user_id: "user-1",
                          failure_reason: null,
                          created_at: "2026-05-09T01:00:00.000Z",
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === "profiles") {
              return {
                select: () => ({
                  in: async () => ({
                    data: [{ id: "user-1", username: "rose", access_status: "active" }],
                    error: null,
                  }),
                }),
              };
            }
            if (table === "user_daily_learning_stats") {
              return {
                select: () => ({
                  in: async () => ({
                    data: [
                      {
                        user_id: "user-1",
                        study_seconds: 120,
                        scenes_completed: 1,
                        review_items_completed: 2,
                        phrases_saved: 3,
                      },
                    ],
                    error: null,
                  }),
                }),
              };
            }
            assert.equal(table, "user_daily_high_cost_usage");
            return {
              select: () => ({
                eq: () => ({
                  in: async () => ({
                    data: [
                      {
                        user_id: "user-1",
                        reserved_count: 4,
                        success_count: 3,
                        failed_count: 1,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          },
        }) as never,
    },
  );

  assert.equal(result.total, 1);
  assert.equal(result.rows[0]?.attempts[0]?.email, "rose@example.com");
  assert.equal(result.rows[0]?.attempts[0]?.account?.username, "rose");
  assert.equal(result.rows[0]?.attempts[0]?.account?.emailVerified, true);
  assert.equal(result.rows[0]?.attempts[0]?.account?.studySeconds, 120);
  assert.equal(result.rows[0]?.attempts[0]?.account?.highCostSuccess, 3);
});
