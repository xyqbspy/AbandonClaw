import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import { parseJsonBody } from "@/lib/server/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
  sanitizeAudioPathSegment,
} from "@/lib/shared/tts";

type TtsKind = "sentence" | "chunk" | "scene_full";
type TtsMode = "normal" | "slow";

interface TtsRequestPayload extends Record<string, unknown> {
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

type SynthesizedAudioResult = {
  buffer: Buffer;
  persisted: boolean;
};

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const voiceJenny = "en-US-JennyNeural";
const voiceGuy = "en-US-GuyNeural";
const ttsStorageBucket = process.env.TTS_STORAGE_BUCKET?.trim() || "tts-audio";
const signedUrlTtlSeconds = 60 * 60;
const signedUrlCacheTtlMs = Math.max(60, signedUrlTtlSeconds - 60) * 1000;
let ensureBucketPromise: Promise<void> | null = null;
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

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

const ensureTtsStorageBucket = async () => {
  if (ensureBucketPromise) return ensureBucketPromise;

  ensureBucketPromise = (async () => {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage.listBuckets();
    if (error) {
      throw new Error(`Failed to list storage buckets: ${error.message}`);
    }

    const bucketExists = (data ?? []).some((bucket) => bucket.name === ttsStorageBucket);
    if (bucketExists) return;

    const { error: createError } = await admin.storage.createBucket(ttsStorageBucket, {
      public: false,
      fileSizeLimit: "20MB",
    });
    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  })().catch((error) => {
    ensureBucketPromise = null;
    throw error;
  });

  return ensureBucketPromise;
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

  const task = (async () => {
    await ensureTtsStorageBucket();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(ttsStorageBucket)
      .createSignedUrl(storagePath, signedUrlTtlSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed audio url: ${error?.message ?? "unknown error"}`);
    }
    return cacheSignedUrl(storagePath, data.signedUrl);
  })().finally(() => {
    pendingSignedUrlRequests.delete(storagePath);
  });

  pendingSignedUrlRequests.set(storagePath, task);
  return task;
};

const getStorageSignedUrlIfExists = async (storagePath: string) => {
  try {
    return await createStorageSignedUrl(storagePath);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (
      message.includes("not found") ||
      message.includes("object not found") ||
      message.includes("no such") ||
      message.includes("404")
    ) {
      return null;
    }
    throw error;
  }
};

const uploadAudioToStorage = async (storagePath: string, buffer: Buffer) => {
  await ensureTtsStorageBucket();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(ttsStorageBucket).upload(storagePath, buffer, {
    contentType: "audio/mpeg",
    upsert: false,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Failed to upload audio to storage: ${error.message}`);
  }
  return createStorageSignedUrl(storagePath);
};

const synthesizeToBuffer = async (text: string, voice: string, mode: TtsMode) => {
  const tempDir = path.join(process.cwd(), ".tmp", "edge-tts");
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
  }
};

const persistBufferIfPossible = async (targetPath: string, buffer: Buffer) => {
  await ensureDir(targetPath);
  await writeFile(targetPath, buffer);
};

const synthesizeToFile = async (
  targetPath: string,
  text: string,
  voice: string,
  mode: TtsMode,
): Promise<SynthesizedAudioResult> => {
  const buffer = await synthesizeToBuffer(text, voice, mode);
  try {
    await persistBufferIfPossible(targetPath, buffer);
    return {
      buffer,
      persisted: true,
    };
  } catch (error) {
    if (!canFallbackToInlineAudio(error)) {
      throw error;
    }
    return {
      buffer,
      persisted: false,
    };
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

const synthesizeSceneFullToFile = async (
  targetPath: string,
  segments: SceneFullSegment[],
  sceneType: "dialogue" | "monologue",
): Promise<SynthesizedAudioResult> => {
  const buffer = await synthesizeSceneFullBuffer(segments, sceneType);
  try {
    await persistBufferIfPossible(targetPath, buffer);
    return {
      buffer,
      persisted: true,
    };
  } catch (error) {
    if (!canFallbackToInlineAudio(error)) {
      throw error;
    }
    return {
      buffer,
      persisted: false,
    };
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
    const storagePath = `scenes/${sceneSlug}/${fileName}`;
    return {
      storagePath,
      absolutePath: path.join(process.cwd(), "public", "audio", "scenes", sceneSlug, fileName),
      publicUrl: `/audio/scenes/${sceneSlug}/${fileName}`,
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
    const storagePath = `scenes/${sceneSlug}/sentences/${fileName}`;
    return {
      storagePath,
      absolutePath: path.join(process.cwd(), "public", "audio", "scenes", sceneSlug, "sentences", fileName),
      publicUrl: `/audio/scenes/${sceneSlug}/sentences/${fileName}`,
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
  const storagePath = `chunks/${fileName}`;
  return {
    storagePath,
    absolutePath: path.join(process.cwd(), "public", "audio", "chunks", fileName),
    publicUrl: `/audio/chunks/${fileName}`,
    voice: voiceJenny,
    mode: "normal" as TtsMode,
  };
};

export async function POST(request: Request) {
  try {
    await requireCurrentProfile();
    const payload = await parseJsonBody<TtsRequestPayload>(request);
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
    if (!responseUrl) {
      if (kind === "scene_full") {
        const result = await synthesizeSceneFullToFile(
          target.absolutePath,
          mergedSceneFullSegments,
          sceneType,
        );
        if (result.persisted) {
          responseUrl = await uploadAudioToStorage(target.storagePath, result.buffer);
        } else {
          responseUrl = toInlineAudioUrl(result.buffer);
        }
        cached = false;
      } else {
        const result = await synthesizeToFile(target.absolutePath, text, target.voice, target.mode);
        if (result.persisted) {
          responseUrl = await uploadAudioToStorage(target.storagePath, result.buffer);
        } else {
          responseUrl = toInlineAudioUrl(result.buffer);
        }
        cached = false;
      }
    }

    return NextResponse.json(
      {
        url: responseUrl,
        cached,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toApiErrorResponse(error, "Failed to generate tts audio.");
  }
}
