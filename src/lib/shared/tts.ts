const chunkKeyFallbackPrefix = "chunk";

const simpleHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
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

