import { DailyTask } from "@/lib/types";
import { LearningDashboardResponse } from "@/lib/utils/learning-api";
import { getSceneGeneratedState } from "@/lib/utils/scene-learning-flow-storage";
import { SceneListItemResponse } from "@/lib/utils/scenes-api";

type ContinueLearningItem = NonNullable<LearningDashboardResponse["continueLearning"]>;
type LocalRepeatMode = "practice" | "variants";
type ResolvedContinueLearningItem = ContinueLearningItem & {
  repeatMode?: LocalRepeatMode | null;
  isRepeat?: boolean;
};
type ContinueCurrentStep = ContinueLearningItem["currentStep"];
type ContinueMasteryStage = ContinueLearningItem["masteryStage"];

const SCENE_STEP_LABELS: Record<NonNullable<ContinueCurrentStep>, string> = {
  listen: "听熟这段",
  focus_expression: "看重点表达",
  practice_sentence: "练核心句",
  scene_practice: "开始练这段",
  done: "本轮已完成",
};

const MASTERY_STAGE_LABELS: Record<ContinueMasteryStage, string> = {
  listening: "先听熟场景",
  focus: "抓到重点表达",
  sentence_practice: "开始练核心句",
  scene_practice: "进入整段练习",
  variant_unlocked: "可以解锁变体",
  mastered: "这一组已熟练",
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
        const repeatCandidate: ResolvedContinueLearningItem & {
          repeatStartedAt: string;
        } = {
          sceneSlug: scene.slug,
          title: scene.title,
          subtitle: scene.subtitle,
          progressPercent: Math.max(100, scene.progressPercent),
          masteryStage: "mastered" as const,
          masteryPercent: 100,
          currentStep: "done" as const,
          lastViewedAt: latestVariantSet.createdAt,
          lastSentenceIndex: null,
          estimatedMinutes: scene.estimatedMinutes,
          savedPhraseCount: 0,
          repeatMode: "variants" as const,
          isRepeat: true,
          repeatStartedAt: latestVariantSet.createdAt,
        };
        repeatCandidates.push(repeatCandidate);
        return;
      }

      if (latestPracticeSet?.status === "generated") {
        const repeatCandidate: ResolvedContinueLearningItem & {
          repeatStartedAt: string;
        } = {
          sceneSlug: scene.slug,
          title: scene.title,
          subtitle: scene.subtitle,
          progressPercent: Math.max(100, scene.progressPercent),
          masteryStage: "mastered" as const,
          masteryPercent: 100,
          currentStep: "scene_practice" as const,
          lastViewedAt: latestPracticeSet.createdAt,
          lastSentenceIndex: null,
          estimatedMinutes: scene.estimatedMinutes,
          savedPhraseCount: 0,
          repeatMode: "practice" as const,
          isRepeat: true,
          repeatStartedAt: latestPracticeSet.createdAt,
        };
        repeatCandidates.push(repeatCandidate);
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
  const [{ repeatStartedAt: _repeatStartedAt, ...candidate }] = repeatCandidates;
  return candidate;
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
    return SCENE_STEP_LABELS[sceneTask.currentStep];
  }
  if (sceneTask.masteryStage) {
    return MASTERY_STAGE_LABELS[sceneTask.masteryStage];
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
    return SCENE_STEP_LABELS[continueLearning.currentStep];
  }
  return MASTERY_STAGE_LABELS[continueLearning.masteryStage];
};

export const getContinueLearningHelperText = (
  continueLearning: ResolvedContinueLearningItem | null,
  sceneTask?: LearningDashboardResponse["todayTasks"]["sceneTask"],
) => {
  if (!continueLearning) {
    return "先完成一个场景输入，再带走表达，最后做一轮回忆。";
  }

  if (continueLearning.repeatMode === "practice") {
    return "这不是第一次输入了，直接回到场景练习，把这一段再提取一轮。";
  }

  if (continueLearning.repeatMode === "variants") {
    return "基础链路已经走完，这一轮是回炉巩固，继续把核心表达迁移到变体里。";
  }

  const stepLabel = getContinueLearningStepLabel(continueLearning, sceneTask);
  const progressPercent = sceneTask?.progressPercent ?? continueLearning.progressPercent;
  if ((sceneTask?.currentStep ?? continueLearning.currentStep) === "done") {
    return "这轮基础训练已经完成，可以去沉淀表达或进入复习。";
  }
  return `当前先${stepLabel}，已经推进到 ${Math.round(progressPercent)}%。`;
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
    actionHref: continueLearning ? `/scene/${continueLearning.sceneSlug}` : "/scenes",
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
          : "今天先做一轮短回忆，帮助刚学过的表达留下来。"
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

export const getRecommendedScenes = (sceneList: SceneListItemResponse[], limit = 2) =>
  sceneList.slice(0, limit);
