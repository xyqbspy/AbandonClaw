import {
  cleanupRuntimeCacheRecord,
  clearRuntimeCacheByPrefixes,
  readRuntimeCacheRecord,
  readRuntimeCacheRecordSync,
  RuntimeCacheEnvelope,
  writeRuntimeCacheRecord,
} from "@/lib/cache/runtime-cache-core";
import { normalizePhraseText } from "@/lib/shared/phrases";
import {
  SceneLearningProgressResponse,
  ScenePracticeSnapshotResponse,
  SceneVariantRunResponse,
} from "@/lib/utils/learning-api";

type SceneSavedPhraseTextsCacheRecord = RuntimeCacheEnvelope<
  "scene-saved-phrase-texts-cache-v1",
  "scene_saved_phrase_texts",
  {
    sceneId: string;
    normalizedTexts: string[];
  }
>;

type ScenePracticeSnapshotCacheRecord = RuntimeCacheEnvelope<
  "scene-practice-snapshot-cache-v1",
  "scene_practice_snapshot",
  {
    sceneSlug: string;
    practiceSetId: string;
    snapshot: ScenePracticeSnapshotResponse;
  }
>;

type SceneVariantRunCacheRecord = RuntimeCacheEnvelope<
  "scene-variant-run-cache-v1",
  "scene_variant_run",
  {
    sceneSlug: string;
    variantSetId: string;
    snapshot: SceneVariantRunResponse;
  }
>;

type SceneLearningProgressCacheRecord = RuntimeCacheEnvelope<
  "scene-learning-progress-cache-v1",
  "scene_learning_progress",
  {
    sceneSlug: string;
    state: SceneLearningProgressResponse;
  }
>;

const SAVED_TEXTS_SCHEMA_VERSION: SceneSavedPhraseTextsCacheRecord["schemaVersion"] =
  "scene-saved-phrase-texts-cache-v1";
const PRACTICE_SNAPSHOT_SCHEMA_VERSION: ScenePracticeSnapshotCacheRecord["schemaVersion"] =
  "scene-practice-snapshot-cache-v1";
const VARIANT_RUN_SCHEMA_VERSION: SceneVariantRunCacheRecord["schemaVersion"] =
  "scene-variant-run-cache-v1";
const LEARNING_PROGRESS_SCHEMA_VERSION: SceneLearningProgressCacheRecord["schemaVersion"] =
  "scene-learning-progress-cache-v1";

const SAVED_TEXTS_PREFIX = "scene-saved-texts:v1:";
const PRACTICE_SNAPSHOT_PREFIX = "scene-practice-snapshot:v1:";
const VARIANT_RUN_PREFIX = "scene-variant-run:v1:";
const LEARNING_PROGRESS_PREFIX = "scene-learning-progress:v1:";

const SAVED_TEXTS_TTL_MS = 30 * 60 * 1000;
const PRACTICE_SNAPSHOT_TTL_MS = 30 * 60 * 1000;
const VARIANT_RUN_TTL_MS = 30 * 60 * 1000;
const LEARNING_PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;

const memorySavedTextsRecords = new Map<string, SceneSavedPhraseTextsCacheRecord>();
const memoryPracticeSnapshotRecords = new Map<string, ScenePracticeSnapshotCacheRecord>();
const memoryVariantRunRecords = new Map<string, SceneVariantRunCacheRecord>();
const memoryLearningProgressRecords = new Map<string, SceneLearningProgressCacheRecord>();

const nowMs = () => Date.now();
const normalizeId = (value: string) => value.trim();
const normalizeSceneSlug = (value: string) => value.trim().toLowerCase();

const savedTextsKey = (sceneId: string) => `${SAVED_TEXTS_PREFIX}${normalizeId(sceneId)}`;
const practiceSnapshotKey = (sceneSlug: string, practiceSetId: string) =>
  `${PRACTICE_SNAPSHOT_PREFIX}${normalizeSceneSlug(sceneSlug)}:${normalizeId(practiceSetId)}`;
const variantRunKey = (sceneSlug: string, variantSetId: string) =>
  `${VARIANT_RUN_PREFIX}${normalizeSceneSlug(sceneSlug)}:${normalizeId(variantSetId)}`;
const learningProgressKey = (sceneSlug: string) =>
  `${LEARNING_PROGRESS_PREFIX}${normalizeSceneSlug(sceneSlug)}`;

const isPracticeSnapshotValid = (snapshot: ScenePracticeSnapshotResponse) =>
  Boolean(snapshot) &&
  typeof snapshot.summary?.completedModeCount === "number" &&
  typeof snapshot.summary?.totalAttemptCount === "number" &&
  typeof snapshot.summary?.correctAttemptCount === "number";

const isVariantRunSnapshotValid = (snapshot: SceneVariantRunResponse) =>
  Boolean(snapshot) &&
  (snapshot.run === null ||
    (typeof snapshot.run.variantSetId === "string" && Array.isArray(snapshot.run.viewedVariantIds)));

const isSavedTextsRecordValid = (record: SceneSavedPhraseTextsCacheRecord, key: string) =>
  record.schemaVersion === SAVED_TEXTS_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "scene_saved_phrase_texts" &&
  typeof record.data?.sceneId === "string" &&
  Array.isArray(record.data.normalizedTexts) &&
  record.data.normalizedTexts.every((text) => typeof text === "string");

const isPracticeSnapshotRecordValid = (record: ScenePracticeSnapshotCacheRecord, key: string) =>
  record.schemaVersion === PRACTICE_SNAPSHOT_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "scene_practice_snapshot" &&
  typeof record.data?.sceneSlug === "string" &&
  typeof record.data?.practiceSetId === "string" &&
  isPracticeSnapshotValid(record.data.snapshot);

