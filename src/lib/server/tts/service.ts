import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { ensureIpv4FirstDns } from "@/lib/server/network/dns";
import { TtsGenerationError, ValidationError } from "@/lib/server/errors";
import { logServerEvent } from "@/lib/server/logger";
import {
  getTtsStorageSignedUrlIfExists,
  removeTtsStorageFiles,
  uploadTtsAudioToStorage,
} from "@/lib/server/tts/repo";
import {
  clearCachedSignedUrl as sharedClearCachedSignedUrl,
  getCachedSignedUrl as sharedGetCachedSignedUrl,
  setCachedSignedUrl as sharedSetCachedSignedUrl,
} from "@/lib/server/tts/signed-url-cache";
import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
  sanitizeAudioPathSegment,
} from "@/lib/shared/tts";
import {
  inferSceneFullFailureReason,
  type SceneFullFailureReason,
} from "@/lib/shared/tts-failure";

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

type TtsResponseSource = "storage-hit" | "fresh-upload" | "inline-fallback";

const voiceJenny = "en-US-JennyNeural";
const voiceGuy = "en-US-GuyNeural";
const signedUrlTtlSeconds = 60 * 60;
const signedUrlCacheTtlMs = Math.max(60, signedUrlTtlSeconds - 60) * 1000;
const pendingSignedUrlRequests = new Map<string, Promise<string>>();
const REGENERATE_CONCURRENCY = 3;

ensureIpv4FirstDns();

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
    throw new ValidationError("segments is required for scene_full.", {
      failureReason: "segment_assembly_failed",
    });
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
    throw new ValidationError("segments is required for scene_full.", {
      failureReason: "segment_assembly_failed",
    });
  }
  return segments.slice(0, 400);
};

const toSceneFullGenerationError = (
  error: unknown,
  fallbackReason?: SceneFullFailureReason,
  details?: Record<string, unknown>,
) => {
  if (error instanceof TtsGenerationError) return error;
  const failureReason = fallbackReason ?? inferSceneFullFailureReason(error);
  return new TtsGenerationError("Failed to generate full scene audio.", {
    failureReason,
    ...details,
  });
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

const getCachedSignedUrl = (storagePath: string) => sharedGetCachedSignedUrl(storagePath);

const cacheSignedUrl = async (storagePath: string, url: string) => {
  await sharedSetCachedSignedUrl(storagePath, url, signedUrlCacheTtlMs);
  return url;
};

const getStorageSignedUrlIfExists = async (storagePath: string) => {
  const cached = await getCachedSignedUrl(storagePath);
  if (cached) return cached;

  const signedUrl = await getTtsStorageSignedUrlIfExists(storagePath);
  return signedUrl ? cacheSignedUrl(storagePath, signedUrl) : null;
};

const uploadAudioToStorage = async (storagePath: string, buffer: Buffer) => {
  const url = await uploadTtsAudioToStorage(storagePath, buffer, false);
  return cacheSignedUrl(storagePath, url);
};

const clearSignedUrlCache = async (storagePath: string) => {
  await sharedClearCachedSignedUrl(storagePath);
  pendingSignedUrlRequests.delete(storagePath);
};

const runWithConcurrency = async <TItem>(
  items: TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => Promise<void>,
) => {
  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  let cursor = 0;

  await Promise.all(
    Array.from({ length: size }, async () => {
      while (cursor < items.length) {
        const currentIndex = cursor;
        cursor += 1;
        await worker(items[currentIndex] as TItem, currentIndex);
      }
    }),
  );
};

const synthesizeToBuffer = async (text: string, voice: string, mode: TtsMode) => {
  const tempBaseDir = path.join(os.tmpdir(), "edge-tts");
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
        throw new TtsGenerationError("No audio data received.", {
          failureReason: "empty_audio_result",
        });
      }
      buffers.push(Buffer.concat(chunkBuffers));
    }
    if (buffers.length === 0) {
      throw new TtsGenerationError("No audio data received.", {
        failureReason: "empty_audio_result",
      });
    }
    return Buffer.concat(buffers);
  } catch (error) {
    throw toSceneFullGenerationError(error, undefined, { sceneType });
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

  let responseUrl: string | null;
  try {
    responseUrl = await getStorageSignedUrlIfExists(target.storagePath);
  } catch (error) {
    if (kind === "scene_full") {
      throw toSceneFullGenerationError(error, "signed_url_failed", {
        storagePath: target.storagePath,
      });
    }
    throw error;
  }
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
        logServerEvent("error", "[tts] upload fallback", {
          module: "tts/service",
          details: {
            kind,
            storagePath: target.storagePath,
            failureReason: kind === "scene_full" ? "storage_upload_failed" : undefined,
          },
          error,
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

type RegenerateChunkTtsDependencies = {
  concurrency: number;
  removeLocalFile: (absolutePath: string) => Promise<void>;
  removeStorageFiles: (storagePaths: string[]) => Promise<void>;
  generateTtsAudio: typeof generateTtsAudio;
};

const defaultRegenerateChunkTtsDependencies: RegenerateChunkTtsDependencies = {
  concurrency: REGENERATE_CONCURRENCY,
  removeLocalFile: async (absolutePath) => {
    await rm(absolutePath, { force: true });
  },
  removeStorageFiles: async (storagePaths) => {
    await removeTtsStorageFiles(storagePaths);
  },
  generateTtsAudio,
};

export async function regenerateChunkTtsAudioBatch(
  items: Array<{ text: string; chunkKey?: string }>,
  dependencies: Partial<RegenerateChunkTtsDependencies> = {},
) {
  const resolvedDependencies = {
    ...defaultRegenerateChunkTtsDependencies,
    ...dependencies,
  } satisfies RegenerateChunkTtsDependencies;
  const normalizedItems = Array.from(
    new Map(
      items
        .map((item) => {
          const text = parseRequiredText(item.text);
          const chunkKey =
            typeof item.chunkKey === "string" && item.chunkKey.trim()
              ? item.chunkKey.trim()
              : buildChunkAudioKey(text);
          return [chunkKey, { text, chunkKey }] as const;
        })
        .filter((entry) => entry[1].text.length > 0),
    ).values(),
  );

  const failures: Array<{ chunkKey: string; message: string }> = [];

  await runWithConcurrency(normalizedItems, resolvedDependencies.concurrency, async (item) => {
    const target = resolveAudioTarget({
      kind: "chunk",
      mode: "normal",
      text: item.text,
      chunkKey: item.chunkKey,
    });

    try {
      await clearSignedUrlCache(target.storagePath);
      await resolvedDependencies.removeLocalFile(target.absolutePath).catch(() => {
        // Non-blocking local cleanup.
      });
      await resolvedDependencies.removeStorageFiles([target.storagePath]).catch(() => {
        // Storage may not have existing file yet.
      });
      await resolvedDependencies.generateTtsAudio({
        kind: "chunk",
        text: item.text,
        chunkKey: item.chunkKey,
      });
    } catch (error) {
      failures.push({
        chunkKey: item.chunkKey,
        message: error instanceof Error ? error.message : String(error),
      });
      logServerEvent("error", "[tts] regenerate chunk failed", {
        module: "tts/service",
        details: {
          chunkKey: item.chunkKey,
          storagePath: target.storagePath,
        },
        error,
      });
    }
  });

  if (failures.length > 0) {
    const firstFailure = failures[0];
    throw new Error(
      `Failed to regenerate ${failures.length}/${normalizedItems.length} chunk audios. First failed chunk: ${firstFailure?.chunkKey}.`,
    );
  }

  return {
    regeneratedCount: normalizedItems.length,
  };
}
