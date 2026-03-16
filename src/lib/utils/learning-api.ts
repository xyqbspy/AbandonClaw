interface LearningApiErrorBody {
  error?: string;
}

const toError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as LearningApiErrorBody;
    if (typeof body.error === "string" && body.error.trim()) {
      return new Error(body.error);
    }
  } catch {
    // ignore parse errors
  }
  return new Error(fallback);
};

export async function startSceneLearningFromApi(sceneSlug: string) {
  const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/start`, {
    method: "POST",
  });
  if (!response.ok) throw await toError(response, "Failed to start scene learning.");
  return (await response.json()) as unknown;
}

export async function updateSceneLearningProgressFromApi(
  sceneSlug: string,
  payload: {
    progressPercent?: number;
    lastSentenceIndex?: number;
    lastVariantIndex?: number;
    studySecondsDelta?: number;
    savedPhraseDelta?: number;
  },
) {
  const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await toError(response, "Failed to update scene progress.");
  return (await response.json()) as unknown;
}

export async function pauseSceneLearningFromApi(sceneSlug: string) {
  const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/pause`, {
    method: "POST",
  });
  if (!response.ok) throw await toError(response, "Failed to pause scene learning.");
  return (await response.json()) as unknown;
}

export async function completeSceneLearningFromApi(
  sceneSlug: string,
  payload?: { studySecondsDelta?: number; savedPhraseDelta?: number },
) {
  const response = await fetch(`/api/learning/scenes/${encodeURIComponent(sceneSlug)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  if (!response.ok) throw await toError(response, "Failed to complete scene learning.");
  return (await response.json()) as unknown;
}

