import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { ValidationError } from "@/lib/server/errors";
import {
  createTtsStorageSignedUrl,
  getTtsStorageSignedUrlIfExists,
  uploadTtsAudioToStorage,
} from "@/lib/server/tts/repo";
import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
  sanitizeAudioPathSegment,
} from "@/lib/shared/tts";

type TtsKind = "sentence" | "chunk" | "scene_full";
type TtsMode = "normal" | "slow";

export interface TtsRequestPayload extends Record<string, unknown> {
  kind?: unknown;
  mode?: unknown;
  speed?: unknown;
  speaker?: unknown;
  sceneSlug?: unknown;
  sentenceId?: unknown;
  chunkKey?: unknown;
  sceneType?: unknown;
  segments?: unknown;
  text?: unknown;
}

type SceneFullSegment = {
  text: string;
  speaker?: string;
};

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

type TtsResponseSource = "storage-hit" | "fresh-upload" | "inline-fallback";

const voiceJenny = "en-US-JennyNeural";
const voiceGuy = "en-US-GuyNeural";
const signedUrlTtlSeconds = 60 * 60;
const signedUrlCacheTtlMs = Math.max(60, signedUrlTtlSeconds - 60) * 1000;
const signedUrlCache = new Map<string, SignedUrlCacheEntry>();
const pendingSignedUrlRequests = new Map<string, Promise<string>>();

const parseTtsKind = (value: unknown): TtsKind => {
  if (value === "sentence" || value === "chunk" || value === "scene_full") return value;
  throw new ValidationError("kind must be sentence, chunk, or scene_full.");
};

const parseTtsMode = (mode: unknown, speed: unknown): TtsMode => {
  if (mode === "slow" || speed === "slow") return "slow";
  return "normal";
};

const parseOptionalSpeaker = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const speaker = value.trim().toUpperCase();
  return speaker || undefined;
};

const parseRequiredText = (value: unknown) => {
  if (typeof value !== "string") {
    throw new ValidationError("text is required.");
  }
  const text = value.trim();
  if (!text) {
    throw new ValidationError("text is required.");
  }
  return text.slice(0, 3000);
};

const parseSceneFullSegments = (value: unknown): SceneFullSegment[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("segments is required for scene_full.");
  }
  const segments: SceneFullSegment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const text = typeof (item as { text?: unknown }).text === "string"
      ? (item as { text?: string }).text?.trim() ?? ""
      : "";
    if (!text) continue;
    const speakerRaw = typeof (item as { speaker?: unknown }).speaker === "string"
      ? (item as { speaker?: string }).speaker?.trim().toUpperCase()
      : undefined;
    segments.push({
      text: text.slice(0, 3000),
      speaker: speakerRaw || undefined,
    });
  }
  if (segments.length === 0) {
    throw new ValidationError("segments is required for scene_full.");
  }
  return segments.slice(0, 400);
};

const parseRequiredString = (value: unknown, field: string) => {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(`${field} is required.`);
  }
  return normalized;
};

const resolveVoiceBySpeaker = (speaker?: string) => {
  if (speaker === "B") return voiceGuy;
  return voiceJenny;
};

const ensureDir = async (filePath: string) => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

const canFallbackToInlineAudio = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "ENOENT" || code === "EROFS" || code === "EPERM" || code === "EACCES";
};

const toInlineAudioUrl = (buffer: Buffer) => `data:audio/mpeg;base64,${buffer.toString("base64")}`;

const getCachedSignedUrl = (storagePath: string) => {
  const cached = signedUrlCache.get(storagePath);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    signedUrlCache.delete(storagePath);
    return null;
  }
  return cached.url;
};

const cacheSignedUrl = (storagePath: string, url: string) => {
  signedUrlCache.set(storagePath, {
    url,
    expiresAt: Date.now() + signedUrlCacheTtlMs,
  });
  return url;
};

