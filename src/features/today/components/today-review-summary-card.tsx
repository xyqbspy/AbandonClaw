import {
  TODAY_BADGE_EMOJI_CLASSNAME,
  TODAY_REVIEW_PILL_CLASSNAME,
  TODAY_SECTION_CLASSNAME,
} from "@/features/today/components/today-page-styles";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

export function TodayReviewSummaryCard({
  reviewAccuracy,
  dueReviewCount,
  onClick,
}: {
  reviewAccuracy: number | null;
  dueReviewCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${TODAY_SECTION_CLASSNAME} flex w-full flex-wrap items-center justify-between gap-[var(--mobile-space-md)] text-left transition active:scale-[0.99]`}
      onClick={onClick}
    >
      <div>
        <div className="text-[length:clamp(1.55rem,7vw,1.8rem)] font-extrabold text-[#10B981]">
          {reviewAccuracy == null ? "--" : `${reviewAccuracy}%`}
        </div>
        <p className={`${APPLE_META_TEXT} leading-[1.35]`}>复习正确率 · 近 7 天</p>
      </div>
      <div
        className={`${TODAY_REVIEW_PILL_CLASSNAME} ${
          dueReviewCount > 0 ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#E6F7EC] text-[#2E7D32]"
        }`}
      >
        {dueReviewCount > 0 ? (
          <>
            <span className={TODAY_BADGE_EMOJI_CLASSNAME}>⏰</span> {dueReviewCount} 条表达待复习
          </>
        ) : (
          <>
            <span className={TODAY_BADGE_EMOJI_CLASSNAME}>🎉</span> 当前没有待复习内容
          </>
        )}
      </div>
    </button>
  );
}
