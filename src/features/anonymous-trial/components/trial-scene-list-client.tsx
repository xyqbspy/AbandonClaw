"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SceneListItemResponse } from "@/lib/utils/scenes-api";
import { Button } from "@/components/ui/button";
import { SceneEmptyState } from "@/app/(app)/scenes/scene-empty-state";
import { SceneFilterBar } from "@/app/(app)/scenes/scene-filter-bar";
import { SceneListCard } from "@/app/(app)/scenes/scene-list-card";
import {
  filterScenes,
  hasActiveFilters,
  SceneFilters,
  SceneSortOption,
  sortScenes,
} from "@/app/(app)/scenes/scene-display";
import {
  buildAnonymousHeaders,
  getOrCreateAnonymousId,
} from "@/lib/anonymous-client";
import { useAnonymousMode } from "@/features/anonymous-trial/use-anonymous-mode";
import { AnonymousBlockModal, type AnonymousBlockTrigger } from "./anonymous-block-modal";
import { AnonymousTopbarBanner } from "./anonymous-topbar-banner";

const initialFilters: SceneFilters = {
  category: "all",
  level: "all",
  source: "all",
  search: "",
};

const reportAnonymousEvent = (
  event: "anon_register_prompt_shown" | "anon_register_prompt_clicked",
  payload?: Record<string, unknown>,
) => {
  if (typeof window === "undefined") return;
  void fetch("/api/anonymous/funnel-event", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...buildAnonymousHeaders(),
    },
    body: JSON.stringify({ event, payload }),
    keepalive: true,
  }).catch(() => {
    // 漏斗失败不阻塞试用页交互
  });
};

export function TrialSceneListClient({
  initialScenes,
  registerHref,
}: {
  initialScenes: SceneListItemResponse[];
  registerHref: string;
}) {
  const router = useRouter();
  const anonState = useAnonymousMode({ isAuthenticated: false });
  const [filters, setFilters] = useState<SceneFilters>(initialFilters);
  const [sort, setSort] = useState<SceneSortOption>("recommended");
  const [openingSceneTarget, setOpeningSceneTarget] = useState<string | null>(null);
  const [blockTrigger, setBlockTrigger] = useState<AnonymousBlockTrigger | null>(null);
  const [capabilityLabel, setCapabilityLabel] = useState<string | null>(null);
  const promptShownReportedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    getOrCreateAnonymousId();
  }, []);

  useEffect(() => {
    if (blockTrigger === null) return;
    const key = `L3:${capabilityLabel ?? blockTrigger}`;
    if (promptShownReportedRef.current[key]) return;
    promptShownReportedRef.current[key] = true;
    reportAnonymousEvent("anon_register_prompt_shown", {
      prompt_level: "L3",
      trigger: blockTrigger,
      capability: capabilityLabel,
      surface: "trial_scene_list",
    });
  }, [blockTrigger, capabilityLabel]);

  const sortedScenes = useMemo(
    () => sortScenes(initialScenes, sort),
    [initialScenes, sort],
  );
  const filteredScenes = useMemo(
    () => filterScenes(sortedScenes, filters),
    [filters, sortedScenes],
  );
  const hasFilters = hasActiveFilters(filters);

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setSort("recommended");
  };

  const openBlockedCapability = (label: string) => {
    setCapabilityLabel(label);
    setBlockTrigger("feature_disabled");
  };

  const handleOpenScene = (scene: SceneListItemResponse) => {
    const href = `/trial/scene/${scene.slug}`;
    setOpeningSceneTarget(href);
    router.push(href);
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] px-3 pb-[8rem] font-sans lg:px-5">
      <AnonymousTopbarBanner
        isAnonymous
        quotaByCapability={anonState.quotaByCapability}
        registerHref={registerHref}
        onRegisterClick={() =>
          reportAnonymousEvent("anon_register_prompt_clicked", {
            prompt_level: "L1",
            surface: "trial_scene_list_topbar",
          })
        }
      />

      <main data-testid="trial-scene-list">
        <section className="sticky top-0 z-20 -mx-3 border-b border-slate-100 bg-[#f8fafc]/90 px-3 py-4 backdrop-blur-md lg:-mx-5 lg:px-5">
          <SceneFilterBar
            category={filters.category}
            level={filters.level}
            source={filters.source}
            sort={sort}
            onCategoryChange={(value) =>
              setFilters((current) => ({ ...current, category: value }))
            }
            onLevelChange={(value) =>
              setFilters((current) => ({ ...current, level: value }))
            }
            onSourceChange={(value) =>
              setFilters((current) => ({ ...current, source: value }))
            }
            onSortChange={setSort}
            onOpenGenerate={() => openBlockedCapability("生成场景")}
            onOpenImport={() => openBlockedCapability("导入自定义场景")}
          />
        </section>

        <section className="space-y-4 pb-[calc(100px+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between pt-4">
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">
              {hasFilters ? "筛选结果" : "试用场景"}
            </span>
            {hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                radius="pill"
                className="h-9 rounded-full border border-slate-100 bg-white px-3 text-xs font-bold text-slate-500 hover:bg-white"
                onClick={handleClearFilters}
              >
                清除筛选
              </Button>
            ) : null}
          </div>

          {initialScenes.length === 0 ? (
            <SceneEmptyState
              title="暂无可试用的公开场景"
              description="当前试用入口没有可公开读取的场景。"
            />
          ) : filteredScenes.length === 0 ? (
            <SceneEmptyState
              title="没有符合条件的场景"
              description="换一个分类、等级或来源试试，或者清除筛选回到推荐列表。"
              actionLabel="清除筛选"
              onAction={handleClearFilters}
            />
          ) : (
            <div className="space-y-4">
              {filteredScenes.map((scene, index) => (
                <SceneListCard
                  key={scene.id}
                  scene={scene}
                  isOpening={openingSceneTarget === `/trial/scene/${scene.slug}`}
                  isImported={false}
                  removing={false}
                  swipeOffset={0}
                  swipeOpen={false}
                  openingLocked={Boolean(openingSceneTarget)}
                  gestureHandlers={{}}
                  featured={index === 0 && !hasFilters}
                  onOpen={() => handleOpenScene(scene)}
                  onWarm={() => undefined}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <AnonymousBlockModal
        isAnonymous
        visible={blockTrigger !== null}
        trigger={blockTrigger ?? "feature_disabled"}
        capabilityLabel={capabilityLabel ?? undefined}
        registerHref={registerHref}
        onDismiss={() => setBlockTrigger(null)}
        onRegisterClick={() =>
          reportAnonymousEvent("anon_register_prompt_clicked", {
            prompt_level: "L3",
            trigger: blockTrigger ?? "feature_disabled",
            capability: capabilityLabel,
            surface: "trial_scene_list",
          })
        }
      />
    </div>
  );
}