const isVariantRunRecordValid = (record: SceneVariantRunCacheRecord, key: string) =>
  record.schemaVersion === VARIANT_RUN_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "scene_variant_run" &&
  typeof record.data?.sceneSlug === "string" &&
  typeof record.data?.variantSetId === "string" &&
  isVariantRunSnapshotValid(record.data.snapshot);

const isSceneLearningProgressValid = (state: SceneLearningProgressResponse) =>
  Boolean(state) &&
  typeof state.progress?.sceneId === "string" &&
  typeof state.progress?.progressPercent === "number" &&
  typeof state.progress?.masteryPercent === "number" &&
  (state.session === null ||
    (typeof state.session.id === "string" && typeof state.session.currentStep === "string"));

const isLearningProgressRecordValid = (record: SceneLearningProgressCacheRecord, key: string) =>
  record.schemaVersion === LEARNING_PROGRESS_SCHEMA_VERSION &&
  record.key === key &&
  record.type === "scene_learning_progress" &&
  typeof record.data?.sceneSlug === "string" &&
  isSceneLearningProgressValid(record.data.state);

export async function getSceneSavedPhraseTextsCache(sceneId: string) {
  const key = savedTextsKey(sceneId);
  return readRuntimeCacheRecord(key, memorySavedTextsRecords, isSavedTextsRecordValid);
}

export async function setSceneSavedPhraseTextsCache(sceneId: string, texts: string[]) {
  const normalizedTexts = Array.from(
    new Set(texts.map((text) => normalizePhraseText(text)).filter(Boolean)),
  );
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: SAVED_TEXTS_SCHEMA_VERSION,
      key: savedTextsKey(sceneId),
      type: "scene_saved_phrase_texts",
      data: {
        sceneId: normalizeId(sceneId),
        normalizedTexts,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + SAVED_TEXTS_TTL_MS,
    },
    memorySavedTextsRecords,
  );
}

export async function getScenePracticeSnapshotCache(sceneSlug: string, practiceSetId: string) {
  const key = practiceSnapshotKey(sceneSlug, practiceSetId);
  return readRuntimeCacheRecord(key, memoryPracticeSnapshotRecords, isPracticeSnapshotRecordValid);
}

export async function setScenePracticeSnapshotCache(
  sceneSlug: string,
  practiceSetId: string,
  snapshot: ScenePracticeSnapshotResponse,
) {
  if (!isPracticeSnapshotValid(snapshot)) return;
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: PRACTICE_SNAPSHOT_SCHEMA_VERSION,
      key: practiceSnapshotKey(sceneSlug, practiceSetId),
      type: "scene_practice_snapshot",
      data: {
        sceneSlug: normalizeSceneSlug(sceneSlug),
        practiceSetId: normalizeId(practiceSetId),
        snapshot,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + PRACTICE_SNAPSHOT_TTL_MS,
    },
    memoryPracticeSnapshotRecords,
  );
}

export async function getSceneVariantRunCache(sceneSlug: string, variantSetId: string) {
  const key = variantRunKey(sceneSlug, variantSetId);
  return readRuntimeCacheRecord(key, memoryVariantRunRecords, isVariantRunRecordValid);
}

export async function setSceneVariantRunCache(
  sceneSlug: string,
  variantSetId: string,
  snapshot: SceneVariantRunResponse,
) {
  if (!isVariantRunSnapshotValid(snapshot)) return;
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: VARIANT_RUN_SCHEMA_VERSION,
      key: variantRunKey(sceneSlug, variantSetId),
      type: "scene_variant_run",
      data: {
        sceneSlug: normalizeSceneSlug(sceneSlug),
        variantSetId: normalizeId(variantSetId),
        snapshot,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + VARIANT_RUN_TTL_MS,
    },
    memoryVariantRunRecords,
  );
}

export async function getSceneLearningProgressCache(sceneSlug: string) {
  const key = learningProgressKey(sceneSlug);
  return readRuntimeCacheRecord(key, memoryLearningProgressRecords, isLearningProgressRecordValid);
}

export function getSceneLearningProgressCacheSnapshotSync(sceneSlug: string) {
  const key = learningProgressKey(sceneSlug);
  return readRuntimeCacheRecordSync(
    key,
    memoryLearningProgressRecords,
    isLearningProgressRecordValid,
    cleanupRuntimeCacheRecord,
  );
}

export async function setSceneLearningProgressCache(
  sceneSlug: string,
  state: SceneLearningProgressResponse,
) {
  if (!isSceneLearningProgressValid(state)) return;
  const currentNow = nowMs();
  await writeRuntimeCacheRecord(
    {
      schemaVersion: LEARNING_PROGRESS_SCHEMA_VERSION,
      key: learningProgressKey(sceneSlug),
      type: "scene_learning_progress",
      data: {
        sceneSlug: normalizeSceneSlug(sceneSlug),
        state,
      },
      cachedAt: currentNow,
      lastAccessedAt: currentNow,
      expiresAt: currentNow + LEARNING_PROGRESS_TTL_MS,
    },
    memoryLearningProgressRecords,
  );
}

export async function clearAllSceneRuntimeCache() {
  await clearRuntimeCacheByPrefixes(
    [
      memorySavedTextsRecords as Map<string, unknown>,
      memoryPracticeSnapshotRecords as Map<string, unknown>,
      memoryVariantRunRecords as Map<string, unknown>,
      memoryLearningProgressRecords as Map<string, unknown>,
    ],
    [SAVED_TEXTS_PREFIX, PRACTICE_SNAPSHOT_PREFIX, VARIANT_RUN_PREFIX, LEARNING_PROGRESS_PREFIX],
  );
}
