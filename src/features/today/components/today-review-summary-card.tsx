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
      className="flex w-full items-center justify-between rounded-[1.5rem] border border-slate-100 bg-white px-4 py-4 text-left shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition active:scale-[0.99] sm:px-5 sm:py-5"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
          <span className="text-sm" aria-hidden="true">
            ◎
          </span>
        </div>
        <div>
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">复习状态</p>
          <p className="mt-1 font-sans text-[15px] font-bold text-slate-800">
            {dueReviewCount > 0 ? `${dueReviewCount} 条待复习` : "暂无待复习内容"}
          </p>
        </div>
      </div>

      <div className="text-right">
        <div className="font-sans text-[13px] font-black text-emerald-500">
          {reviewAccuracy == null ? "--" : `${reviewAccuracy}%`}
        </div>
        <div className="font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-slate-300">正确率</div>
      </div>
    </button>
  );
}
