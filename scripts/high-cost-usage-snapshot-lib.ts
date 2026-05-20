import type { HighCostUsageSummaryItem } from "@/lib/server/high-cost-usage";

export interface HighCostUsageSnapshot {
  date: string;
  items: HighCostUsageSummaryItem[];
}

const toTotal = (
  items: HighCostUsageSummaryItem[],
  key: "reservedCount" | "successCount" | "failedCount",
) => items.reduce((sum, item) => sum + item[key], 0);

export const buildHighCostUsageSnapshotLines = (snapshot: HighCostUsageSnapshot) => {
  const totals = {
    reserved: toTotal(snapshot.items, "reservedCount"),
    success: toTotal(snapshot.items, "successCount"),
    failed: toTotal(snapshot.items, "failedCount"),
  };
  const nonZeroItems = snapshot.items.filter(
    (item) => item.reservedCount > 0 || item.successCount > 0 || item.failedCount > 0,
  );

  return [
    `[usage:snapshot] date=${snapshot.date} reserved=${totals.reserved} success=${totals.success} failed=${totals.failed} nonZero=${nonZeroItems.length}`,
    ...snapshot.items.map(
      (item) =>
        `- ${item.capability} reserved=${item.reservedCount} success=${item.successCount} failed=${item.failedCount} limit=${item.limitCount}`,
    ),
    `[usage:snapshot:json] ${JSON.stringify({
      date: snapshot.date,
      totals,
      nonZeroCapabilityCount: nonZeroItems.length,
      items: snapshot.items,
    })}`,
  ];
};
