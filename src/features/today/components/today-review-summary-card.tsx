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
      className="flex w-full items-center justify-between rounded-[18px] bg-white px-5 py-4 text-left shadow-[0_4px_14px_rgba(0,0,0,0.03)] transition active:scale-[0.99]"
      onClick={onClick}
    >
      <div>
        <div className="text-[15px] font-semibold text-[#1d1d1f]">回忆复习</div>
        <div className="mt-1 text-[12px] text-[#86868b]">
          {dueReviewCount > 0 ? `${dueReviewCount} 条待复习` : "暂无待复习"}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[18px] font-extrabold text-[#10B981]">
          {reviewAccuracy == null ? "--" : `${reviewAccuracy}%`}
        </div>
        <div className="text-[11px] text-[#86868b]">正确率</div>
      </div>
    </button>
  );
}
