import assert from "node:assert/strict";
import test from "node:test";
import {
  getSeededTestUserSpecs,
  isAllowedResetEmail,
  resetTestUserData,
  seedTestUsers,
  validateResetEnv,
  validateSeedEnv,
  type TestAuthUser,
  type TestUserDataAccess,
} from "./test-users-lib";

const baseEnv = {
  ALLOW_TEST_USER_SEED: "true",
  ALLOW_TEST_USER_RESET: "true",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  TEST_USER_PASSWORD: "secret-password",
  TEST_NORMAL_EMAIL: "normal@example.test",
  TEST_RESTRICTED_EMAIL: "restricted@example.test",
  TEST_ADMIN_EMAIL: "admin@example.test",
  ADMIN_EMAILS: "admin@example.test",
} satisfies Record<string, string>;

const createFakeDeps = () => {
  const authUsers = new Map<string, TestAuthUser>();
  const tables = new Map<string, Array<Record<string, unknown>>>();

  const ensureTable = (name: string) => {
    const existing = tables.get(name);
    if (existing) return existing;
    const rows: Array<Record<string, unknown>> = [];
    tables.set(name, rows);
    return rows;
  };

  const deps: TestUserDataAccess = {
    async listAuthUsers() {
      return Array.from(authUsers.values());
    },
    async createAuthUser(input) {
      const user: TestAuthUser = {
        id: `${input.kind}-id`,
        email: input.email,
        emailConfirmedAt: input.emailConfirmed ? "2026-05-15T00:00:00.000Z" : null,
      };
      authUsers.set(input.email, user);
      return user;
    },
    async updateAuthUser(userId, input) {
      const user: TestAuthUser = {
        id: userId,
        email: input.email,
        emailConfirmedAt: input.emailConfirmed ? "2026-05-15T00:00:00.000Z" : null,
      };
      authUsers.set(input.email, user);
      return user;
    },
    async upsertProfile(input) {
      ensureTable("profiles").push({
        id: input.id,
        username: input.username,
        access_status: input.accessStatus,
      });
    },
    async selectRows(table, filters) {
      return ensureTable(table).filter((row) =>
        Object.entries(filters).every(([column, value]) =>
          Array.isArray(value) ? value.includes(String(row[column])) : row[column] === value,
        ),
      );
    },
    async deleteRows(table, filters) {
      const rows = ensureTable(table);
      const keep = rows.filter(
        (row) =>
          !Object.entries(filters).every(([column, value]) =>
            Array.isArray(value) ? value.includes(String(row[column])) : row[column] === value,
          ),
      );
      const deletedCount = rows.length - keep.length;
      tables.set(table, keep);
      return deletedCount;
    },
  };

  return {
    deps,
    authUsers,
    tables,
    ensureTable,
  };
};

test("validateSeedEnv 会校验 gate 与必要 env", () => {
  const config = validateSeedEnv(baseEnv);
  assert.equal(config.normalEmail, "normal@example.test");
  assert.throws(
    () => validateSeedEnv({ ...baseEnv, ALLOW_TEST_USER_SEED: "false" }),
    /ALLOW_TEST_USER_SEED=true/,
  );
});

test("validateResetEnv 与 isAllowedResetEmail 会保护白名单和测试域名", () => {
  const config = validateResetEnv({
    ...baseEnv,
    TEST_USER_ALLOWED_DOMAIN: "sandbox.test",
  });
  assert.equal(isAllowedResetEmail("normal@example.test", config), true);
  assert.equal(isAllowedResetEmail("someone@sandbox.test", config), true);
  assert.equal(isAllowedResetEmail("real@company.com", config), false);
});

test("seedTestUsers 会幂等创建普通、受限和 admin 测试账号", async () => {
  const { deps, authUsers, tables } = createFakeDeps();
  const config = validateSeedEnv(baseEnv);
  const first = await seedTestUsers(config, deps);
  const second = await seedTestUsers(config, deps);

  assert.equal(first.length, 3);
  assert.equal(second.every((item) => item.created === false), true);
  assert.equal(authUsers.size, 3);
  assert.equal(
    first.find((item) => item.kind === "restricted")?.accessStatus,
    "readonly",
  );
  assert.equal(
    getSeededTestUserSpecs(config).find((item) => item.kind === "admin")?.email,
    "admin@example.test",
  );
  assert.equal((tables.get("profiles") ?? []).length >= 3, true);
});

test("resetTestUserData 只会重置测试账号相关学习表", async () => {
  const { deps, authUsers, ensureTable } = createFakeDeps();
  const config = validateResetEnv(baseEnv);

  authUsers.set("normal@example.test", {
    id: "normal-id",
    email: "normal@example.test",
    emailConfirmedAt: "2026-05-15T00:00:00.000Z",
  });

  ensureTable("user_phrases").push(
    { id: "phrase-1", user_id: "normal-id" },
    { id: "phrase-other", user_id: "other-id" },
  );
  ensureTable("user_expression_clusters").push(
    { id: "cluster-1", user_id: "normal-id" },
    { id: "cluster-other", user_id: "other-id" },
  );
  ensureTable("user_expression_cluster_members").push(
    { id: "member-1", cluster_id: "cluster-1", user_phrase_id: "phrase-1" },
    { id: "member-2", cluster_id: "cluster-other", user_phrase_id: "phrase-other" },
  );
  ensureTable("phrase_review_logs").push(
    { id: "log-1", user_id: "normal-id" },
    { id: "log-2", user_id: "other-id" },
  );
  ensureTable("user_scene_progress").push(
    { id: "progress-1", user_id: "normal-id" },
    { id: "progress-2", user_id: "other-id" },
  );
  ensureTable("user_chunks").push(
    { id: "chunk-1", user_id: "normal-id" },
    { id: "chunk-2", user_id: "other-id" },
  );

  const result = await resetTestUserData("normal@example.test", config, deps);

  assert.equal(result.email, "normal@example.test");
  assert.equal((await deps.selectRows("phrase_review_logs", { user_id: "normal-id" }, "id")).length, 0);
  assert.equal((await deps.selectRows("user_scene_progress", { user_id: "normal-id" }, "id")).length, 0);
  assert.equal((await deps.selectRows("user_chunks", { user_id: "normal-id" }, "id")).length, 0);
  assert.equal((await deps.selectRows("user_phrases", { user_id: "other-id" }, "id")).length, 1);
  assert.equal(
    (await deps.selectRows("user_expression_cluster_members", { cluster_id: "cluster-other" }, "id")).length,
    1,
  );

  await assert.rejects(
    () => resetTestUserData("real@company.com", config, deps),
    /不在测试账号白名单内/,
  );
});
