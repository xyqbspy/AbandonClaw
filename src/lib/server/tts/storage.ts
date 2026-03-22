import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getLessonBlocks, getLessonSentences } from "@/lib/shared/lesson-content";
import {
  getTtsStorageSignedUrlIfExists,
  listTtsStorageFiles,
  removeTtsStorageFiles,
  uploadTtsAudioToStorage,
} from "@/lib/server/tts/repo";
import {
  buildChunkAudioKey,
  buildSceneFullAudioKey,
  buildSentenceAudioKey,
  mergeSceneFullSegments,
} from "@/lib/shared/tts";
import { Lesson } from "@/lib/types";

const voiceJenny = "en-US-JennyNeural";
const voiceGuy = "en-US-GuyNeural";

const resolveVoiceBySpeaker = (speaker?: string) => {
  if (speaker?.trim().toUpperCase() === "B") return voiceGuy;
  return voiceJenny;
};

const getSentenceReadText = (sentence: Lesson["sections"][number]["blocks"][number]["sentences"][number]) =>
  (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();

export const deleteSceneTtsAudioBySlug = async (sceneSlug: string) => {
  const slug = sceneSlug.trim();
  if (!slug) return { deletedFiles: 0 };

  const rootPrefix = `scenes/${slug}`;
  const sentencePrefix = `${rootPrefix}/sentences`;
  const files = [
    ...(await listTtsStorageFiles(rootPrefix)).filter((filePath) => !filePath.startsWith(`${sentencePrefix}/`)),
    ...(await listTtsStorageFiles(sentencePrefix)),
  ];

  if (files.length === 0) {
    return { deletedFiles: 0 };
  }

  const uniqueFiles = Array.from(new Set(files));
  await removeTtsStorageFiles(uniqueFiles);

  return { deletedFiles: uniqueFiles.length };
};

const synthesizeToBuffer = async (text: string, voice: string, mode: "normal" | "slow") => {
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

const synthesizeSceneFullBuffer = async (
  segments: Array<{ text: string; speaker?: string }>,
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

const runWithConcurrency = async <T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) => {
  let index = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
};

export async function warmLessonTtsAudio(
  lesson: Lesson,
  options?: {
    force?: boolean;
    includeSceneFull?: boolean;
    concurrency?: number;
  },
) {
  const force = options?.force === true;
  const includeSceneFull = options?.includeSceneFull !== false;
  const concurrency = options?.concurrency ?? 3;
  const sceneSlug = lesson.slug.trim();
  const sceneType = lesson.sceneType ?? "monologue";

  const sentenceTasks = getLessonSentences(lesson)
    .map((sentence) => {
      const text = getSentenceReadText(sentence);
      if (!text) return null;
      const speaker = sentence.speaker;
      const audioKey = buildSentenceAudioKey({
        sentenceId: sentence.id,
        text,
        speaker,
        mode: "normal",
      });
      return {
        storagePath: `scenes/${sceneSlug}/sentences/${audioKey}.mp3`,
        text,
        voice: resolveVoiceBySpeaker(speaker),
      };
    })
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  const chunkMap = new Map<string, { storagePath: string; text: string; voice: string }>();
  for (const sentence of getLessonSentences(lesson)) {
    for (const chunkText of sentence.chunks) {
      const clean = chunkText.trim();
      if (!clean) continue;
      const chunkKey = buildChunkAudioKey(clean);
      const storagePath = `chunks/${chunkKey}.mp3`;
      if (chunkMap.has(storagePath)) continue;
      chunkMap.set(storagePath, {
        storagePath,
        text: clean,
        voice: voiceJenny,
      });
    }
  }

  const sceneFullSegments = includeSceneFull
    ? mergeSceneFullSegments(
        getLessonBlocks(lesson)
          .flatMap((block) =>
            block.sentences.map((sentence) => ({
              text: getSentenceReadText(sentence),
              speaker: (block.speaker ?? sentence.speaker ?? "").trim().toUpperCase() || undefined,
            })),
          )
          .filter((segment) => Boolean(segment.text)),
        sceneType,
      )
    : [];

  const sceneFullTask =
    includeSceneFull && sceneFullSegments.length > 0
      ? {
          storagePath: `scenes/${sceneSlug}/${buildSceneFullAudioKey(sceneFullSegments, sceneType)}.mp3`,
          segments: sceneFullSegments,
        }
      : null;

  await runWithConcurrency(sentenceTasks, concurrency, async (task) => {
    if (!force) {
      const existing = await getTtsStorageSignedUrlIfExists(task.storagePath);
      if (existing) return;
    }
    const buffer = await synthesizeToBuffer(task.text, task.voice, "normal");
    await uploadTtsAudioToStorage(task.storagePath, buffer, force);
  });

  await runWithConcurrency(Array.from(chunkMap.values()), concurrency, async (task) => {
    if (!force) {
      const existing = await getTtsStorageSignedUrlIfExists(task.storagePath);
      if (existing) return;
    }
    const buffer = await synthesizeToBuffer(task.text, task.voice, "normal");
    await uploadTtsAudioToStorage(task.storagePath, buffer, force);
  });

  if (sceneFullTask) {
    if (force || !(await getTtsStorageSignedUrlIfExists(sceneFullTask.storagePath))) {
      const buffer = await synthesizeSceneFullBuffer(sceneFullTask.segments, sceneType);
      await uploadTtsAudioToStorage(sceneFullTask.storagePath, buffer, force);
    }
  }
}
