"use client";

import {
  REVIEW_SUMMARY_CARD_CLASSNAME,
  REVIEW_SUMMARY_CARD_LABEL_CLASSNAME,
  REVIEW_SUMMARY_CARD_VALUE_ACCENT_CLASSNAME,
  REVIEW_SUMMARY_CARD_VALUE_CLASSNAME,
  REVIEW_SUMMARY_GRID_CLASSNAME,
} from "./review-page-styles";

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
    <div className={REVIEW_SUMMARY_GRID_CLASSNAME}>
      <div className={REVIEW_SUMMARY_CARD_CLASSNAME}>
        <p className={REVIEW_SUMMARY_CARD_LABEL_CLASSNAME}>{dueLabel}</p>
        <p className={REVIEW_SUMMARY_CARD_VALUE_CLASSNAME}>{loading ? "..." : dueCount}</p>
      </div>
      <div className={REVIEW_SUMMARY_CARD_CLASSNAME}>
        <p className={REVIEW_SUMMARY_CARD_LABEL_CLASSNAME}>{doneLabel}</p>
        <p className={REVIEW_SUMMARY_CARD_VALUE_ACCENT_CLASSNAME}>
          {loading ? "..." : reviewedTodayCount}
        </p>
      </div>
      <div className={REVIEW_SUMMARY_CARD_CLASSNAME}>
        <p className={REVIEW_SUMMARY_CARD_LABEL_CLASSNAME}>{accuracyLabel}</p>
        <p className={REVIEW_SUMMARY_CARD_VALUE_CLASSNAME}>
          {loading ? "..." : accuracyText}
        </p>
      </div>
    </div>
  );
}
