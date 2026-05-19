import { loadEnvConfig } from "@next/env";
import { getTodayHighCostUsageSummary } from "@/lib/server/high-cost-usage";
import { buildHighCostUsageSnapshotLines } from "./high-cost-usage-snapshot-lib";

loadEnvConfig(process.cwd());

async function main() {
  const snapshot = await getTodayHighCostUsageSummary();
  for (const line of buildHighCostUsageSnapshotLines(snapshot)) {
    console.log(line);
  }
}

void main().catch((error) => {
  console.error("[usage:snapshot] failed", error);
  process.exitCode = 1;
});
