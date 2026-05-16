import { CalendarDays, ChevronRight, Coffee, MessageCircleMore, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/shared/action-loading";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

const getRecommendedSceneIcon = (scene: SceneListItemResponse) => {
  if (scene.category === "daily_life") return Coffee;
  if (scene.category === "time_plan") return CalendarDays;
  if (scene.category === "social") return MessageCircleMore;
  return Sparkles;
};

const getRecommendedSceneMeta = (scene: SceneListItemResponse) => {
  const categoryLabel =
    scene.category === "daily_life"
      ? "日常生活"
      : scene.category === "time_plan"
        ? "时间安排"
        : scene.category === "social"
          ? "简单社交"
          : null;

  if (categoryLabel && typeof scene.estimatedMinutes === "number") {
    return `${categoryLabel} · ${scene.estimatedMinutes} 分钟`;
  }

  if (categoryLabel) return categoryLabel;
  if (scene.subtitle) return scene.subtitle;
  if (typeof scene.estimatedMinutes === "number") return `${scene.estimatedMinutes} 分钟`;
  return "继续下一组";
};

const getRecommendedSceneIconClassName = (scene: SceneListItemResponse) => {
  if (scene.category === "daily_life") return "text-amber-600";
  if (scene.category === "time_plan") return "text-sky-600";
  if (scene.category === "social") return "text-rose-500";
  return "text-blue-500";
};

export function TodayRecommendedScenesSection({
  loading,
  recommendedScenes,
  emptyText,
  loadingText,
  onOpenScene,
}: {
  loading: boolean;
  recommendedScenes: SceneListItemResponse[];
  emptyText: string;
  loadingText: string;
  getRecommendationReason: (scene: SceneListItemResponse) => string;
  getRecommendationBadge: (scene: SceneListItemResponse) => string;
  onOpenScene: (slug: string) => void;
}) {
  const nextScene = recommendedScenes[0];

  return (
    <section className="space-y-4 pt-1">
      <div className="flex items-end justify-between">
        <h3 className="font-sans text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
          推荐下一组
        </h3>
        <button
          type="button"
          className="font-sans text-[11px] font-black text-blue-600"
          onClick={() => {
            if (nextScene) onOpenScene(nextScene.slug);
          }}
        >
          查看更多
        </button>
      </div>

      {loading && !nextScene ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
          <LoadingState text={loadingText} className="py-0" />
        </div>
      ) : !nextScene ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-900/5 p-4 font-sans text-[15px] text-slate-500 sm:p-5">
          {emptyText}
        </div>
      ) : (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-900/5 p-4 text-left transition active:scale-[0.99]"
          onClick={() => onOpenScene(nextScene.slug)}
        >
          <div className="flex min-w-0 items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                  {(() => {
                    const Icon = getRecommendedSceneIcon(nextScene);
                    return (
                      <Icon
                        className={`size-5 ${getRecommendedSceneIconClassName(nextScene)}`}
                        aria-hidden="true"
                      />
                    );
                  })()}
                </div>
            <div className="min-w-0">
              <span className="block truncate font-sans text-[16px] font-bold text-slate-800">
                {nextScene.title}
              </span>
              <span className="mt-1 block font-sans text-[12px] font-bold text-slate-400">
                {getRecommendedSceneMeta(nextScene)}
              </span>
            </div>
          </div>

          <ChevronRight className="size-5 shrink-0 text-blue-500" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
