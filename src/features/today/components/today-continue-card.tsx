import type { CSSProperties } from "react";
import { Clock3 } from "lucide-react";
import {
  TODAY_SKELETON_SOFT_BAR_CLASSNAME,
  TODAY_SKELETON_STRONG_BAR_CLASSNAME,
} from "@/features/today/components/today-page-styles";

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));
const stripChineseSuffix = (value: string) =>
  value
    .replace(/\s*[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]\s*$/, "")
    .replace(/\s*[-/]\s*[\u4e00-\u9fff].*$/, "")
    .trim();

export function TodayContinueCard({
  title,
  subtitle,
  sceneTitle,
  stepLabel,
  helperText,
  progressPercent,
  isPending,
  ctaLabel,
  metaItems,
  onContinue,
}: {
  title: string;
  subtitle: string;
  sceneTitle?: string;
  stepLabel: string;
  stepIcon: string;
  helperText: string;
  resultSummary?: string;
  progressPercent: number;
  isPending: boolean;
  ctaLabel: string;
  metaItems?: string[];
  onContinue: () => void;
}) {
  const safeProgress = clampProgress(progressPercent);
  const displaySceneTitle = stripChineseSuffix(sceneTitle || subtitle);
  const durationLabel =
    metaItems?.find((item) => item.includes("分钟") || item.toLowerCase().includes("min")) ??
    stepLabel;
  const chips = metaItems?.filter((item) => item !== durationLabel) ?? [];

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.10),0_8px_10px_-6px_rgba(59,130,246,0.04)] sm:rounded-[2.5rem] sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-blue-50/80 blur-3xl" />

      <div className="relative z-10">
        {isPending ? (
          <div className="space-y-3" aria-label="继续学习说明加载中">
            <div className={`h-5 w-40 ${TODAY_SKELETON_STRONG_BAR_CLASSNAME}`} />
            <div className={`h-3 w-full ${TODAY_SKELETON_SOFT_BAR_CLASSNAME}`} />
            <div className={`h-3 w-2/3 ${TODAY_SKELETON_SOFT_BAR_CLASSNAME}`} />
          </div>
        ) : (
          <>
            <div className="mb-7 flex items-start justify-between gap-4">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 font-sans text-[11px] font-black uppercase tracking-[0.12em] text-blue-600">
                {title}
              </span>
              <div className="inline-flex shrink-0 items-center gap-1.5 font-sans text-[11px] font-black text-slate-400">
                <Clock3 className="size-3.5" aria-hidden="true" />
                <span>{durationLabel.includes("预计") ? durationLabel : `预计 ${durationLabel}`}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="truncate font-sans text-xl font-black tracking-[-0.03em] text-slate-900">
                {displaySceneTitle}
              </h3>

              <div className="flex items-center gap-5 sm:gap-6">
                <div
                  className="relative flex size-20 shrink-0 items-center justify-center sm:size-24"
                  style={{ "--today-progress": `${safeProgress}%` } as CSSProperties}
                >
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(#2563eb_var(--today-progress),#e2e8f0_0)]" />
                  <div className="absolute inset-[6px] rounded-full bg-white" />
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <span className="font-sans text-[18px] font-black leading-none text-slate-900 sm:text-[22px]">
                      {isPending ? "--" : `${safeProgress}%`}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-sans text-xs font-medium leading-5 text-slate-500">
                    {subtitle}
                  </p>
                  {chips.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {chips.map((item) => (
                        <span
                          key={item}
                          className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-sans text-[12px] font-black text-slate-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          disabled={isPending}
          className="mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-[1rem] bg-blue-600 px-6 font-sans text-[15px] font-black tracking-[-0.01em] text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:opacity-70 disabled:shadow-none"
          onClick={onContinue}
        >
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}
