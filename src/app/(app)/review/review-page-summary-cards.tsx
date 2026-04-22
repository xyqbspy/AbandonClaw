"use client";

import { APPLE_META_TEXT, APPLE_SUMMARY_CARD } from "@/lib/ui/apple-style";

export function ReviewPageSummaryCards({
  dueCount,
  reviewedTodayCount,
  accuracyText,
  loading,
  dueLabel,
  doneLabel,
  accuracyLabel,
}: {
  dueCount: number;
  reviewedTodayCount: number;
  accuracyText: string;
  loading: boolean;
  dueLabel: string;
  doneLabel: string;
  accuracyLabel: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className={APPLE_SUMMARY_CARD}>
        <p className={APPLE_META_TEXT}>{dueLabel}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "..." : dueCount}</p>
      </div>
      <div className={APPLE_SUMMARY_CARD}>
        <p className={APPLE_META_TEXT}>{doneLabel}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">
          {loading ? "..." : reviewedTodayCount}
        </p>
      </div>
      <div className={APPLE_SUMMARY_CARD}>
        <p className={APPLE_META_TEXT}>{accuracyLabel}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">
          {loading ? "..." : accuracyText}
        </p>
      </div>
    </div>
  );
}
