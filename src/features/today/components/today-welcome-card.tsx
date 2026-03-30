import { TODAY_SECTION_CLASSNAME } from "@/features/today/components/today-page-styles";
import { APPLE_META_TEXT, APPLE_TITLE_MD } from "@/lib/ui/apple-style";

export function TodayWelcomeCard({
  displayName,
  streakDays,
}: {
  displayName: string;
  streakDays: number;
}) {
  return (
    <section className={`${TODAY_SECTION_CLASSNAME} py-[var(--mobile-space-lg)]`}>
      <div className="flex items-center justify-between gap-[var(--mobile-space-md)]">
        <div className="min-w-0 flex-1">
          <h2 className={`truncate ${APPLE_TITLE_MD} text-[#0F172A]`}>欢迎回来，{displayName}</h2>
          <p className={`mt-[var(--mobile-space-2xs)] ${APPLE_META_TEXT}`}>
            每天进步一点点，把输入真正变成自己的表达。
          </p>
        </div>
        <div className="shrink-0 rounded-[var(--app-radius-pill)] bg-[#FEF9E3] px-[var(--mobile-space-lg)] py-[var(--mobile-space-sm)]">
          <div className="flex items-center gap-[var(--mobile-space-sm)]">
            <span className="inline-flex text-[clamp(1.05rem,5vw,1.25rem)] leading-none">🔥</span>
            <div className="leading-tight">
              <p className="text-[length:var(--mobile-font-body)] font-bold text-[#B45309]">
                {streakDays} <span className="text-[length:var(--mobile-font-caption)] font-medium">天</span>
              </p>
              <p className="text-[length:var(--mobile-font-caption)] text-[#92400E]">连续学习</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
