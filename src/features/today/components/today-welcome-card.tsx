export function TodayWelcomeCard({
  displayName,
  streakDays,
}: {
  displayName: string;
  streakDays: number;
}) {
  return (
    <section className="flex items-center justify-between gap-4">
      <h2 className="min-w-0 truncate text-[24px] font-bold leading-tight tracking-normal text-[#1d1d1f]">
        欢迎回来，{displayName}
      </h2>
      <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#1d1d1f] shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
        <span className="text-[#ff9500]" aria-hidden="true">
          ●
        </span>
        <span>{streakDays} 天连续学习</span>
      </div>
    </section>
  );
}
