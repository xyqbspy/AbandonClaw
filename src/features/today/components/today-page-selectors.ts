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
        masteryStage: "listening",
        masteryPercent: Math.min(sceneList[0].progressPercent, 20),
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
}): DailyTask[] => {
  const sceneDone = dashboard.todayTasks.sceneTask.done;
  const outputDone = dashboard.todayTasks.outputTask.done;
  const reviewDone = dashboard.todayTasks.reviewTask.done;

  const sceneTask: DailyTask = {
    id: "task-scene",
    title: labels.taskSceneTitle,
    description: continueLearning
      ? `继续 ${continueLearning.title}，完成本轮场景学习。`
      : labels.taskSceneDesc,
    durationMinutes: continueLearning?.estimatedMinutes ?? 12,
    done: sceneDone,
    actionHref: continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes",
    status: sceneDone ? "done" : "up_next",
    actionLabel: sceneDone
      ? "已完成"
      : `开始（${continueLearning?.estimatedMinutes ?? 12} 分钟）`,
  };

  const outputTask: DailyTask = {
    id: "task-output",
    title: labels.taskOutputTitle,
    description: sceneDone
      ? `今天已沉淀 ${dashboard.todayTasks.outputTask.phrasesSavedToday} 条表达。`
      : "先完成一个场景学习，再沉淀今天想带走的表达。",
    durationMinutes: 4,
    done: outputDone,
    actionHref: "/chunks",
    status: outputDone ? "done" : sceneDone ? "up_next" : "locked",
    actionLabel: outputDone ? "已完成" : sceneDone ? "去沉淀" : "先完成场景",
  };

  const reviewTask: DailyTask = {
    id: "task-review",
    title: labels.taskReviewTitle,
    description: sceneDone
      ? dashboard.todayTasks.reviewTask.dueReviewCount > 0
        ? `当前待复习 ${dashboard.todayTasks.reviewTask.dueReviewCount} 条，今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条。`
        : `今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条复习。`
      : "先完成今天的场景输入，再进入复习会更顺。",
    durationMinutes: 8,
    done: reviewDone,
    actionHref: "/review",
    status: reviewDone ? "done" : sceneDone ? (outputDone ? "up_next" : "available") : "locked",
    actionLabel: reviewDone ? "已完成" : sceneDone ? "去复习" : "先完成场景",
  };

  return [sceneTask, outputTask, reviewTask];
};

export const getRecommendedScenes = (sceneList: SceneListItemResponse[], limit = 2) =>
  sceneList.slice(0, limit);
