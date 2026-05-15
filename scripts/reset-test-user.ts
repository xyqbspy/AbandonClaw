import { loadEnvConfig } from "@next/env";
import { getCliArg } from "./load-api-baseline-lib";
import {
  resetTestUserData,
  validateResetEnv,
} from "./test-users-lib";
import { createSupabaseTestUserAccess } from "./test-users-supabase";

loadEnvConfig(process.cwd());

const resolveTargetEmail = (args: string[], fallbackEmail: string) =>
  (getCliArg(args, "email") ?? fallbackEmail).trim().toLowerCase();

async function main() {
  const config = validateResetEnv(process.env);
  const args = process.argv.slice(2);
  const email = resolveTargetEmail(args, config.normalEmail);
  const result = await resetTestUserData(email, config, createSupabaseTestUserAccess());

  console.log(`[reset:test-user] 已重置 ${result.email}`);
  for (const table of result.tables) {
    console.log(`- ${table.table}: ${table.count}`);
  }
}

void main().catch((error) => {
  console.error("[reset:test-user] failed", error);
  process.exitCode = 1;
});
