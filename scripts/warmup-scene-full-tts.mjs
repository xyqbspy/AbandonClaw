#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const cwd = process.cwd();
const voiceJenny = "en-US-JennyNeural";
const voiceGuy = "en-US-GuyNeural";
const sceneFullKeyPrefix = "scene-full";
const sceneFullAudioVersion = "v2";

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

const mergeSceneFullSegments = (segments, sceneType) => {
  const merged = [];

  for (const segment of segments) {
    const text = String(segment?.text ?? "").trim();
    if (!text) continue;

    const speaker =
      sceneType === "dialogue"
        ? String(segment?.speaker ?? "").trim().toUpperCase() || undefined
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

const buildSceneFullAudioKey = (segments, sceneType) => {
  const mergedSegments = mergeSceneFullSegments(segments, sceneType);
  const fingerprintSource = mergedSegments
    .map((segment) => `${segment.speaker ?? "_"}:${segment.text}`)
    .join("||");
  return `${sceneFullKeyPrefix}-${simpleHash(`${sceneFullAudioVersion}::${sceneType}::${fingerprintSource}`)}`;
};

const exists = async (targetPath) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
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

const buildSceneTasks = (rows) => {
  const tasks = [];
  for (const row of rows) {
    const scene = row.scene_json ?? {};
    const sceneSlug = sanitizeSegment(row.slug || scene.slug || "scene", "scene");
    const sceneType = scene.type === "dialogue" ? "dialogue" : "monologue";
    const sections = Array.isArray(scene.sections) ? scene.sections : [];
    const segments = [];

    for (const section of sections) {
      const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
      for (const block of blocks) {
        const blockSpeaker = String(block?.speaker ?? "").trim().toUpperCase();
        const sentences = Array.isArray(block?.sentences) ? block.sentences : [];
        for (const sentence of sentences) {
          const text = String(sentence?.tts || sentence?.text || "").trim();
          if (!text) continue;
          const speaker = String(sentence?.speaker ?? blockSpeaker).trim().toUpperCase();
          segments.push({ text, speaker: speaker || undefined });
        }
      }
    }

    if (segments.length === 0) continue;

    const mergedSegments = mergeSceneFullSegments(segments, sceneType);
    const sceneFullKey = buildSceneFullAudioKey(mergedSegments, sceneType);

    tasks.push({
      key: sceneSlug,
      sceneSlug,
      sceneType,
      segments: mergedSegments,
      targetPath: path.join(cwd, "public", "audio", "scenes", sceneSlug, `${sceneFullKey}.mp3`),
    });
  }
  return tasks;
};

const synthesizeSceneFull = async (task) => {
  const tts = new MsEdgeTTS();
  const buffers = [];
  let activeVoice = null;
  try {
    for (const segment of task.segments) {
      const voice = task.sceneType === "dialogue" && segment.speaker === "B" ? voiceGuy : voiceJenny;
      if (voice !== activeVoice) {
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
          voiceLocale: "en-US",
        });
        activeVoice = voice;
      }
      const { audioStream } = tts.toStream(segment.text, { rate: "default" });
      const chunkBuffers = [];
      await new Promise((resolve, reject) => {
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
    await mkdir(path.dirname(task.targetPath), { recursive: true });
    await writeFile(task.targetPath, Buffer.concat(buffers));
  } finally {
    tts.close();
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const synthesizeWithRetry = async (task, maxAttempts = 3) => {
  let attempt = 0;
  let lastError = null;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await synthesizeSceneFull(task);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      await sleep(300 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { slug: "", concurrency: 3, force: false };
  for (const arg of args) {
    if (arg.startsWith("--slug=")) {
      options.slug = arg.slice("--slug=".length).trim();
      continue;
    }
    if (arg.startsWith("--concurrency=")) {
      const parsed = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(parsed) && parsed > 0) options.concurrency = Math.floor(parsed);
      continue;
    }
    if (arg === "--force") {
      options.force = true;
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

  const { slug, concurrency, force } = parseArgs();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = admin.from("scenes").select("slug, scene_json").order("created_at", { ascending: false });
  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load scenes: ${error.message}`);

  const rows = data ?? [];
  const tasks = buildSceneTasks(rows);
  let generated = 0;
  let reused = 0;
  let failed = 0;

  console.log(`[tts:scene-full] scenes=${rows.length} tasks=${tasks.length} concurrency=${concurrency} force=${force}`);

  await runWithConcurrency(tasks, concurrency, async (task, idx) => {
    const existsAlready = await exists(task.targetPath);
    if (existsAlready && !force) {
      reused += 1;
      if ((idx + 1) % 10 === 0) {
        console.log(`[tts:scene-full] progress ${idx + 1}/${tasks.length}`);
      }
      return;
    }

    try {
      await synthesizeWithRetry(task, 3);
      generated += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[tts:scene-full] failed key=${task.key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if ((idx + 1) % 5 === 0) {
      console.log(`[tts:scene-full] progress ${idx + 1}/${tasks.length}`);
    }
  });

  console.log(`[tts:scene-full] done generated=${generated} reused=${reused} failed=${failed}`);
};

main().catch((error) => {
  console.error(`[tts:scene-full] fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
