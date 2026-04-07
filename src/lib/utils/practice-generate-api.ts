import {
  PracticeGenerateRequest,
  PracticeGenerateResponse,
} from "@/lib/types/scene-parser";

const PRACTICE_GENERATE_FAILURE_LIMIT = 3;
const PRACTICE_GENERATE_FAILURE_WINDOW_MS = 60_000;
const PRACTICE_GENERATE_FINAL_ERROR = "练习题生成多次失败，请稍后手动重试。";

type PracticeGenerateFailureRecord = {
  count: number;
  firstFailureAt: number;
};

const practiceGenerateFailureMap = new Map<string, PracticeGenerateFailureRecord>();

const isPracticeGenerateResponse = (
  value: unknown,
): value is PracticeGenerateResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as PracticeGenerateResponse;
  return response.version === "v1" && Array.isArray(response.exercises);
};

const buildPracticeGenerateRequestKey = (payload: PracticeGenerateRequest) =>
  [payload.scene.id, payload.scene.slug, payload.exerciseCount].filter(Boolean).join("::");

const getFailureRecord = (requestKey: string, now: number) => {
  const record = practiceGenerateFailureMap.get(requestKey);
  if (!record) return null;
  if (now - record.firstFailureAt > PRACTICE_GENERATE_FAILURE_WINDOW_MS) {
    practiceGenerateFailureMap.delete(requestKey);
    return null;
  }
  return record;
};

const markPracticeGenerateFailure = (requestKey: string, now: number) => {
  const current = getFailureRecord(requestKey, now);
  const nextRecord = current
    ? {
        count: current.count + 1,
        firstFailureAt: current.firstFailureAt,
      }
    : {
        count: 1,
        firstFailureAt: now,
      };
  practiceGenerateFailureMap.set(requestKey, nextRecord);
  return nextRecord;
};

const resetPracticeGenerateFailure = (requestKey: string) => {
  practiceGenerateFailureMap.delete(requestKey);
};

export const resetPracticeGenerateFailureGuardsForTests = () => {
  practiceGenerateFailureMap.clear();
};

export async function practiceGenerateFromApi(
  payload: PracticeGenerateRequest,
  options?: {
    bypassFailureGuard?: boolean;
    now?: () => number;
  },
) {
  const now = options?.now ?? Date.now;
  const requestKey = buildPracticeGenerateRequestKey(payload);
  if (!options?.bypassFailureGuard) {
    const failureRecord = getFailureRecord(requestKey, now());
    if (failureRecord && failureRecord.count >= PRACTICE_GENERATE_FAILURE_LIMIT) {
      throw new Error(PRACTICE_GENERATE_FINAL_ERROR);
    }
  }

  const response = await fetch("/api/practice/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "生成练习题失败，请稍后重试。";
    try {
      const errorBody = (await response.json()) as { error?: string; code?: string };
      if (errorBody?.error) message = errorBody.error;
      if (errorBody?.code === "AUTH_UNAUTHORIZED") {
        message = "请先登录后再生成练习题。";
      }
      if (errorBody?.code === "AUTH_FORBIDDEN") {
        message = "你暂无权限生成练习题。";
      }
    } catch {
      // Keep fallback message.
    }
    const failureRecord = markPracticeGenerateFailure(requestKey, now());
    if (!options?.bypassFailureGuard && failureRecord.count >= PRACTICE_GENERATE_FAILURE_LIMIT) {
      throw new Error(PRACTICE_GENERATE_FINAL_ERROR);
    }
    throw new Error(message);
  }

  const data = (await response.json()) as unknown;
  if (!isPracticeGenerateResponse(data)) {
    const failureRecord = markPracticeGenerateFailure(requestKey, now());
    if (!options?.bypassFailureGuard && failureRecord.count >= PRACTICE_GENERATE_FAILURE_LIMIT) {
      throw new Error(PRACTICE_GENERATE_FINAL_ERROR);
    }
    throw new Error("练习题返回格式无效。");
  }

  resetPracticeGenerateFailure(requestKey);
  return data.exercises;
}
