import { ChevronRight } from "lucide-react";
import { LoadingState } from "@/components/shared/action-loading";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

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
    <section className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold tracking-normal text-[#86868b]">
          推荐下一组
        </h3>
        <button
          type="button"
          className="text-[13px] font-medium text-[#007AFF]"
          onClick={() => {
            if (nextScene) onOpenScene(nextScene.slug);
          }}
        >
          查看更多
        </button>
      </div>

      {loading && !nextScene ? (
        <div className="rounded-[18px] bg-white p-5">
          <LoadingState text={loadingText} className="py-0" />
        </div>
      ) : !nextScene ? (
        <div className="rounded-[18px] bg-white p-5 text-[14px] text-[#86868b]">
          {emptyText}
        </div>
      ) : (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[18px] bg-white p-5 text-left shadow-[0_4px_14px_rgba(0,0,0,0.03)] transition active:scale-[0.99]"
          onClick={() => onOpenScene(nextScene.slug)}
        >
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-[#1d1d1f]">
              {nextScene.title}
            </span>
            <span className="mt-1 block text-[12px] text-[#86868b]">
              {nextScene.estimatedMinutes} 分钟
            </span>
          </div>
          <ChevronRight className="size-5 shrink-0 text-[#d1d1d6]" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
