import { DailyTask } from "@/lib/types";
import { LearningDashboardResponse } from "@/lib/utils/learning-api";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

type ContinueLearningItem = NonNullable<LearningDashboardResponse["continueLearning"]>;

export const resolveContinueLearning = (
  dashboard: LearningDashboardResponse,
  sceneList: SceneListItemResponse[],
): ContinueLearningItem | null =>
  dashboard.continueLearning ??
  (sceneList[0]
    ? {
        sceneSlug: sceneList[0].slug,
        title: sceneList[0].title,
        subtitle: sceneList[0].subtitle,
        progressPercent: sceneList[0].progressPercent,
        lastViewedAt: sceneList[0].lastViewedAt,
        lastSentenceIndex: null,
        estimatedMinutes: sceneList[0].estimatedMinutes,
        savedPhraseCount: 0,
      }
    : null);

export const buildTodayTasks = ({
  dashboard,
  continueLearning,
  labels,
}: {
  dashboard: LearningDashboardResponse;
  continueLearning: ContinueLearningItem | null;
  labels: {
    taskSceneTitle: string;
    taskSceneDesc: string;
    taskReviewTitle: string;
    taskOutputTitle: string;
  };
}): DailyTask[] => [
  {
    id: "task-scene",
    title: labels.taskSceneTitle,
    description: continueLearning
      ? `继续 ${continueLearning.title}，推进到 100%。`
      : labels.taskSceneDesc,
    durationMinutes: continueLearning?.estimatedMinutes ?? 12,
    done: dashboard.todayTasks.sceneTask.done,
    actionHref: continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes",
  },
  {
    id: "task-review",
    title: labels.taskReviewTitle,
    description:
      dashboard.todayTasks.reviewTask.dueReviewCount > 0
        ? `当前待复习 ${dashboard.todayTasks.reviewTask.dueReviewCount} 条，今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条。`
        : `今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条复习。`,
    durationMinutes: 8,
    done: dashboard.todayTasks.reviewTask.done,
    actionHref: "/review",
  },
  {
    id: "task-output",
    title: labels.taskOutputTitle,
    description: `今日已累计保存 ${dashboard.todayTasks.outputTask.phrasesSavedToday} 条表达。`,
    durationMinutes: 4,
    done: dashboard.todayTasks.outputTask.done,
    actionHref: "/chunks",
  },
];

export const getRecommendedScenes = (sceneList: SceneListItemResponse[], limit = 2) =>
  sceneList.slice(0, limit);
