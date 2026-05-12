import Link from "next/link";
import { CalendarDays, TrendingUp } from "lucide-react";
import { requireCurrentProfile } from "@/lib/server/auth";
import { getLearningOverview } from "@/lib/server/learning/service";

const heatmapLevels = [
  0, 1, 2, 0, 3, 2, 1,
  1, 0, 2, 3, 4, 1, 0,
  2, 2, 1, 0, 3, 4, 2,
  0, 1, 3, 2, 1, 0, 2,
  1, 2, 4, 3, 0, 1, 2,
  2, 0, 1, 3, 4, 2, 1,
  0, 2, 3, 1, 2, 4, 3,
  1, 1, 0, 2, 3, 2, 4,
  2, 3, 1, 0, 1, 2, 3,
  0, 1, 2, 4, 3, 2, 1,
  1, 2, 0, 1, 3, 4, 2,
  2, 3, 4, 1, 0, 2, 3,
];

const trendBars = [36, 52, 44, 68, 58, 76, 64];
const trendLabels = ["一", "二", "三", "四", "五", "六", "日"];

export default async function ProgressPage() {
  const { user } = await requireCurrentProfile();
  const overview = await getLearningOverview(user.id).catch((error) => {
    console.warn(
      "[progress][learning-overview-fallback]",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      streakDays: 0,
      completedScenesCount: 0,
      inProgressScenesCount: 0,
      savedPhraseCount: 0,
      recentStudyMinutes: 0,
      reviewAccuracy: null as number | null,
    };
  });

  const reviewAccuracyLabel = overview.reviewAccuracy == null ? "--" : `${overview.reviewAccuracy}%`;
  const studyHours = Math.max(0, Math.round((overview.recentStudyMinutes / 60) * 10) / 10);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">你的学习节奏</h1>
          <p className="mt-1 text-sm text-slate-500">通过数据洞察你的成长，而不只是完成任务。</p>
        </div>
        <div className="flex flex-col gap-2 text-xs sm:flex-row">
          <Link
            href="/today"
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-600"
          >
            继续学习
          </Link>
          <Link
            href="/review"
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            查看复习记录
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">连续学习</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600">{overview.streakDays}</span>
            <span className="text-sm font-medium text-slate-400">天</span>
          </div>
          <div className="mt-4 flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full ${index < Math.min(overview.streakDays, 5) ? "bg-blue-600" : "bg-slate-100"}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">表达资产 / 已收藏表达</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{overview.savedPhraseCount}</span>
            <span className="text-xs font-bold text-green-500">↑ 本周</span>
          </div>
          <p className="mt-4 text-[10px] leading-tight text-slate-400">来自场景学习与复习沉淀的表达资产。</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">累计时长</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{overview.recentStudyMinutes}</span>
            <span className="text-sm font-medium text-slate-400">min</span>
          </div>
          <p className="mt-4 text-[10px] leading-tight text-slate-400">最近 7 天约 {studyHours} 小时的有效输入。</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">复习正确率</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-500">{reviewAccuracyLabel}</span>
          </div>
          <p className="mt-4 text-[10px] leading-tight text-slate-400">基于最近复习反馈估算。</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-800">
          <CalendarDays className="size-4 text-blue-500" aria-hidden="true" />
          学习热力图
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-4">
          {Array.from({ length: 12 }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-2">
              {Array.from({ length: 7 }).map((__, dayIndex) => {
                const level = heatmapLevels[weekIndex * 7 + dayIndex] ?? 0;
                return <HeatmapSquare key={dayIndex} level={level} />;
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-400">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <HeatmapSquare key={level} level={level} />
          ))}
          <span>More</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-800">
            <TrendingUp className="size-4 text-blue-500" aria-hidden="true" />
            最近 7 天学习趋势
          </h2>
          <div className="flex h-64 items-end justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-100 to-white p-5">
            {trendBars.map((height, index) => (
              <div key={trendLabels[index]} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div
                  className="rounded-t-xl bg-blue-500/80 transition-colors hover:bg-blue-600"
                  style={{ height: `${height}%` }}
                />
                <span className="text-center text-[10px] font-bold text-slate-400">{trendLabels[index]}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">先用近 7 天学习时长趋势占位，后续可接入更细的每日学习事件。</p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-sm font-bold text-slate-800">成长足迹</h2>
          <div className="space-y-6">
            <TimelineItem
              title={`完成场景：${overview.completedScenesCount} 个`}
              description="持续推进场景学习，把语境输入沉淀为表达资产。"
            />
            <TimelineItem
              title={`收藏表达：${overview.savedPhraseCount} 条`}
              description="表达库正在累积，可回到复习页继续强化。"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function HeatmapSquare({ level }: { level: number }) {
  const colorClassName =
    level >= 4
      ? "bg-blue-800"
      : level === 3
        ? "bg-blue-500"
        : level === 2
          ? "bg-blue-300"
          : level === 1
            ? "bg-blue-100"
            : "bg-slate-200";

  return <div className={`size-3 rounded-[2px] ${colorClassName}`} />;
}

function TimelineItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative flex gap-4">
      <div className="z-10 mt-1.5 size-2 rounded-full bg-blue-600" />
      <div className="absolute left-1 top-2 h-full w-0.5 bg-slate-100" />
      <div>
        <p className="text-xs font-bold text-slate-800">{title}</p>
        <p className="text-[10px] text-slate-400">{description}</p>
      </div>
    </div>
  );
}
