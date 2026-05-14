export function TodayWelcomeCard({
  displayName,
  streakDays,
}: {
  displayName: string;
  streakDays: number;
}) {
  return (
    <section className="flex items-start justify-between gap-4 pb-1">
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
          Today&apos;s Focus
        </p>
        <h2 className="min-w-0 truncate font-sans text-2xl font-black leading-[1.1] tracking-[-0.03em] text-slate-900">
          欢迎回来，{displayName}
        </h2>
      </div>

      <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-black text-amber-700">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
        <span>{streakDays} 天连续学习</span>
      </div>
    </section>
  );
}
