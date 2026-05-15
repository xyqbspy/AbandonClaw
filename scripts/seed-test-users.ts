import { loadEnvConfig } from "@next/env";
import {
  seedTestUsers,
  validateSeedEnv,
} from "./test-users-lib";
import { createSupabaseTestUserAccess } from "./test-users-supabase";

loadEnvConfig(process.cwd());

async function main() {
  const config = validateSeedEnv(process.env);
  const results = await seedTestUsers(config, createSupabaseTestUserAccess());

  console.log("[seed:test-users] 已完成测试账号创建/更新");
  for (const result of results) {
    const adminSuffix =
      result.kind === "admin" && !result.isAdminEnvReady
        ? " | 警告: TEST_ADMIN_EMAIL 未包含在 ADMIN_EMAILS，当前还不能访问 /admin"
        : "";
    console.log(
      `- ${result.kind}: ${result.email} | ${result.created ? "created" : "updated"} | access=${result.accessStatus}${adminSuffix}`,
    );
  }
  console.log("[seed:test-users] 未输出明文密码；请从 TEST_USER_PASSWORD 环境变量读取。");
}

void main().catch((error) => {
  console.error("[seed:test-users] failed", error);
  process.exitCode = 1;
});
