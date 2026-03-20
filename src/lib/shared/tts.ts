const chunkKeyFallbackPrefix = "chunk";
const sceneFullKeyPrefix = "scene-full";
const sceneFullAudioVersion = "v2";

const simpleHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

type SceneFullSegment = {
  text: string;
  speaker?: string;
};

export const sanitizeAudioPathSegment = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
};

export const buildChunkAudioKey = (chunkText: string) => {
  const cleaned = chunkText
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (cleaned) return cleaned;
  return `${chunkKeyFallbackPrefix}-${simpleHash(chunkText.trim().toLowerCase())}`;
};

export const mergeSceneFullSegments = (
  segments: SceneFullSegment[],
  sceneType: "dialogue" | "monologue",
) => {
  const merged: SceneFullSegment[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const speaker =
      sceneType === "dialogue"
        ? segment.speaker?.trim().toUpperCase() || undefined
        : undefined;
    const previous = merged[merged.length - 1];

    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text} ${text}`.trim();
      continue;
    }

    merged.push({ text, speaker });
  }

  return merged;
};

export const buildSceneFullAudioKey = (
  segments: SceneFullSegment[],
  sceneType: "dialogue" | "monologue",
) => {
  const mergedSegments = mergeSceneFullSegments(segments, sceneType);
  const fingerprintSource = mergedSegments
    .map((segment) => `${segment.speaker ?? "_"}:${segment.text}`)
    .join("||");

  return `${sceneFullKeyPrefix}-${simpleHash(`${sceneFullAudioVersion}::${sceneType}::${fingerprintSource}`)}`;
};
