import { access, copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { requireCurrentProfile } from "@/lib/server/auth";
import { toApiErrorResponse } from "@/lib/server/api-error";
import { ValidationError } from "@/lib/server/errors";
import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
  sanitizeAudioPathSegment,
} from "@/lib/shared/tts";

type TtsKind = "sentence" | "chunk" | "scene_full";
type TtsMode = "normal" | "slow";

interface TtsRequestPayload {
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

const voiceJenny = "en-US-JennyNeural";
const voiceGuy = "en-US-GuyNeural";

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

const exists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const synthesizeToFile = async (targetPath: string, text: string, voice: string, mode: TtsMode) => {
  const tempDir = path.join(process.cwd(), ".tmp", "edge-tts");
  await mkdir(tempDir, { recursive: true });

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const result = await tts.toFile(tempDir, text, {
      rate: mode === "slow" ? "-25%" : "default",
    });
    await ensureDir(targetPath);
    await copyFile(result.audioFilePath, targetPath);
    await rm(result.audioFilePath, { force: true });
    if (result.metadataFilePath) {
      await rm(result.metadataFilePath, { force: true });
    }
  } finally {
    tts.close();
  }
};

const synthesizeSceneFullToFile = async (
  targetPath: string,
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
    await ensureDir(targetPath);
    await writeFile(targetPath, Buffer.concat(buffers));
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
    const relativePath = `/audio/scenes/${sceneSlug}/${fileName}`;
    return {
      relativePath,
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
    const relativePath = `/audio/scenes/${sceneSlug}/sentences/${fileName}`;
    return {
      relativePath,
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
  const relativePath = `/audio/chunks/${fileName}`;
  return {
    relativePath,
    absolutePath: path.join(process.cwd(), "public", "audio", "chunks", fileName),
    voice: voiceJenny,
    mode: "normal" as TtsMode,
  };
};

export async function POST(request: Request) {
  try {
    await requireCurrentProfile();
    const payload = (await request.json()) as TtsRequestPayload;
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

    const cached = await exists(target.absolutePath);
    if (!cached) {
      if (kind === "scene_full") {
        await synthesizeSceneFullToFile(target.absolutePath, mergedSceneFullSegments, sceneType);
      } else {
        await synthesizeToFile(target.absolutePath, text, target.voice, target.mode);
      }
    }

    return NextResponse.json(
      {
        url: target.relativePath,
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
