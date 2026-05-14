import { loadEnvConfig } from "@next/env";
import { runSeedScenesSync } from "@/lib/server/scene/service";

loadEnvConfig(process.cwd());

async function main() {
  const result = await runSeedScenesSync();
  console.log(`Builtin scenes synced: ${result.total}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
