interface TrackChunksPayload {
  sceneSlug?: string;
  sentenceIndex?: number;
  sentenceText?: string;
  chunks: string[];
  interactionType?: "encounter" | "practice" | "favorite";
}

const extractError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // ignore
  }
  return fallback;
};

export async function trackChunksFromApi(payload: TrackChunksPayload) {
  const response = await fetch("/api/chunks/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to track chunks."));
  }
  return (await response.json()) as {
    tracked: number;
    interactionType: string;
    chunkIds: string[];
  };
}
