import { LoadingState } from "@/components/shared/action-loading";
import {
  TODAY_BADGE_EMOJI_CLASSNAME,
  TODAY_RECOMMEND_BADGE_CLASSNAME,
  TODAY_RECOMMEND_CARD_CLASSNAME,
  TODAY_RECOMMEND_EMPTY_CLASSNAME,
  TODAY_RECOMMEND_REASON_PILL_CLASSNAME,
  TODAY_RECOMMEND_TITLE_CLASSNAME,
  TODAY_SECTION_CLASSNAME,
  TODAY_SECTION_EMOJI_CLASSNAME,
  TODAY_SECTION_TITLE_CLASSNAME,
} from "@/features/today/components/today-page-styles";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

export function TodayRecommendedScenesSection({
  loading,
  recommendedScenes,
  emptyText,
  loadingText,
  getRecommendationReason,
  getRecommendationBadge,
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
  return (
    <section className="space-y-[var(--mobile-space-md)]">
      <div className="flex items-end justify-between gap-[var(--mobile-space-md)]">
        <div className={`flex items-center gap-[var(--mobile-space-sm)] ${TODAY_SECTION_TITLE_CLASSNAME} text-[#334155]`}>
          <span className={TODAY_SECTION_EMOJI_CLASSNAME}>✨</span>
          <span>推荐下一组场景</span>
        </div>
        <span className={APPLE_META_TEXT}>轻触卡片切换</span>
      </div>

      {loading && recommendedScenes.length === 0 ? (
        <div className={`${TODAY_SECTION_CLASSNAME} py-[calc(var(--mobile-space-xl)+var(--mobile-space-lg))]`}>
          <LoadingState text={loadingText} className="py-0" />
        </div>
      ) : recommendedScenes.length === 0 ? (
        <div className={TODAY_RECOMMEND_EMPTY_CLASSNAME}>{emptyText}</div>
      ) : (
        <div className="flex gap-[var(--mobile-space-md)] overflow-x-auto pb-[var(--mobile-space-2xs)]">
          {recommendedScenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={TODAY_RECOMMEND_CARD_CLASSNAME}
              onClick={() => onOpenScene(scene.slug)}
            >
              <div className={TODAY_RECOMMEND_TITLE_CLASSNAME}>{scene.title}</div>
              <div className={`mt-[var(--mobile-space-sm)] ${APPLE_META_TEXT} leading-[1.35]`}>
                <span className={TODAY_BADGE_EMOJI_CLASSNAME}>⏰</span> {scene.estimatedMinutes} 分钟
              </div>
              <div className={TODAY_RECOMMEND_REASON_PILL_CLASSNAME}>
                {getRecommendationReason(scene)}
              </div>
              <div className={TODAY_RECOMMEND_BADGE_CLASSNAME}>{getRecommendationBadge(scene)}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