const createStorageSignedUrl = async (storagePath: string) => {
  const cached = getCachedSignedUrl(storagePath);
  if (cached) {
    return cached;
  }

  const pending = pendingSignedUrlRequests.get(storagePath);
  if (pending) {
    return pending;
  }

  const task = createTtsStorageSignedUrl(storagePath)
    .then((url) => cacheSignedUrl(storagePath, url))
    .finally(() => {
      pendingSignedUrlRequests.delete(storagePath);
    });

  pendingSignedUrlRequests.set(storagePath, task);
  return task;
};

const getStorageSignedUrlIfExists = async (storagePath: string) => {
  const cached = getCachedSignedUrl(storagePath);
  if (cached) return cached;

  const signedUrl = await getTtsStorageSignedUrlIfExists(storagePath);
  return signedUrl ? cacheSignedUrl(storagePath, signedUrl) : null;
};

const uploadAudioToStorage = async (storagePath: string, buffer: Buffer) => {
  const url = await uploadTtsAudioToStorage(storagePath, buffer, false);
  return cacheSignedUrl(storagePath, url);
};

const synthesizeToBuffer = async (text: string, voice: string, mode: TtsMode) => {
  const tempBaseDir = path.join(process.cwd(), ".tmp", "edge-tts");
  const tempDir = path.join(tempBaseDir, randomUUID());
  await mkdir(tempDir, { recursive: true });

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const result = await tts.toFile(tempDir, text, {
      rate: mode === "slow" ? "-25%" : "default",
    });
    const buffer = await readFile(result.audioFilePath);
    await rm(result.audioFilePath, { force: true });
    if (result.metadataFilePath) {
      await rm(result.metadataFilePath, { force: true });
    }
    return buffer;
  } finally {
    tts.close();
    await rm(tempDir, { recursive: true, force: true }).catch(() => {
      // Non-blocking cleanup for per-request temp dirs.
    });
  }
};

const persistBufferIfPossible = async (targetPath: string, buffer: Buffer) => {
  await ensureDir(targetPath);
  await writeFile(targetPath, buffer);
};

const tryPersistBufferToFile = async (targetPath: string, buffer: Buffer) => {
  try {
    await persistBufferIfPossible(targetPath, buffer);
  } catch (error) {
    if (!canFallbackToInlineAudio(error)) {
      throw error;
    }
  }
};

const synthesizeSceneFullBuffer = async (
  segments: SceneFullSegment[],
  sceneType: "dialogue" | "monologue",
) => {
  const tts = new MsEdgeTTS();
  const buffers: Buffer[] = [];
  let activeVoice: string | null = null;

  try {
    for (const segment of segments) {
      const voice = sceneType === "dialogue" ? resolveVoiceBySpeaker(segment.speaker) : voiceJenny;
      if (voice !== activeVoice) {
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
          voiceLocale: "en-US",
        });
        activeVoice = voice;
      }
      const { audioStream } = tts.toStream(segment.text, { rate: "default" });
      const chunkBuffers: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        audioStream.on("data", (chunk) => {
          chunkBuffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        audioStream.on("end", resolve);
        audioStream.on("error", reject);
      });
      if (chunkBuffers.length === 0) {
        throw new Error("No audio data received");
      }
      buffers.push(Buffer.concat(chunkBuffers));
    }
    if (buffers.length === 0) {
      throw new Error("No audio data received");
    }
    return Buffer.concat(buffers);
  } finally {
    tts.close();
  }
};

