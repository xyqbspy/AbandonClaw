import { DailyTask } from "@/lib/types";
import {
  getSceneMasteryStageLabel,
  getSceneProgressStepLabel,
} from "@/lib/shared/scene-progression";
import { LearningDashboardResponse } from "@/lib/utils/learning-api";
import { getSceneGeneratedState } from "@/lib/utils/scene-learning-flow-storage";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

type ContinueLearningItem = NonNullable<LearningDashboardResponse["continueLearning"]>;
type LocalRepeatMode = "practice" | "variants";

export type ResolvedContinueLearningItem = ContinueLearningItem & {
  repeatMode?: LocalRepeatMode | null;
  isRepeat?: boolean;
};

const buildFallbackContinueLearning = (
  sceneList: SceneListItemResponse[],
): ResolvedContinueLearningItem | null => {
  if (!sceneList[0]) return null;
  return {
    sceneSlug: sceneList[0].slug,
    title: sceneList[0].title,
    subtitle: sceneList[0].subtitle,
    progressPercent: sceneList[0].progressPercent,
    masteryStage: "listening",
    masteryPercent: Math.min(sceneList[0].progressPercent, 20),
    currentStep: null,
    lastViewedAt: sceneList[0].lastViewedAt,
    lastSentenceIndex: null,
    estimatedMinutes: sceneList[0].estimatedMinutes,
    savedPhraseCount: 0,
    completedSentenceCount: 0,
    repeatMode: null,
    isRepeat: false,
  };
};

const buildRepeatContinueCandidate = (
  sceneList: SceneListItemResponse[],
): ResolvedContinueLearningItem | null => {
  const repeatCandidates: Array<
    ResolvedContinueLearningItem & {
      repeatStartedAt: string;
    }
  > = [];

  sceneList
    .filter((scene) => scene.learningStatus === "completed")
    .forEach((scene) => {
      const generatedState = getSceneGeneratedState(scene.id);
      const latestVariantSet = generatedState.latestVariantSet;
      const latestPracticeSet = generatedState.latestPracticeSet;

      if (latestVariantSet?.status === "generated") {
        repeatCandidates.push({
          sceneSlug: scene.slug,
          title: scene.title,
          subtitle: scene.subtitle,
          progressPercent: Math.max(100, scene.progressPercent),
          masteryStage: "mastered",
          masteryPercent: 100,
          currentStep: "done",
          lastViewedAt: latestVariantSet.createdAt,
          lastSentenceIndex: null,
          estimatedMinutes: scene.estimatedMinutes,
          savedPhraseCount: 0,
          completedSentenceCount: 0,
          repeatMode: "variants",
          isRepeat: true,
          repeatStartedAt: latestVariantSet.createdAt,
        });
        return;
      }

      if (latestPracticeSet?.status === "generated") {
        repeatCandidates.push({
          sceneSlug: scene.slug,
          title: scene.title,
          subtitle: scene.subtitle,
          progressPercent: Math.max(100, scene.progressPercent),
          masteryStage: "mastered",
          masteryPercent: 100,
          currentStep: "scene_practice",
          lastViewedAt: latestPracticeSet.createdAt,
          lastSentenceIndex: null,
          estimatedMinutes: scene.estimatedMinutes,
          savedPhraseCount: 0,
          completedSentenceCount: 0,
          repeatMode: "practice",
          isRepeat: true,
          repeatStartedAt: latestPracticeSet.createdAt,
        });
      }
    });

  repeatCandidates.sort((left, right) => {
    const timeDelta =
      new Date(right.repeatStartedAt).getTime() - new Date(left.repeatStartedAt).getTime();
    if (timeDelta !== 0) return timeDelta;
    if (left.repeatMode === right.repeatMode) return 0;
    return left.repeatMode === "variants" ? -1 : 1;
  });

  if (repeatCandidates.length === 0) return null;
  const [latestCandidate] = repeatCandidates;
  if (!latestCandidate) return null;
  return {
    sceneSlug: latestCandidate.sceneSlug,
    title: latestCandidate.title,
    subtitle: latestCandidate.subtitle,
    progressPercent: latestCandidate.progressPercent,
    masteryStage: latestCandidate.masteryStage,
    masteryPercent: latestCandidate.masteryPercent,
    currentStep: latestCandidate.currentStep,
    lastViewedAt: latestCandidate.lastViewedAt,
    lastSentenceIndex: latestCandidate.lastSentenceIndex,
    estimatedMinutes: latestCandidate.estimatedMinutes,
    savedPhraseCount: latestCandidate.savedPhraseCount,
    completedSentenceCount: latestCandidate.completedSentenceCount,
    repeatMode: latestCandidate.repeatMode,
    isRepeat: latestCandidate.isRepeat,
  };
};

