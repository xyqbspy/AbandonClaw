import { loadEnvConfig } from "@next/env";
import { getCliArg } from "./load-api-baseline-lib";
import { runP0AuthLoopSmoke, SmokePhaseError } from "./smoke-p0-auth-loop-lib";
import { validateResetEnv } from "./test-users-lib";

loadEnvConfig(process.cwd());

const parseConfig = () => {
  const args = process.argv.slice(2);
  const baseUrl = (getCliArg(args, "base-url") ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const email = (getCliArg(args, "email") ?? process.env.TEST_NORMAL_EMAIL ?? "").trim().toLowerCase();
  const password = (getCliArg(args, "password") ?? process.env.TEST_USER_PASSWORD ?? "").trim();

  if (!email) {
    throw new Error("缺少 TEST_NORMAL_EMAIL 或 --email");
  }
  if (!password) {
    throw new Error("缺少 TEST_USER_PASSWORD 或 --password");
  }

  const resetConfig = validateResetEnv(process.env);

  return {
    baseUrl,
    email,
    password,
    resetConfig,
  };
};

async function main() {
  const config = parseConfig();
  const report = await runP0AuthLoopSmoke(config);

  console.log("[smoke:p0-auth-loop] success");
  for (const phase of report.phases) {
    const requestId = phase.requestId ? ` requestId=${phase.requestId}` : "";
    const status = phase.status ? ` status=${phase.status}` : "";
    console.log(`- ${phase.phase}: ${phase.summary}${status}${requestId}`);
  }
}

void main().catch((error) => {
  if (error instanceof SmokePhaseError) {
    console.error("[smoke:p0-auth-loop] failed");
    console.error(
      `phase=${error.phase} target=${error.target} summary=${error.summary}${error.status ? ` status=${error.status}` : ""}${error.requestId ? ` requestId=${error.requestId}` : ""}`,
    );
    process.exitCode = 1;
    return;
  }

  console.error("[smoke:p0-auth-loop] failed", error);
  process.exitCode = 1;
});