const resolveAudioTarget = (payload: {
  kind: TtsKind;
  mode: TtsMode;
  speaker?: string;
  sceneSlug?: unknown;
  sentenceId?: unknown;
  chunkKey?: unknown;
  sceneFullKey?: string;
  sentenceAudioKey?: string;
  text: string;
}) => {
  if (payload.kind === "scene_full") {
    const sceneSlug = sanitizeAudioPathSegment(
      parseRequiredString(payload.sceneSlug, "sceneSlug"),
      "scene",
    );
    const fileName = `${payload.sceneFullKey || "full"}.mp3`;
    return {
      storagePath: `scenes/${sceneSlug}/${fileName}`,
      absolutePath: path.join(process.cwd(), "public", "audio", "scenes", sceneSlug, fileName),
      voice: voiceJenny,
      mode: "normal" as TtsMode,
    };
  }

  if (payload.kind === "sentence") {
    const sceneSlug = sanitizeAudioPathSegment(
      parseRequiredString(payload.sceneSlug, "sceneSlug"),
      "scene",
    );
    const sentenceId = sanitizeAudioPathSegment(
      parseRequiredString(payload.sentenceId, "sentenceId"),
      "sentence",
    );
    const fileName = `${payload.sentenceAudioKey || sentenceId}.mp3`;
    return {
      storagePath: `scenes/${sceneSlug}/sentences/${fileName}`,
      absolutePath: path.join(process.cwd(), "public", "audio", "scenes", sceneSlug, "sentences", fileName),
      voice: resolveVoiceBySpeaker(payload.speaker),
      mode: payload.mode,
    };
  }

  const chunkKey = sanitizeAudioPathSegment(
    typeof payload.chunkKey === "string" && payload.chunkKey.trim()
      ? payload.chunkKey
      : buildChunkAudioKey(payload.text),
    "chunk",
  );
  const fileName = `${chunkKey}.mp3`;
  return {
    storagePath: `chunks/${fileName}`,
    absolutePath: path.join(process.cwd(), "public", "audio", "chunks", fileName),
    voice: voiceJenny,
    mode: "normal" as TtsMode,
  };
};

export async function generateTtsAudio(payload: TtsRequestPayload) {
  const kind = parseTtsKind(payload.kind);
  const mode = parseTtsMode(payload.mode, payload.speed);
  const speaker = parseOptionalSpeaker(payload.speaker);
  const sceneType =
    payload.sceneType === "dialogue" || payload.sceneType === "monologue"
      ? payload.sceneType
      : "monologue";
  const sceneFullSegments = kind === "scene_full" ? parseSceneFullSegments(payload.segments) : [];
  const mergedSceneFullSegments =
    kind === "scene_full" ? mergeSceneFullSegments(sceneFullSegments, sceneType) : [];
  const text = kind === "scene_full" ? "[scene_full]" : parseRequiredText(payload.text);
  const target = resolveAudioTarget({
    kind,
    mode,
    speaker,
    sceneSlug: payload.sceneSlug,
    sentenceId: payload.sentenceId,
    chunkKey: payload.chunkKey,
    sceneFullKey:
      kind === "scene_full" ? buildSceneFullAudioKey(mergedSceneFullSegments, sceneType) : undefined,
    sentenceAudioKey:
      kind === "sentence"
        ? buildSentenceAudioKey({
            sentenceId: parseRequiredString(payload.sentenceId, "sentenceId"),
            text,
            speaker,
            mode,
          })
        : undefined,
    text,
  });

  let responseUrl = await getStorageSignedUrlIfExists(target.storagePath);
  let cached = Boolean(responseUrl);
  let source: TtsResponseSource = responseUrl ? "storage-hit" : "inline-fallback";

  if (!responseUrl) {
    const buffer =
      kind === "scene_full"
        ? await synthesizeSceneFullBuffer(mergedSceneFullSegments, sceneType)
        : await synthesizeToBuffer(text, target.voice, target.mode);

    await tryPersistBufferToFile(target.absolutePath, buffer);
    responseUrl = await uploadAudioToStorage(target.storagePath, buffer)
      .then((url) => {
        source = "fresh-upload";
        return url;
      })
      .catch((error) => {
        console.error("[tts] upload fallback", {
          kind,
          storagePath: target.storagePath,
          error: error instanceof Error ? error.message : String(error),
        });
        source = "inline-fallback";
        return toInlineAudioUrl(buffer);
      });
    cached = false;
  }

  return {
    url: responseUrl,
    cached,
    source,
  };
}