export const resolveContinueLearning = (
  dashboard: LearningDashboardResponse,
  sceneList: SceneListItemResponse[],
): ResolvedContinueLearningItem | null =>
  (dashboard.continueLearning as ResolvedContinueLearningItem | null) ??
  buildRepeatContinueCandidate(sceneList) ??
  buildFallbackContinueLearning(sceneList);

const resolveStepLabelFromSceneTask = (
  sceneTask: LearningDashboardResponse["todayTasks"]["sceneTask"],
) => {
  if (sceneTask.currentStep) {
    return getSceneProgressStepLabel(sceneTask.currentStep);
  }
  if (sceneTask.masteryStage) {
    return getSceneMasteryStageLabel(sceneTask.masteryStage);
  }
  return null;
};

export const getContinueLearningStepLabel = (
  continueLearning: ResolvedContinueLearningItem | null,
  sceneTask?: LearningDashboardResponse["todayTasks"]["sceneTask"],
) => {
  if (continueLearning?.repeatMode === "practice") return "回炉练场景练习";
  if (continueLearning?.repeatMode === "variants") return "回炉练变体训练";

  const taskLabel = sceneTask ? resolveStepLabelFromSceneTask(sceneTask) : null;
  if (taskLabel) return taskLabel;
  if (!continueLearning) return "开始一个新场景";
  if (continueLearning.currentStep) {
    return getSceneProgressStepLabel(continueLearning.currentStep) ?? "开始一个新场景";
  }
  return getSceneMasteryStageLabel(continueLearning.masteryStage) ?? "开始一个新场景";
};

export const getContinueLearningHelperText = (
  continueLearning: ResolvedContinueLearningItem | null,
  sceneTask?: LearningDashboardResponse["todayTasks"]["sceneTask"],
) => {
  if (!continueLearning) {
    return "先完成一个场景输入，再带走表达，最后做一轮回忆，让今天的学习真正留下来。";
  }

  if (continueLearning.repeatMode === "practice") {
    return "这不是第一次输入了，直接回到场景练习，把这一段再主动提取一轮。";
  }

  if (continueLearning.repeatMode === "variants") {
    return "基础链路已经走完，这一轮是回炉巩固，把核心表达迁移到变体里继续练稳。";
  }

  const stepLabel = getContinueLearningStepLabel(continueLearning, sceneTask);
  const progressPercent = sceneTask?.progressPercent ?? continueLearning.progressPercent;
  const currentStep = sceneTask?.currentStep ?? continueLearning.currentStep;
  if (currentStep === "practice_sentence") {
    return `当前先${stepLabel}，至少先把一句推进到完整复现，再继续收束整轮练习。`;
  }
  if (currentStep === "scene_practice") {
    return `当前先${stepLabel}，把这一轮题型完整做完，再进入后续沉淀或变体。`;
  }
  if (currentStep === "done") {
    return "这轮基础训练已经完成，可以去沉淀表达，或者直接进入回忆复习。";
  }
  return `当前先${stepLabel}，已经推进到 ${Math.round(progressPercent)}%，继续一口气把今天这轮做顺。`;
};

export const getContinueLearningHref = (
  continueLearning: ResolvedContinueLearningItem | null,
) => {
  if (!continueLearning) return "/scenes";
  if (continueLearning.repeatMode === "practice") {
    return `/scene/${continueLearning.sceneSlug}?view=practice`;
  }
  if (continueLearning.repeatMode === "variants") {
    return `/scene/${continueLearning.sceneSlug}?view=variants`;
  }
  return `/scene/${continueLearning.sceneSlug}`;
};

