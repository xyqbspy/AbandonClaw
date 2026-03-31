import {
  invalidateAfterSceneLearningMutation,
  invalidateAfterScenePracticeMutation,
} from "@/lib/utils/cache-actions";

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
    completedSentenceCount: number;
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
    completedSentenceCount: number;
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

export interface ScenePracticeRunResponse {
  run: {
    id: string;
    sceneId: string;
    sessionId: string | null;
    practiceSetId: string;
    sourceType: "original" | "variant";
    sourceVariantId: string | null;
    status: "in_progress" | "completed" | "abandoned";
    currentMode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
    completedModes: Array<"cloze" | "guided_recall" | "sentence_recall" | "full_dictation">;
    startedAt: string;
    completedAt: string | null;
    lastActiveAt: string;
    createdAt: string;
    updatedAt: string;
  };
  learningState?: SceneLearningProgressResponse | null;
}

export interface ScenePracticeAttemptResponse extends ScenePracticeRunResponse {
  attempt: {
    id: string;
    runId: string;
    sceneId: string;
    sessionId: string | null;
    practiceSetId: string;
    mode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
    exerciseId: string;
    sentenceId: string | null;
    userAnswer: string;
    assessmentLevel: "incorrect" | "keyword" | "structure" | "complete";
    isCorrect: boolean;
    attemptIndex: number;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  };
}

export interface ScenePracticeSnapshotResponse {
  run: ScenePracticeRunResponse["run"] | null;
  latestAttempt: ScenePracticeAttemptResponse["attempt"] | null;
  summary: {
    completedModeCount: number;
    totalAttemptCount: number;
    correctAttemptCount: number;
    latestAssessmentLevel: "incorrect" | "keyword" | "structure" | "complete" | null;
  };
}

