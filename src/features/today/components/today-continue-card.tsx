import {
  TODAY_SKELETON_SOFT_BAR_CLASSNAME,
  TODAY_SKELETON_STRONG_BAR_CLASSNAME,
} from "@/features/today/components/today-page-styles";

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

export function TodayContinueCard({
  title,
  subtitle,
  stepLabel,
  helperText,
  progressPercent,
  isPending,
  ctaLabel,
  onContinue,
}: {
  title: string;
  subtitle: string;
  stepLabel: string;
  stepIcon: string;
  helperText: string;
  resultSummary?: string;
  progressPercent: number;
  isPending: boolean;
  ctaLabel: string;
  onContinue: () => void;
}) {
  const safeProgress = clampProgress(progressPercent);

  return (
    <section className="grid grid-cols-[96px_1fr] items-center gap-5 rounded-[24px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:grid-cols-[140px_1fr] sm:gap-6 sm:p-8">
      <div className="flex size-[96px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#007AFF_var(--today-progress),#f2f2f7_0)] [--today-progress:0%] sm:size-[120px]" style={{ "--today-progress": `${safeProgress}%` } as React.CSSProperties}>
        <div className="flex size-[80px] items-center justify-center rounded-full bg-white text-[20px] font-extrabold text-[#1d1d1f] sm:size-[100px] sm:text-[22px]">
          {isPending ? "--" : `${safeProgress}%`}
        </div>
      </div>

      <div className="min-w-0">
        {isPending ? (
          <div className="space-y-3" aria-label="继续学习说明加载中">
            <div className={`h-5 w-40 ${TODAY_SKELETON_STRONG_BAR_CLASSNAME}`} />
            <div className={`h-3 w-full ${TODAY_SKELETON_SOFT_BAR_CLASSNAME}`} />
            <div className={`h-3 w-2/3 ${TODAY_SKELETON_SOFT_BAR_CLASSNAME}`} />
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-[20px] font-bold leading-tight tracking-normal text-[#1d1d1f]">
                {title}
              </h3>
              <div className="inline-flex shrink-0 rounded-full bg-[#f0f7ff] px-3 py-1 text-[12px] font-semibold text-[#007AFF]">
                {stepLabel}
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-[#86868b]">
              {helperText || subtitle}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={isPending}
        className="col-span-2 h-14 w-full rounded-[14px] bg-[#007AFF] px-6 text-[16px] font-semibold text-white shadow-[0_8px_18px_rgba(0,122,255,0.22)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:opacity-70 disabled:shadow-none"
        onClick={onContinue}
      >
        {ctaLabel}
      </button>
    </section>
  );
}
