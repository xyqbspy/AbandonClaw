import { clearLearningDashboardCache } from "@/lib/cache/learning-dashboard-cache";

interface ApiErrorBody {
  error?: string;
}

const toApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.error === "string" && body.error.trim()) {
      return new Error(body.error);
    }
  } catch {
    // Ignore parse error.
  }
  return new Error(fallback);
};

export interface SceneLearningProgressResponse {
  progress: {
    id: string;
    sceneId: string;
    status: "not_started" | "in_progress" | "completed" | "paused";
    progressPercent: number;
    masteryStage:
      | "listening"
      | "focus"
      | "sentence_practice"
      | "scene_practice"
      | "variant_unlocked"
      | "mastered";
    masteryPercent: number;
    focusedExpressionCount: number;
    practicedSentenceCount: number;
    scenePracticeCount: number;
    variantUnlockedAt: string | null;
    lastSentenceIndex: number | null;
    lastVariantIndex: number | null;
    startedAt: string | null;
    lastViewedAt: string | null;
    completedAt: string | null;
    lastPracticedAt: string | null;
    totalStudySeconds: number;
    todayStudySeconds: number;
    savedPhraseCount: number;
    createdAt: string;
    updatedAt: string;
  };
  session: {
    id: string;
    sceneId: string;
    currentStep:
      | "listen"
      | "focus_expression"
      | "practice_sentence"
      | "scene_practice"
      | "done";
    selectedBlockId: string | null;
    fullPlayCount: number;
    openedExpressionCount: number;
    practicedSentenceCount: number;
    scenePracticeCompleted: boolean;
    isDone: boolean;
    startedAt: string;
    endedAt: string | null;
    lastActiveAt: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface UpdateSceneLearningProgressPayload {
  progressPercent?: number;
  lastSentenceIndex?: number;
  lastVariantIndex?: number;
  studySecondsDelta?: number;
  savedPhraseDelta?: number;
}

const withDashboardCacheInvalidation = async <T>(task: () => Promise<T>) => {
  const result = await task();
  void clearLearningDashboardCache().catch(() => {
    // Non-blocking.
  });
  return result;
};

export async function startSceneLearningFromApi(sceneSlug: string) {
  return withDashboardCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/start`, {
      method: "POST",
    });
    if (!response.ok) {
      throw await toApiError(response, "\u5f00\u59cb\u573a\u666f\u5b66\u4e60\u5931\u8d25\u3002");
    }
    return (await response.json()) as SceneLearningProgressResponse;
  });
}

export async function updateSceneLearningProgressFromApi(
  sceneSlug: string,
  payload: UpdateSceneLearningProgressPayload,
) {
  return withDashboardCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await toApiError(response, "\u66f4\u65b0\u573a\u666f\u5b66\u4e60\u8fdb\u5ea6\u5931\u8d25\u3002");
    }
    return (await response.json()) as SceneLearningProgressResponse;
  });
}

export async function pauseSceneLearningFromApi(sceneSlug: string) {
  return withDashboardCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/pause`, {
      method: "POST",
    });
    if (!response.ok) {
      throw await toApiError(response, "\u6682\u505c\u573a\u666f\u5b66\u4e60\u5931\u8d25\u3002");
    }
    return (await response.json()) as SceneLearningProgressResponse;
  });
}

export async function completeSceneLearningFromApi(
  sceneSlug: string,
  payload?: {
    studySecondsDelta?: number;
    savedPhraseDelta?: number;
  },
) {
  return withDashboardCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
    if (!response.ok) {
      throw await toApiError(response, "\u5b8c\u6210\u573a\u666f\u5b66\u4e60\u5931\u8d25\u3002");
    }
    return (await response.json()) as SceneLearningProgressResponse;
  });
}

export async function recordSceneTrainingEventFromApi(
  sceneSlug: string,
  payload: {
    event:
      | "full_play"
      | "open_expression"
      | "practice_sentence"
      | "scene_practice_complete";
    selectedBlockId?: string;
  },
) {
  return withDashboardCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await toApiError(response, "记录场景训练步骤失败。");
    }
    return (await response.json()) as SceneLearningProgressResponse;
  });
}

export interface LearningDashboardOverviewResponse {
  streakDays: number;
  completedScenesCount: number;
  inProgressScenesCount: number;
  savedPhraseCount: number;
  recentStudyMinutes: number;
  reviewAccuracy: number | null;
}

export interface LearningDashboardContinueResponse {
  sceneSlug: string;
  title: string;
  subtitle: string | null;
  progressPercent: number;
  masteryStage:
    | "listening"
    | "focus"
    | "sentence_practice"
    | "scene_practice"
    | "variant_unlocked"
    | "mastered";
  masteryPercent: number;
  lastViewedAt: string | null;
  lastSentenceIndex: number | null;
  estimatedMinutes: number | null;
  savedPhraseCount: number;
}

export interface LearningDashboardTasksResponse {
  sceneTask: {
    done: boolean;
    continueSceneSlug: string | null;
  };
  reviewTask: {
    done: boolean;
    reviewItemsCompleted: number;
    dueReviewCount: number;
  };
  outputTask: {
    done: boolean;
    phrasesSavedToday: number;
  };
}

export interface LearningDashboardResponse {
  overview: LearningDashboardOverviewResponse;
  continueLearning: LearningDashboardContinueResponse | null;
  todayTasks: LearningDashboardTasksResponse;
}

export async function getLearningDashboardFromApi() {
  const response = await fetch("/api/learning/dashboard", { method: "GET" });
  if (!response.ok) {
    throw await toApiError(response, "\u52a0\u8f7d\u4eca\u65e5\u5b66\u4e60\u6570\u636e\u5931\u8d25\u3002");
  }
  return (await response.json()) as LearningDashboardResponse;
}