export interface SceneVariantRunResponse {
  run: {
    id: string;
    sceneId: string;
    sessionId: string | null;
    variantSetId: string;
    activeVariantId: string | null;
    viewedVariantIds: string[];
    status: "in_progress" | "completed" | "abandoned";
    startedAt: string;
    completedAt: string | null;
    lastActiveAt: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

const withSceneLearningCacheInvalidation = async <T>(task: () => Promise<T>) => {
  const result = await task();
  invalidateAfterSceneLearningMutation();
  return result;
};

const withScenePracticeCacheInvalidation = async <T>(task: () => Promise<T>) => {
  const result = await task();
  invalidateAfterScenePracticeMutation();
  return result;
};

export async function startSceneLearningFromApi(sceneSlug: string) {
  return withSceneLearningCacheInvalidation(async () => {
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
  return withSceneLearningCacheInvalidation(async () => {
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
  return withSceneLearningCacheInvalidation(async () => {
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
  return withSceneLearningCacheInvalidation(async () => {
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
      | "sentence_completed"
      | "scene_practice_complete";
    selectedBlockId?: string;
  },
) {
  return withSceneLearningCacheInvalidation(async () => {
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

export async function startScenePracticeRunFromApi(
  sceneSlug: string,
  payload: {
    practiceSetId: string;
    mode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
    sourceType: "original" | "variant";
    sourceVariantId?: string | null;
  },
) {
  return withScenePracticeCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/practice/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await toApiError(response, "启动场景练习失败。");
    }
    return (await response.json()) as ScenePracticeRunResponse;
  });
}

export async function getScenePracticeSnapshotFromApi(
  sceneSlug: string,
  params?: {
    practiceSetId?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.practiceSetId) search.set("practiceSetId", params.practiceSetId);
  const query = search.toString();
  const response = await fetch(
    `/api/learning/scenes/${encodeURIComponent(sceneSlug)}/practice/run${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw await toApiError(response, "读取练习进度失败。");
  }
  return (await response.json()) as ScenePracticeSnapshotResponse;
}

export async function recordScenePracticeAttemptFromApi(
  sceneSlug: string,
  payload: {
    practiceSetId: string;
    mode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
    sourceType: "original" | "variant";
    sourceVariantId?: string | null;
    exerciseId: string;
    sentenceId?: string | null;
    userAnswer: string;
    assessmentLevel: "incorrect" | "keyword" | "structure" | "complete";
    isCorrect: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  return withScenePracticeCacheInvalidation(async () => {
    const response = await fetch(
      `/api/learning/scenes/${encodeURIComponent(sceneSlug)}/practice/attempt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      throw await toApiError(response, "记录练习作答失败。");
    }
    return (await response.json()) as ScenePracticeAttemptResponse;
  });
}

export async function markScenePracticeModeCompleteFromApi(
  sceneSlug: string,
  payload: {
    practiceSetId: string;
    mode: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
    nextMode?: "cloze" | "guided_recall" | "sentence_recall" | "full_dictation";
  },
) {
  return withScenePracticeCacheInvalidation(async () => {
    const response = await fetch(
      `/api/learning/scenes/${encodeURIComponent(sceneSlug)}/practice/mode-complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      throw await toApiError(response, "更新练习模块状态失败。");
    }
    return (await response.json()) as ScenePracticeRunResponse;
  });
}

export async function completeScenePracticeRunFromApi(
  sceneSlug: string,
  payload: {
    practiceSetId: string;
  },
) {
  return withScenePracticeCacheInvalidation(async () => {
    const response = await fetch(
      `/api/learning/scenes/${encodeURIComponent(sceneSlug)}/practice/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      throw await toApiError(response, "完成练习 run 失败。");
    }
    return (await response.json()) as ScenePracticeRunResponse;
  });
}

export async function startSceneVariantRunFromApi(
  sceneSlug: string,
  payload: {
    variantSetId: string;
    activeVariantId?: string | null;
  },
) {
  return withSceneLearningCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/variants/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await toApiError(response, "启动场景变体训练失败。");
    }
    return (await response.json()) as SceneVariantRunResponse;
  });
}

export async function getSceneVariantRunSnapshotFromApi(
  sceneSlug: string,
  params?: {
    variantSetId?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.variantSetId) search.set("variantSetId", params.variantSetId);
  const query = search.toString();
  const response = await fetch(
    `/api/learning/scenes/${encodeURIComponent(sceneSlug)}/variants/run${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw await toApiError(response, "读取场景变体训练进度失败。");
  }
  return (await response.json()) as SceneVariantRunResponse;
}

export async function recordSceneVariantViewFromApi(
  sceneSlug: string,
  payload: {
    variantSetId: string;
    variantId: string;
  },
) {
  return withSceneLearningCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/variants/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await toApiError(response, "记录变体查看状态失败。");
    }
    return (await response.json()) as SceneVariantRunResponse;
  });
}

export async function completeSceneVariantRunFromApi(
  sceneSlug: string,
  payload: {
    variantSetId: string;
  },
) {
  return withSceneLearningCacheInvalidation(async () => {
    const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/variants/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw await toApiError(response, "完成场景变体训练失败。");
    }
    return (await response.json()) as SceneVariantRunResponse;
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
  currentStep:
    | "listen"
    | "focus_expression"
    | "practice_sentence"
    | "scene_practice"
    | "done"
    | null;
  lastViewedAt: string | null;
  lastSentenceIndex: number | null;
  estimatedMinutes: number | null;
  savedPhraseCount: number;
  completedSentenceCount: number;
  repeatMode?: "practice" | "variants" | null;
  isRepeat?: boolean;
}

export interface LearningDashboardTasksResponse {
  sceneTask: {
    done: boolean;
    continueSceneSlug: string | null;
    currentStep:
      | "listen"
      | "focus_expression"
      | "practice_sentence"
      | "scene_practice"
      | "done"
      | null;
    masteryStage:
      | "listening"
      | "focus"
      | "sentence_practice"
      | "scene_practice"
      | "variant_unlocked"
      | "mastered"
      | null;
    progressPercent: number;
    completedSentenceCount: number;
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
