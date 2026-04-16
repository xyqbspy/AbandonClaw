import {
  TODAY_CARD_PANEL_CLASSNAME,
  TODAY_CONTINUE_BADGE_ICON_CLASSNAME,
  TODAY_CONTINUE_BUTTON_CLASSNAME,
  TODAY_CONTINUE_HELPER_ICON_CLASSNAME,
  TODAY_CONTINUE_RING_VALUE_CLASSNAME,
  TODAY_SECTION_CLASSNAME,
  TODAY_SKELETON_BAR_CLASSNAME,
  TODAY_STEP_PILL_CLASSNAME,
} from "@/features/today/components/today-page-styles";
import { APPLE_BODY_TEXT, APPLE_META_TEXT } from "@/lib/ui/apple-style";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function TodayContinueCard({
  title,
  subtitle,
  stepLabel,
  stepIcon,
  helperText,
  resultSummary,
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
  const ringOffset =
    RING_CIRCUMFERENCE - (Math.max(0, Math.min(100, progressPercent)) / 100) * RING_CIRCUMFERENCE;

  return (
    <section className={`${TODAY_SECTION_CLASSNAME} shadow-[0_12px_24px_rgba(0,0,0,0.05)]`}>
      <div className="flex items-center justify-between gap-[var(--mobile-space-md)]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[length:clamp(1.15rem,5.6vw,1.25rem)] leading-[1.2] font-extrabold tracking-[-0.03em] text-[#0B2B40]">
            {title}
          </p>
          <p className={`mt-[var(--mobile-space-2xs)] ${APPLE_META_TEXT}`}>{subtitle}</p>
        </div>
        <div className={`${TODAY_STEP_PILL_CLASSNAME} shrink-0 whitespace-nowrap px-[var(--mobile-space-md)] py-[var(--mobile-space-2xs)]`}>
          <span className={TODAY_CONTINUE_BADGE_ICON_CLASSNAME}>{stepIcon}</span> {stepLabel}
        </div>
      </div>

      <div className="mt-[var(--mobile-space-xl)] flex items-center gap-[var(--mobile-space-md)]">
        <div className="relative h-[100px] w-[100px] shrink-0">
          {isPending ? (
            <div
              className="flex h-[100px] w-[100px] items-center justify-center rounded-full border-[8px] border-[#E9EEF5] bg-[#F8FAFE] animate-pulse"
              aria-label="继续学习进度加载中"
            >
              <div className={`h-4 w-12 bg-[#DCE7F7] ${TODAY_SKELETON_BAR_CLASSNAME}`} />
            </div>
          ) : (
            <>
              <svg className="h-[100px] w-[100px] -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="#E9EEF5" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center font-extrabold text-[#1E293B] ${TODAY_CONTINUE_RING_VALUE_CLASSNAME}`}>
                {progressPercent}%
              </div>
            </>
          )}
        </div>

        <div className={`min-w-0 flex-1 ${TODAY_CARD_PANEL_CLASSNAME}`}>
          {isPending ? (
            <div className="space-y-2 py-1" aria-label="继续学习说明加载中">
              <div className={`h-4 w-28 bg-[#DCE7F7] ${TODAY_SKELETON_BAR_CLASSNAME}`} />
              <div className={`h-3 w-full bg-[#E7EEF9] ${TODAY_SKELETON_BAR_CLASSNAME}`} />
              <div className={`h-3 w-5/6 bg-[#E7EEF9] ${TODAY_SKELETON_BAR_CLASSNAME}`} />
            </div>
          ) : (
            <>
              <p className={`${APPLE_BODY_TEXT} font-medium text-[#1E293B]`}>
                <span className={TODAY_CONTINUE_HELPER_ICON_CLASSNAME}>📈</span> 当前进度:{" "}
                <strong>{progressPercent}%</strong>
              </p>
              <p className={`mt-[var(--mobile-space-sm)] ${APPLE_META_TEXT} leading-[1.5]`}>
                <span className={TODAY_CONTINUE_HELPER_ICON_CLASSNAME}>{stepIcon}</span> {helperText}
              </p>
              {resultSummary ? (
                <p className={`mt-[var(--mobile-space-sm)] ${APPLE_META_TEXT} leading-[1.5] text-[#425466]`}>
                  {resultSummary}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        className={TODAY_CONTINUE_BUTTON_CLASSNAME}
        onClick={onContinue}
      >
        {ctaLabel}
      </button>
    </section>
  );
}