export const getContinueLearningCardState = ({
  continueLearning,
  sceneTask,
  isPending,
  emptyTitle,
  emptyDesc,
}: {
  continueLearning: ResolvedContinueLearningItem | null;
  sceneTask: LearningDashboardResponse["todayTasks"]["sceneTask"];
  isPending: boolean;
  emptyTitle: string;
  emptyDesc: string;
}) => {
  if (isPending) {
    return {
      title: "正在恢复今天的学习进度",
      subtitle: "稍等一下，正在同步你上次学到的场景和步骤。",
      stepLabel: "正在加载",
      helperText: "正在恢复继续学习入口，避免把你暂时带回开始新场景。",
      href: "#",
      ctaLabel: "正在恢复进度...",
      isPending: true,
    };
  }

  return {
    title: continueLearning?.title ?? emptyTitle,
    subtitle: continueLearning?.subtitle ?? emptyDesc,
    stepLabel: getContinueLearningStepLabel(continueLearning, sceneTask),
    helperText: getContinueLearningHelperText(continueLearning, sceneTask),
    href: getContinueLearningHref(continueLearning),
    ctaLabel: continueLearning ? "继续学习" : "去选场景",
    isPending: false,
  };
};

export const buildTodayTasks = ({
  dashboard,
  continueLearning,
  labels,
}: {
  dashboard: LearningDashboardResponse;
  continueLearning: ResolvedContinueLearningItem | null;
  labels: {
    taskSceneTitle: string;
    taskSceneDesc: string;
    taskReviewTitle: string;
    taskOutputTitle: string;
  };
}): DailyTask[] => {
  const sceneTaskState = dashboard.todayTasks.sceneTask;
  const isRepeatContinue = continueLearning?.isRepeat === true;
  const sceneDone = isRepeatContinue ? false : sceneTaskState.done;
  const sceneReadyForDownstream = sceneTaskState.done || isRepeatContinue;
  const outputDone = dashboard.todayTasks.outputTask.done;
  const reviewDone = dashboard.todayTasks.reviewTask.done;
  const continueStepLabel = getContinueLearningStepLabel(continueLearning, sceneTaskState);

  const sceneTask: DailyTask = {
    id: "task-scene",
    title: labels.taskSceneTitle,
    description: continueLearning
      ? isRepeatContinue
        ? `回到 ${continueLearning.title}，这一轮先${continueStepLabel}。`
        : `继续 ${continueLearning.title}，当前先${continueStepLabel}。`
      : labels.taskSceneDesc,
    durationMinutes: continueLearning?.estimatedMinutes ?? 12,
    done: sceneDone,
    actionHref: getContinueLearningHref(continueLearning),
    status: sceneDone ? "done" : "up_next",
    actionLabel: sceneDone ? "已完成" : `继续：${continueStepLabel}`,
  };

  const outputTask: DailyTask = {
    id: "task-output",
    title: labels.taskOutputTitle,
    description: outputDone
      ? `今天已带走 ${dashboard.todayTasks.outputTask.phrasesSavedToday} 条表达。`
      : sceneReadyForDownstream
        ? "从刚学完的场景里带走 1 到 2 条最想复用的表达。"
        : "先完成一轮场景输入，再把今天最值得带走的表达沉淀下来。",
    durationMinutes: 4,
    done: outputDone,
    actionHref: "/chunks",
    status: outputDone ? "done" : sceneReadyForDownstream ? "up_next" : "locked",
    actionLabel: outputDone ? "已完成" : sceneReadyForDownstream ? "去带走表达" : "先完成场景输入",
  };

  const reviewTask: DailyTask = {
    id: "task-review",
    title: labels.taskReviewTitle,
    description: reviewDone
      ? dashboard.todayTasks.reviewTask.reviewItemsCompleted > 0
        ? `今天已完成 ${dashboard.todayTasks.reviewTask.reviewItemsCompleted} 条回忆练习。`
        : "今天没有待复习内容。"
      : sceneReadyForDownstream
        ? dashboard.todayTasks.reviewTask.dueReviewCount > 0
          ? `当前待回忆 ${dashboard.todayTasks.reviewTask.dueReviewCount} 条，做一轮把输入变成可提取能力。`
          : "今天先做一轮短回忆，帮助刚学过的表达真正留下来。"
        : "先完成场景输入和表达沉淀，再进入回忆环节会更顺。",
    durationMinutes: 8,
    done: reviewDone,
    actionHref: "/review",
    status: reviewDone
      ? "done"
      : sceneReadyForDownstream
        ? outputDone
          ? "up_next"
          : "available"
        : "locked",
    actionLabel: reviewDone ? "已完成" : sceneReadyForDownstream ? "去做回忆" : "先完成前两步",
  };

  return [sceneTask, outputTask, reviewTask];
};

export const getRecommendedScenes = (sceneList: SceneListItemResponse[], limit = 3) =>
  sceneList.slice(0, limit);
