#!/usr/bin/env node
import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const cwd = process.cwd();
const chunkKeyFallbackPrefix = "chunk";
const sentenceAudioKeyPrefix = "sentence";

const loadEnvFile = async (filePath) => {
  try {
    const raw = await readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      if (!key || process.env[key]) continue;
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // ignore missing env file
  }
};

const sanitizeSegment = (value, fallback) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
};

const simpleHash = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

const buildChunkAudioKey = (chunkText) => {
  const normalized = String(chunkText ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (normalized) return normalized;
  return `${chunkKeyFallbackPrefix}-${simpleHash(String(chunkText ?? "").trim().toLowerCase())}`;
};

const buildSentenceAudioKey = ({ sentenceId, text, speaker, mode }) => {
  const normalizedSentenceId = sanitizeSegment(sentenceId, "sentence");
  const normalizedSpeaker = String(speaker ?? "").trim().toUpperCase() || "_";
  const normalizedMode = mode === "slow" ? "slow" : "normal";
  const normalizedText = String(text ?? "").trim();
  const fingerprint = simpleHash(
    `${normalizedSentenceId}::${normalizedSpeaker}::${normalizedMode}::${normalizedText}`,
  );

  return `${sentenceAudioKeyPrefix}-${normalizedSentenceId}-${fingerprint}`;
};

const exists = async (targetPath) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const voiceForSpeaker = (speaker) => {
  if (String(speaker ?? "").trim().toUpperCase() === "B") {
    return "en-US-GuyNeural";
  }
  return "en-US-JennyNeural";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const synthesizeToPath = async ({ text, voice, targetPath }) => {
  const tempDir = path.join(
    cwd,
    ".tmp",
    "edge-tts-warmup",
    `${Date.now()}-${crypto.randomUUID()}`,
  );
  await mkdir(tempDir, { recursive: true });
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const result = await tts.toFile(tempDir, text, { rate: "default" });
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(result.audioFilePath, targetPath);
    await rm(result.audioFilePath, { force: true });
    if (result.metadataFilePath) {
      await rm(result.metadataFilePath, { force: true });
    }
  } finally {
    tts.close();
    await rm(tempDir, { recursive: true, force: true });
  }
};

const synthesizeWithRetry = async (task, maxAttempts = 3) => {
  let attempt = 0;
  let lastError = null;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await synthesizeToPath({
        text: task.text,
        voice: task.voice,
        targetPath: task.targetPath,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      await sleep(250 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

const collectTasksFromScene = (row) => {
  const scene = row.scene_json ?? {};
  const sceneSlug = sanitizeSegment(row.slug || scene.slug || "scene", "scene");
  const sections = Array.isArray(scene.sections) ? scene.sections : [];
  const sentenceTasks = [];
  const chunkTasks = [];

  for (const section of sections) {
    const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
    for (const block of blocks) {
      const blockSpeaker = block?.speaker;
      const sentences = Array.isArray(block?.sentences) ? block.sentences : [];
      for (const sentence of sentences) {
        const sentenceId = sanitizeSegment(sentence?.id || "sentence", "sentence");
        const sentenceText = String(sentence?.tts || sentence?.text || "").trim();
        const sentenceSpeaker = sentence?.speaker || blockSpeaker;
        if (sentenceText) {
          const sentenceAudioKey = buildSentenceAudioKey({
            sentenceId,
            text: sentenceText,
            speaker: sentenceSpeaker,
            mode: "normal",
          });
          sentenceTasks.push({
            type: "sentence",
            key: `${sceneSlug}/${sentenceAudioKey}`,
            text: sentenceText,
            voice: voiceForSpeaker(sentenceSpeaker),
            targetPath: path.join(
              cwd,
              "public",
              "audio",
              "scenes",
              sceneSlug,
              "sentences",
              `${sentenceAudioKey}.mp3`,
            ),
          });
        }

        const chunkTextSet = new Set();
        const chunkDetails = Array.isArray(sentence?.chunkDetails) ? sentence.chunkDetails : [];
        for (const detail of chunkDetails) {
          const text = String(detail?.text || "").trim();
          if (text) chunkTextSet.add(text);
        }
        const chunks = Array.isArray(sentence?.chunks) ? sentence.chunks : [];
        for (const chunk of chunks) {
          const text = String(
            typeof chunk === "string" ? chunk : chunk?.text || "",
          ).trim();
          if (text) chunkTextSet.add(text);
        }
        for (const chunkText of chunkTextSet) {
          const chunkKey = sanitizeSegment(buildChunkAudioKey(chunkText), "chunk");
          chunkTasks.push({
            type: "chunk",
            key: chunkKey,
            text: chunkText,
            voice: "en-US-JennyNeural",
            targetPath: path.join(cwd, "public", "audio", "chunks", `${chunkKey}.mp3`),
          });
        }
      }
    }
  }

  return { sentenceTasks, chunkTasks };
};

const runWithConcurrency = async (items, concurrency, worker) => {
  let index = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    slug: "",
    concurrency: 4,
  };
  for (const arg of args) {
    if (arg.startsWith("--slug=")) {
      options.slug = arg.slice("--slug=".length).trim();
      continue;
    }
    if (arg.startsWith("--concurrency=")) {
      const parsed = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(parsed) && parsed > 0) {
        options.concurrency = Math.floor(parsed);
      }
    }
  }
  return options;
};

const main = async () => {
  await loadEnvFile(path.join(cwd, ".env.local"));
  await loadEnvFile(path.join(cwd, ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { slug, concurrency } = parseArgs();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = admin.from("scenes").select("slug, scene_json").order("created_at", { ascending: false });
  if (slug) {
    query = query.eq("slug", slug);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load scenes: ${error.message}`);
  }

  const rows = data ?? [];
  const sentenceMap = new Map();
  const chunkMap = new Map();

  for (const row of rows) {
    const { sentenceTasks, chunkTasks } = collectTasksFromScene(row);
    for (const task of sentenceTasks) {
      sentenceMap.set(task.key, task);
    }
    for (const task of chunkTasks) {
      chunkMap.set(task.key, task);
    }
  }

  const allTasks = [...sentenceMap.values(), ...chunkMap.values()];
  let generated = 0;
  let reused = 0;
  let failed = 0;

  console.log(
    `[tts:warmup] scenes=${rows.length} sentence=${sentenceMap.size} chunk=${chunkMap.size} total=${allTasks.length} concurrency=${concurrency}`,
  );
  console.log("[tts:warmup] slow mode skipped by design (TODO: enable later).");

  await runWithConcurrency(allTasks, concurrency, async (task, idx) => {
    const existsAlready = await exists(task.targetPath);
    if (existsAlready) {
      reused += 1;
      if ((idx + 1) % 50 === 0) {
        console.log(`[tts:warmup] progress ${idx + 1}/${allTasks.length}`);
      }
      return;
    }

    try {
      await synthesizeWithRetry(task);
      generated += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[tts:warmup] failed ${task.type} key=${task.key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if ((idx + 1) % 25 === 0) {
      console.log(`[tts:warmup] progress ${idx + 1}/${allTasks.length}`);
    }
  });

  console.log(`[tts:warmup] done generated=${generated} reused=${reused} failed=${failed}`);
};

main().catch((error) => {
  console.error(
    `[tts:warmup] fatal: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
