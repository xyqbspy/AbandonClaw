"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/shared/action-loading";
import { todayPageLabels as zh } from "@/features/today/components/today-page-labels";
import {
  buildTodayTasks,
  getContinueLearningHelperText,
  getContinueLearningHref,
  getContinueLearningStepLabel,
  getRecommendedScenes,
  resolveContinueLearning,
} from "@/features/today/components/today-page-selectors";
import { getLearningDashboardCache, setLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";
import { getPhraseListCache, setPhraseListCache } from "@/lib/cache/phrase-list-cache";
import { getSceneListCache, setSceneListCache } from "@/lib/cache/scene-list-cache";
import { DailyTask } from "@/lib/types";
import { getLearningDashboardFromApi, LearningDashboardResponse } from "@/lib/utils/learning-api";
import { getMyPhrasesFromApi, UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { startReviewSession } from "@/lib/utils/review-session";
import { warmupContinueLearningScene } from "@/lib/utils/scene-resource-actions";
import { getScenesFromApi, SceneListItemResponse } from "@/lib/utils/scenes-api";

const EMPTY_DASHBOARD: LearningDashboardResponse = {
  overview: {
    streakDays: 0,
    completedScenesCount: 0,
    inProgressScenesCount: 0,
    savedPhraseCount: 0,
    recentStudyMinutes: 0,
    reviewAccuracy: null,
  },
  continueLearning: null,
  todayTasks: {
    sceneTask: {
      done: false,
      continueSceneSlug: null,
      currentStep: null,
      masteryStage: null,
      progressPercent: 0,
    },
    reviewTask: { done: false, reviewItemsCompleted: 0, dueReviewCount: 0 },
    outputTask: { done: false, phrasesSavedToday: 0 },
  },
};

const STEP_ICONS = ["🎧", "✨", "🧠"] as const;
const STEP_FALLBACK_DESCS = ["练核心句", "带走表达", "主动提取"] as const;
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const getTaskStepVariant = (task: DailyTask) => {
  if (task.done) return "completed";
  if (task.status === "up_next" || task.status === "available") return "active";
  return "inactive";
};

const getTaskStepDescription = (task: DailyTask, index: number) => {
  if (task.done) return "已完成";
  if (task.status === "locked") return index === 0 ? STEP_FALLBACK_DESCS[index] : "等待解锁";
  return task.actionLabel?.replace(/^继续：/, "") ?? STEP_FALLBACK_DESCS[index];
};

const getRecommendationReason = (scene: SceneListItemResponse) => {
  if (scene.learningStatus === "in_progress") return "可以顺手接着练";
  if (scene.learningStatus === "completed") return "适合回炉巩固";
  if (scene.progressPercent > 0) return "已经有一点熟悉感";
  return "适合今天开一个新场景";
};

const getRecommendationBadge = (scene: SceneListItemResponse) => {
  if (scene.progressPercent >= 100) return "🌿 巩固";
  if (scene.progressPercent >= 40) return "⭐ 继续";
  return "✨ 新鲜";
};

const getContinueStepIcon = (stepLabel: string) => {
  if (stepLabel.includes("听")) return "🎧";
  if (stepLabel.includes("表达")) return "✨";
  if (stepLabel.includes("变体")) return "🌀";
  if (stepLabel.includes("回炉")) return "🔁";
  if (stepLabel.includes("练")) return "🎯";
  return "📘";
};

export function TodayPageClient({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<LearningDashboardResponse>(EMPTY_DASHBOARD);
  const [sceneList, setSceneList] = useState<SceneListItemResponse[]>([]);
  const [recentPhrases, setRecentPhrases] = useState<UserPhraseItemResponse[]>([]);
  const [dashboardDataSource, setDashboardDataSource] = useState<"none" | "cache" | "network">("none");
  const [phraseDataSource, setPhraseDataSource] = useState<"none" | "cache" | "network">("none");
  const [sceneDataSource, setSceneDataSource] = useState<"none" | "cache" | "network">("none");
  const activeLoadTokenRef = useRef(0);

  const refreshData = async (options?: { preferCache?: boolean }) => {
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    const preferCache = options?.preferCache ?? false;

    if (!preferCache) {
      setDashboardDataSource("none");
      setPhraseDataSource("none");
      setSceneDataSource("none");
    }
    setLoading(true);

    let hasCacheFallback = false;
    const canApply = () => activeLoadTokenRef.current === token;

    if (preferCache) {
      try {
        const [dashboardCache, phraseCache, sceneCache] = await Promise.all([
          getLearningDashboardCache(),
          getPhraseListCache({
            query: "",
            status: "saved",
            reviewStatus: "all",
            learningItemType: "expression",
            page: 1,
            limit: 3,
          }),
          getSceneListCache(),
        ]);

        if (canApply()) {
          if (dashboardCache.found && dashboardCache.record) {
            hasCacheFallback = true;
            setDashboard(dashboardCache.record.data);
            setDashboardDataSource("cache");
            setLoading(false);
          }
          if (phraseCache.found && phraseCache.record) {
            hasCacheFallback = true;
            setRecentPhrases(phraseCache.record.data.rows);
            setPhraseDataSource("cache");
            setLoading(false);
          }
          if (sceneCache.found && sceneCache.record) {
            hasCacheFallback = true;
            setSceneList(sceneCache.record.data);
            setSceneDataSource("cache");
            setLoading(false);
          }
        }
      } catch {
        // Ignore cache failures.
      }
    }

    const [dashboardResult, phrasesResult, scenesResult] = await Promise.allSettled([
      getLearningDashboardFromApi(),
      getMyPhrasesFromApi({
        status: "saved",
        reviewStatus: "all",
        learningItemType: "expression",
        page: 1,
        limit: 3,
      }),
      getScenesFromApi(),
    ]);

    if (!canApply()) return;

    let hasNetworkSuccess = false;

    if (dashboardResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setDashboard(dashboardResult.value);
      setDashboardDataSource("network");
      void setLearningDashboardCache(dashboardResult.value).catch(() => undefined);
    }

    if (phrasesResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setRecentPhrases(phrasesResult.value.rows);
      setPhraseDataSource("network");
      void setPhraseListCache(
        {
          query: "",
          status: "saved",
          reviewStatus: "all",
          learningItemType: "expression",
          page: 1,
          limit: 3,
        },
        {
          rows: phrasesResult.value.rows,
          total: phrasesResult.value.total,
          page: phrasesResult.value.page,
          limit: phrasesResult.value.limit,
        },
      ).catch(() => undefined);
    }

    if (scenesResult.status === "fulfilled") {
      hasNetworkSuccess = true;
      setSceneList(scenesResult.value);
      setSceneDataSource("network");
      void setSceneListCache(scenesResult.value).catch(() => undefined);
    }

    if (!hasNetworkSuccess && !hasCacheFallback) {
      const reason =
        dashboardResult.status === "rejected"
          ? dashboardResult.reason
          : phrasesResult.status === "rejected"
            ? phrasesResult.reason
            : scenesResult.status === "rejected"
              ? scenesResult.reason
              : new Error("unknown");
      toast.error(reason instanceof Error ? reason.message : zh.loadFail);
    }

    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshData({ preferCache: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[today-cache][debug]", {
      dashboard: dashboardDataSource,
      phrases: phraseDataSource,
      scenes: sceneDataSource,
      sceneCount: sceneList.length,
      phraseCount: recentPhrases.length,
    });
  }, [dashboardDataSource, phraseDataSource, recentPhrases.length, sceneDataSource, sceneList.length]);

  const continueLearning = useMemo(
    () => resolveContinueLearning(dashboard, sceneList),
    [dashboard, sceneList],
  );

  const dailyTasks = useMemo(
    () =>
      buildTodayTasks({
        dashboard,
        continueLearning,
        labels: {
          taskSceneTitle: zh.taskSceneTitle,
          taskSceneDesc: zh.taskSceneDesc,
          taskReviewTitle: zh.taskReviewTitle,
          taskOutputTitle: zh.taskOutputTitle,
        },
      }),
    [continueLearning, dashboard],
  );

  const recommendedScenes = useMemo(() => getRecommendedScenes(sceneList), [sceneList]);
  const finalDisplayName = displayName || zh.userFallback;
  const continueStepLabel = useMemo(
    () => getContinueLearningStepLabel(continueLearning, dashboard.todayTasks.sceneTask),
    [continueLearning, dashboard.todayTasks.sceneTask],
  );
  const continueHelperText = useMemo(
    () => getContinueLearningHelperText(continueLearning, dashboard.todayTasks.sceneTask),
    [continueLearning, dashboard.todayTasks.sceneTask],
  );
  const continueHref = useMemo(
    () => getContinueLearningHref(continueLearning),
    [continueLearning],
  );
  const continueStepIcon = useMemo(
    () => getContinueStepIcon(continueStepLabel),
    [continueStepLabel],
  );
  const progressPercent = Math.round(
    dashboard.todayTasks.sceneTask.progressPercent || continueLearning?.progressPercent || 0,
  );
  const ringOffset =
    RING_CIRCUMFERENCE - (Math.max(0, Math.min(100, progressPercent)) / 100) * RING_CIRCUMFERENCE;

  const expressionSummary = useMemo(() => {
    const todaySaved = dashboard.todayTasks.outputTask.phrasesSavedToday;
    const sceneSaved = continueLearning?.savedPhraseCount ?? 0;
    const dueReview = dashboard.todayTasks.reviewTask.dueReviewCount;
    const items = [
      todaySaved > 0 ? `today.saved(${todaySaved})` : null,
      sceneSaved > 0 ? `scene.saved(${sceneSaved})` : null,
      dueReview > 0 ? `review.due(${dueReview})` : null,
    ].filter(Boolean) as string[];

    if (items.length === 0) {
      return [
        "还没有新的表达沉淀下来",
        "完成一轮场景输入后，这里会开始积累你今天带走的表达",
      ];
    }

    return items.map((item) => {
      if (item.startsWith("today.saved")) {
        return `今天已带走 ${todaySaved} 条表达`;
      }
      if (item.startsWith("scene.saved")) {
        return `当前场景累计保存 ${sceneSaved} 条表达`;
      }
      return `${dueReview} 条表达正在等待回忆`;
    });
  }, [
    continueLearning?.savedPhraseCount,
    dashboard.todayTasks.outputTask.phrasesSavedToday,
    dashboard.todayTasks.reviewTask.dueReviewCount,
  ]);

  const expressionPreviewItems = useMemo(() => {
    if (recentPhrases.length > 0) {
      return recentPhrases.map((phrase) => ({
        key: phrase.userPhraseId,
        text: phrase.text,
        meta:
          phrase.translation?.trim() ||
          phrase.usageNote?.trim() ||
          (phrase.sourceSceneSlug ? `来自场景 ${phrase.sourceSceneSlug}` : "最近保存"),
      }));
    }

    return expressionSummary.map((line) => ({
      key: line,
      text: line,
      meta: "等待你在场景里继续沉淀",
    }));
  }, [expressionSummary, recentPhrases]);

  useEffect(() => {
    if (!continueLearning) return;
    warmupContinueLearningScene({
      sceneSlug: continueLearning.sceneSlug,
      currentStep: dashboard.todayTasks.sceneTask.currentStep ?? continueLearning.currentStep,
    });
  }, [continueLearning, dashboard.todayTasks.sceneTask.currentStep]);

  return (
    <div className="mx-auto max-w-[500px] space-y-5 px-4 text-[#1E293B]">
      <section className="rounded-[30px] bg-white px-5 py-4 shadow-[0_6px_14px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.35rem] leading-[1.2] font-semibold tracking-[-0.02em] text-[#0F172A]">
              欢迎回来，{finalDisplayName}
            </h2>
            <p className="mt-1 text-[13px] leading-[1.45] text-[#5B6E8C]">
              每天进步一点点，把输入真正变成自己的表达。
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-[#FEF9E3] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[1.35rem]">🔥</span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-[#B45309]">
                  {dashboard.overview.streakDays} <span className="text-xs font-medium">天</span>
                </p>
                <p className="text-[11px] text-[#92400E]">连续学习</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white px-4 py-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
        <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#334155]">
          <span>📋</span>
          <span>今日学习路径</span>
        </div>
        <div className="flex gap-3">
          {dailyTasks.map((task, index) => {
            const variant = getTaskStepVariant(task);
            return (
              <button
                key={task.id}
                type="button"
                disabled={task.status === "locked"}
                className={`flex-1 rounded-[20px] border px-2 py-3 text-center transition ${
                  variant === "completed"
                    ? "border-[#A3E9B0] bg-[#E6F7EC]"
                    : variant === "active"
                      ? "border-[#3B82F6] bg-[#EFF6FF] shadow-[0_2px_6px_rgba(59,130,246,0.1)]"
                      : "border-[#EDF2F7] bg-[#F8FAFE]"
                } ${task.status === "locked" ? "cursor-not-allowed opacity-80" : "active:scale-[0.98]"}`}
                onClick={() => {
                  if (task.status === "locked") return;
                  if (task.id === "task-review") {
                    startReviewSession({ router, source: "today-task" });
                    return;
                  }
                  router.push(task.actionHref);
                }}
              >
                <div className="mb-1 text-[1.5rem]">
                  {variant === "completed" ? "✅" : STEP_ICONS[index] ?? "•"}
                </div>
                <div className="text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#1F2A44]">
                  {task.title}
                </div>
                <div className="mt-1 text-[11px] leading-[1.35] text-[#6C7A91]">
                  {getTaskStepDescription(task, index)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[32px] bg-white px-5 py-5 shadow-[0_12px_24px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.25rem] leading-[1.2] font-extrabold tracking-[-0.03em] text-[#0B2B40]">
              {continueLearning?.title ?? zh.continueEmptyTitle}
            </p>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#6C7A91]">
              {continueLearning?.subtitle ?? zh.continueEmptyDesc}
            </p>
          </div>
          <div className="shrink-0 whitespace-nowrap rounded-full bg-[#EFF6FF] px-3 py-1 text-[11px] font-medium text-[#2563EB]">
            {continueStepIcon} {continueStepLabel}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="relative h-[100px] w-[100px] shrink-0">
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
            <div className="absolute inset-0 flex items-center justify-center text-[1.6rem] font-extrabold text-[#1E293B]">
              {progressPercent}%
            </div>
          </div>
          <div className="min-w-0 flex-1 rounded-[24px] bg-[#F8FAFE] px-4 py-3">
            <p className="text-[14px] font-medium leading-[1.35] text-[#1E293B]">
              📈 当前进度: <strong>{progressPercent}%</strong>
            </p>
            <p className="mt-2 text-[12px] leading-[1.5] text-[#5B6E8C]">
              {continueStepIcon} {continueHelperText}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-full bg-linear-to-r from-[#2563EB] to-[#3B82F6] px-4 py-4 text-base font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] transition active:scale-[0.97]"
          onClick={() => {
            router.push(continueHref);
          }}
        >
          ▶ {continueLearning ? "继续学习" : "去选场景"}
        </button>
      </section>

      <section className="rounded-[30px] bg-white px-5 py-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-[#1F2A44]">
            <span>📘</span>
            <span>已保存表达</span>
            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-medium text-[#2563EB]">
              {dashboard.overview.savedPhraseCount}
            </span>
          </div>
          <Link href="/chunks" className="text-xs font-medium text-[#3B82F6]">
            查看全部 →
          </Link>
        </div>
        <div className="rounded-[20px] bg-[#F9F9FF] px-4 py-3">
          {expressionPreviewItems.map((item) => (
            <div
              key={item.key}
              className="border-b border-dashed border-[#E2E8F0] py-2 text-[13px] font-medium leading-[1.45] text-[#1F2A44] last:border-b-0"
            >
              <div>“{item.text}”</div>
              <div className="mt-1 text-[11px] leading-[1.4] font-normal text-[#7A8699]">
                {item.meta}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-[1.3] text-[#8A99B0]">
          <span aria-hidden="true">📎</span>
          <span>最近沉淀 · 持续复用</span>
        </p>
      </section>

      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-4 rounded-[30px] bg-white px-5 py-5 text-left shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition active:scale-[0.99]"
        onClick={() => {
          startReviewSession({ router, source: "today-task" });
        }}
      >
        <div>
          <div className="text-[1.8rem] font-extrabold text-[#10B981]">
            {dashboard.overview.reviewAccuracy == null ? "--" : `${dashboard.overview.reviewAccuracy}%`}
          </div>
          <p className="text-[11px] leading-[1.35] text-[#5B6E8C]">复习正确率 · 近 7 天</p>
        </div>
        <div
          className={`rounded-full px-4 py-2 text-xs font-medium ${
            dashboard.todayTasks.reviewTask.dueReviewCount > 0
              ? "bg-[#FEF2F2] text-[#DC2626]"
              : "bg-[#E6F7EC] text-[#2E7D32]"
          }`}
        >
          {dashboard.todayTasks.reviewTask.dueReviewCount > 0
            ? `⏰ ${dashboard.todayTasks.reviewTask.dueReviewCount} 条表达待复习`
            : "🎉 当前没有待复习内容"}
        </div>
      </button>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#334155]">
            <span>✨</span>
            <span>推荐下一组场景</span>
          </div>
          <span className="text-[11px] text-[#6C7A91]">轻触卡片切换</span>
        </div>

        {loading && recommendedScenes.length === 0 ? (
          <div className="rounded-[24px] bg-white px-5 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <LoadingState text={zh.sceneLoading} className="py-0" />
          </div>
        ) : recommendedScenes.length === 0 ? (
          <div className="rounded-[24px] bg-white px-5 py-8 text-sm text-[#6C7A91] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            {zh.recEmpty}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recommendedScenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className="min-w-[200px] shrink-0 rounded-[28px] border border-[#EDF2F7] bg-white px-4 py-4 text-left shadow-[0_6px_12px_rgba(0,0,0,0.03)] transition active:scale-[0.98]"
                onClick={() => {
                  router.push(`/scene/${scene.slug}`);
                }}
              >
                <div className="text-[16px] leading-[1.28] font-bold tracking-[-0.02em] text-[#1E293B]">
                  {scene.title}
                </div>
                <div className="mt-2 text-[11px] leading-[1.35] text-[#6C7A91]">
                  ⏰ {scene.estimatedMinutes} 分钟
                </div>
                <div className="mt-3 inline-flex rounded-full bg-[#F1F5F9] px-3 py-1 text-[11px] font-medium text-[#334155]">
                  {getRecommendationReason(scene)}
                </div>
                <div className="mt-2 text-[11px] font-medium text-[#7B8798]">
                  {getRecommendationBadge(scene)}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
