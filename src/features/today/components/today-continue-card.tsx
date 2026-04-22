import {
  TODAY_CARD_PANEL_CLASSNAME,
  TODAY_CONTINUE_BADGE_ICON_CLASSNAME,
  TODAY_CONTINUE_BUTTON_CLASSNAME,
  TODAY_CONTINUE_HELPER_ICON_CLASSNAME,
  TODAY_CONTINUE_PROGRESS_TEXT_CLASSNAME,
  TODAY_CONTINUE_RESULT_TEXT_CLASSNAME,
  TODAY_CONTINUE_RING_PROGRESS_COLOR,
  TODAY_CONTINUE_RING_SHELL_CLASSNAME,
  TODAY_CONTINUE_RING_TRACK_COLOR,
  TODAY_CONTINUE_RING_VALUE_TEXT_CLASSNAME,
  TODAY_CONTINUE_SECTION_CLASSNAME,
  TODAY_CONTINUE_TITLE_CLASSNAME,
  TODAY_SKELETON_SOFT_BAR_CLASSNAME,
  TODAY_SKELETON_STRONG_BAR_CLASSNAME,
  TODAY_STEP_PILL_CLASSNAME,
} from "@/features/today/components/today-page-styles";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";

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
    <section className={TODAY_CONTINUE_SECTION_CLASSNAME}>
      <div className="flex items-center justify-between gap-[var(--mobile-space-md)]">
        <div className="min-w-0 flex-1">
          <p className={TODAY_CONTINUE_TITLE_CLASSNAME}>{title}</p>
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
              className={`${TODAY_CONTINUE_RING_SHELL_CLASSNAME} animate-pulse`}
              aria-label="继续学习进度加载中"
            >
              <div className={`h-4 w-12 ${TODAY_SKELETON_STRONG_BAR_CLASSNAME}`} />
            </div>
          ) : (
            <>
              <svg className="h-[100px] w-[100px] -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke={TODAY_CONTINUE_RING_TRACK_COLOR} strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={TODAY_CONTINUE_RING_PROGRESS_COLOR}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className={TODAY_CONTINUE_RING_VALUE_TEXT_CLASSNAME}>{progressPercent}%</div>
            </>
          )}
        </div>

        <div className={`min-w-0 flex-1 ${TODAY_CARD_PANEL_CLASSNAME}`}>
          {isPending ? (
            <div className="space-y-2 py-1" aria-label="继续学习说明加载中">
              <div className={`h-4 w-28 ${TODAY_SKELETON_STRONG_BAR_CLASSNAME}`} />
              <div className={`h-3 w-full ${TODAY_SKELETON_SOFT_BAR_CLASSNAME}`} />
              <div className={`h-3 w-5/6 ${TODAY_SKELETON_SOFT_BAR_CLASSNAME}`} />
            </div>
          ) : (
            <>
              <p className={TODAY_CONTINUE_PROGRESS_TEXT_CLASSNAME}>
                <span className={TODAY_CONTINUE_HELPER_ICON_CLASSNAME}>📈</span> 当前进度:{" "}
                <strong>{progressPercent}%</strong>
              </p>
              <p className={`mt-[var(--mobile-space-sm)] ${APPLE_META_TEXT} leading-[1.5]`}>
                <span className={TODAY_CONTINUE_HELPER_ICON_CLASSNAME}>{stepIcon}</span> {helperText}
              </p>
              {resultSummary ? (
                <p className={`mt-[var(--mobile-space-sm)] ${TODAY_CONTINUE_RESULT_TEXT_CLASSNAME}`}>{resultSummary}</p>
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
