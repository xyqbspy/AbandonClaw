import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";

import type {
  PhraseReviewLogRow,
  PhraseRow,
  UserDailyLearningStatsRow,
  UserPhraseRow,
} from "@/lib/server/db/types";
import type { SceneListItem } from "@/lib/server/scene/service";
import type { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

import { builtinSceneSeeds } from "@/lib/data/builtin-scene-seeds";
import { normalizeSavePhrasePayload } from "@/lib/server/request-schemas";
import { resolveSavedPhraseReviewState } from "@/lib/server/phrases/logic";
import { normalizePhraseText } from "@/lib/shared/phrases";
import { getTodayPrimaryRecommendation } from "./today-primary-recommendation";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

type TableName =
  | "user_phrases"
  | "phrases"
  | "phrase_review_logs"
  | "user_expression_cluster_members"
  | "user_daily_learning_stats";

type StoredUserPhrase = UserPhraseRow & { phrase?: PhraseRow | null };
type StoredReviewLog = Partial<PhraseReviewLogRow> & {
  user_id: string;
  phrase_id: string;
  user_phrase_id: string;
  review_result: "again" | "hard" | "good";
  was_correct: boolean;
  reviewed_at: string;
};

let phrases: PhraseRow[] = [];
let userPhrases: UserPhraseRow[] = [];
let reviewLogs: StoredReviewLog[] = [];
let dailyStats: UserDailyLearningStatsRow[] = [];
let requestedTables: TableName[] = [];

const getFreshModule = <T>(request: string): T => {
  const modulePath = localRequire.resolve(request);
  delete localRequire.cache[modulePath];
  return localRequire(request) as T;
};

const countSentences = (seed: (typeof builtinSceneSeeds)[number]) =>
  seed.lesson.sections.reduce(
    (sectionTotal, section) =>
      sectionTotal +
      section.blocks.reduce((blockTotal, block) => blockTotal + block.sentences.length, 0),
    0,
  );

const toSceneListItem = (
  seed: (typeof builtinSceneSeeds)[number],
  overrides: Partial<SceneListItem> = {},
): SceneListItem => ({
  id: seed.meta.slug,
  slug: seed.meta.slug,
  title: seed.meta.title,
  subtitle: seed.lesson.subtitle ?? "",
  level: seed.meta.level,
  category: seed.meta.category,
  subcategory: seed.meta.subcategory ?? null,
  difficulty: seed.lesson.difficulty,
  estimatedMinutes: seed.meta.estimatedMinutes,
  learningGoal: seed.meta.learningGoal,
  tags: seed.meta.tags,
  sentenceCount: countSentences(seed),
  sceneType: seed.lesson.sceneType ?? "dialogue",
  sourceType: seed.meta.sourceType,
  isStarter: seed.meta.isStarter,
  starterOrder: seed.meta.starterOrder,
  isFeatured: seed.meta.isFeatured,
  sortOrder: seed.meta.sortOrder,
  createdAt: "2026-05-15T00:00:00.000Z",
  variantLinks: [],
  learningStatus: "not_started",
  progressPercent: 0,
  lastViewedAt: null,
  ...overrides,
});

const basePhrase = (overrides: Partial<PhraseRow>): PhraseRow => ({
  id: "phrase-p0",
  normalized_text: "call it a day",
  display_text: "call it a day",
  translation: null,
  usage_note: null,
  difficulty: null,
  tags: [],
  is_builtin: false,
  is_core: false,
  level: null,
  category: null,
  phrase_type: null,
  source_scene_slug: null,
  frequency_rank: null,
  created_at: "2026-05-15T00:00:00.000Z",
  updated_at: "2026-05-15T00:00:00.000Z",
  ...overrides,
});

const baseUserPhrase = (overrides: Partial<UserPhraseRow>): UserPhraseRow => ({
  id: "user-phrase-p0",
  user_id: "user-p0",
  phrase_id: "phrase-p0",
  status: "saved",
  review_status: "saved",
  review_count: 0,
  correct_count: 0,
  incorrect_count: 0,
  last_reviewed_at: null,
  next_review_at: "2000-01-01T00:00:00.000Z",
  mastered_at: null,
  source_scene_id: "scene-p0",
  source_scene_slug: "daily-greeting",
  source_type: "scene",
  source_note: null,
  source_sentence_index: 0,
  source_sentence_text: "How's it going?",
  source_chunk_text: "How's it going?",
  ai_enrichment_status: "pending",
  ai_semantic_focus: null,
  ai_typical_scenario: null,
  ai_example_sentences: [],
  ai_enrichment_error: null,
  learning_item_type: "expression",
  saved_at: "2000-01-01T00:00:00.000Z",
  last_seen_at: "2000-01-01T00:00:00.000Z",
  created_at: "2000-01-01T00:00:00.000Z",
  updated_at: "2000-01-01T00:00:00.000Z",
  ...overrides,
});

const attachPhrase = (row: UserPhraseRow): StoredUserPhrase => ({
  ...row,
  phrase: phrases.find((item) => item.id === row.phrase_id) ?? null,
});

class FakeQuery {
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private limitCount: number | null = null;
  private rangeWindow: { from: number; to: number } | null = null;
  private returning = false;
  private countMode: "exact" | null = null;

  constructor(
    private table: TableName,
    private operation: "select" | "update" | "upsert",
    private payload?: Record<string, unknown>,
    options?: { count?: "exact"; head?: boolean },
  ) {
    this.countMode = options?.count === "exact" ? "exact" : null;
  }

  select(_columns?: string, options?: { count?: "exact"; head?: boolean }) {
    this.returning = true;
    if (options?.count === "exact") {
      this.countMode = "exact";
    }
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push((row) => {
      const raw = row[column];
      return typeof raw === "string" && typeof value === "string" && raw >= value;
    });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push((row) => {
      const raw = row[column];
      return typeof raw === "string" && typeof value === "string" && raw < value;
    });
    return this;
  }

  or(expression: string) {
    const dueMatch = expression.match(/next_review_at\.lte\.(.+)$/);
    if (expression.includes("next_review_at.is.null") && dueMatch?.[1]) {
      const dueAt = dueMatch[1];
      this.filters.push((row) => {
        const value = row.next_review_at;
        return value === null || (typeof value === "string" && value <= dueAt);
      });
    }
    return this;
  }

  order() {
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeWindow = { from, to };
    return this;
  }

  maybeSingle<T>() {
    return this.execute().then(({ data, error }) => ({
      data: (Array.isArray(data) ? data[0] ?? null : data) as T | null,
      error,
    }));
  }

  single<T>() {
    return this.execute().then(({ data, error }) => ({
      data: (Array.isArray(data) ? data[0] ?? null : data) as T | null,
      error,
    }));
  }

  then<TResult1 = { data: unknown; error: null; count?: number }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private tableRows(): Array<Record<string, unknown>> {
    if (this.table === "user_phrases") {
      return userPhrases.map(attachPhrase) as Array<Record<string, unknown>>;
    }
    if (this.table === "phrase_review_logs") {
      return reviewLogs as Array<Record<string, unknown>>;
    }
    if (this.table === "user_daily_learning_stats") {
      return dailyStats as Array<Record<string, unknown>>;
    }
    if (this.table === "user_expression_cluster_members") {
      return [];
    }
    return phrases as Array<Record<string, unknown>>;
  }

  private applyFilters(rows: Array<Record<string, unknown>>) {
    const filtered = rows.filter((row) => this.filters.every((filter) => filter(row)));
    let result = filtered;
    if (this.rangeWindow) {
      result = result.slice(this.rangeWindow.from, this.rangeWindow.to + 1);
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }
    return { filtered, result };
  }

  private async execute(): Promise<{ data: unknown; error: null; count?: number }> {
    if (this.operation === "update" && this.table === "user_phrases") {
      const matched = this.applyFilters(userPhrases as Array<Record<string, unknown>>).filtered;
      userPhrases = userPhrases.map((row) =>
        matched.some((item) => item.id === row.id)
          ? ({ ...row, ...this.payload } as UserPhraseRow)
          : row,
      );
      const updated = userPhrases.filter((row) => matched.some((item) => item.id === row.id));
      return {
        data: this.returning ? updated.map(attachPhrase)[0] ?? null : null,
        error: null,
        count: this.countMode === "exact" ? updated.length : undefined,
      };
    }

    if (this.operation === "upsert" && this.table === "user_daily_learning_stats") {
      const next = this.payload as UserDailyLearningStatsRow;
      dailyStats = [
        next,
        ...dailyStats.filter((row) => !(row.user_id === next.user_id && row.date === next.date)),
      ];
      return {
        data: this.returning ? next : null,
        error: null,
        count: this.countMode === "exact" ? 1 : undefined,
      };
    }

    const { filtered, result } = this.applyFilters(this.tableRows());
    return {
      data: result,
      error: null,
      count: this.countMode === "exact" ? filtered.length : undefined,
    };
  }
}

const fakeClient = {
  from: (table: TableName) => {
    requestedTables.push(table);
    return {
      select: (_columns?: string, options?: { count?: "exact"; head?: boolean }) =>
        new FakeQuery(table, "select", undefined, options),
      update: (payload: Record<string, unknown>) => new FakeQuery(table, "update", payload),
      upsert: (payload: Record<string, unknown>) => new FakeQuery(table, "upsert", payload),
      insert: (payload: Record<string, unknown>) => {
        if (table === "phrase_review_logs") {
          reviewLogs.push(payload as StoredReviewLog);
        }
        return Promise.resolve({ error: null });
      },
    };
  },
};

const mockedModules = {
  "@/lib/supabase/server": {
    createSupabaseServerClient: async () => fakeClient,
  },
  "@/lib/server/scene/repository": {
    listVisibleScenesBySlugs: async ({ slugs }: { userId: string; slugs: string[] }) =>
      slugs.filter(Boolean).map((slug) => ({ slug })),
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

const findFirstSavedChunk = (seed: (typeof builtinSceneSeeds)[number]) => {
  for (const section of seed.lesson.sections) {
    for (const block of section.blocks) {
      for (const [sentenceIndex, sentence] of block.sentences.entries()) {
        const chunk = sentence.chunkDetails?.[0];
        if (chunk) {
          return { chunk, sentence, sentenceIndex };
        }
      }
    }
  }
  throw new Error(`No chunk details found for ${seed.meta.slug}`);
};

const createJsonRequest = (
  url: string,
  body?: unknown,
  method = "POST",
  headers?: Record<string, string>,
) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

afterEach(() => {
  phrases = [];
  userPhrases = [];
  reviewLogs = [];
  dailyStats = [];
  requestedTables = [];
  const { clearIdempotencyStore } = getFreshModule<typeof import("../idempotency")>(
    "../idempotency",
  );
  clearIdempotencyStore();
});

test("P0 learning loop contracts connect starter scene save, mine, review, and next starter", async () => {
  const starterSeeds = builtinSceneSeeds
    .filter((seed) => seed.meta.isStarter)
    .sort(
      (left, right) =>
        (left.meta.starterOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.meta.starterOrder ?? Number.MAX_SAFE_INTEGER),
    );
  assert.equal(starterSeeds.length >= 2, true);

  const [firstStarter, secondStarter] = starterSeeds;
  const starterScenes = starterSeeds.map((seed) => toSceneListItem(seed));
  const newUserRecommendation = getTodayPrimaryRecommendation({
    scenes: starterScenes,
    continueLearning: null,
    dueReviewCount: 0,
  });

  assert.equal(newUserRecommendation.type, "start_starter");
  assert.equal(newUserRecommendation.scene?.slug, firstStarter.meta.slug);
  assert.equal(newUserRecommendation.href, `/scene/${firstStarter.meta.slug}`);
  assert.equal(firstStarter.lesson.explanations.length > 0, true);
  assert.equal(firstStarter.lesson.explanations[0]?.chunkType, "core_phrase");

  const { chunk, sentence, sentenceIndex } = findFirstSavedChunk(firstStarter);
  const normalizedSavePayload = normalizeSavePhrasePayload({
    text: chunk.text,
    learningItemType: "expression",
    translation: chunk.translation,
    sourceSceneSlug: firstStarter.meta.slug,
    sourceType: "scene",
    sourceSentenceIndex: sentenceIndex,
    sourceSentenceText: sentence.text,
    sourceChunkText: chunk.text,
  });
  const savedAt = "2000-01-01T00:00:00.000Z";
  const savedReviewState = resolveSavedPhraseReviewState({
    learningItemType: normalizedSavePayload.learningItemType,
    now: savedAt,
  });

  assert.equal(normalizedSavePayload.sourceType, "scene");
  assert.equal(normalizedSavePayload.sourceSceneSlug, firstStarter.meta.slug);
  assert.equal(normalizedSavePayload.sourceChunkText, chunk.text);
  assert.deepEqual(savedReviewState, {
    reviewStatus: "saved",
    nextReviewAt: savedAt,
  });

  const phrase = basePhrase({
    id: "phrase-p0",
    normalized_text: normalizePhraseText(chunk.text),
    display_text: chunk.text,
    translation: chunk.translation,
    source_scene_slug: firstStarter.meta.slug,
  });
  phrases = [
    phrase,
    basePhrase({
      id: "builtin-only",
      normalized_text: "orphan builtin chunk",
      display_text: "orphan builtin chunk",
      is_builtin: true,
      is_core: true,
      source_scene_slug: firstStarter.meta.slug,
    }),
  ];
  userPhrases = [
    baseUserPhrase({
      id: "user-phrase-p0",
      user_id: "user-p0",
      phrase_id: phrase.id,
      review_status: savedReviewState.reviewStatus,
      next_review_at: savedReviewState.nextReviewAt,
      source_scene_slug: normalizedSavePayload.sourceSceneSlug ?? null,
      source_type: normalizedSavePayload.sourceType,
      source_sentence_index: normalizedSavePayload.sourceSentenceIndex ?? null,
      source_sentence_text: normalizedSavePayload.sourceSentenceText ?? null,
      source_chunk_text: normalizedSavePayload.sourceChunkText ?? null,
      saved_at: savedAt,
      last_seen_at: savedAt,
      created_at: savedAt,
      updated_at: savedAt,
    }),
  ];

  const phraseService = getFreshModule<typeof import("../phrases/service")>(
    "../phrases/service",
  );
  const mineResult = await phraseService.listUserSavedPhrases({
    userId: "user-p0",
    status: "saved",
    reviewStatus: "all",
    learningItemType: "expression",
    page: 1,
    limit: 20,
  });
  const mineRow = mineResult.rows[0];
  assert.ok(mineRow);
  const chunksMineContract: UserPhraseItemResponse = mineRow;

  assert.equal(mineResult.total, 1);
  assert.equal(chunksMineContract.userPhraseId, "user-phrase-p0");
  assert.equal(chunksMineContract.sourceType, "scene");
  assert.equal(chunksMineContract.sourceSceneSlug, firstStarter.meta.slug);
  assert.equal(chunksMineContract.sourceChunkText, chunk.text);

  const reviewService = getFreshModule<typeof import("../review/service")>(
    "../review/service",
  );
  const handlers = getFreshModule<typeof import("../../../app/api/review/handlers")>(
    "../../../app/api/review/handlers",
  );

  requestedTables = [];
  const dueResponse = await handlers.handleReviewDueGet(
    createJsonRequest("http://localhost/api/review/due?limit=20", undefined, "GET"),
    {
      requireCurrentProfile: async () => ({ user: { id: "user-p0" } } as never),
      getDueReviewItems: reviewService.getDueReviewItems,
      getDueScenePracticeReviewItems: async () => [] as never,
    },
  );
  const dueBody = (await dueResponse.json()) as {
    rows: Array<{ userPhraseId: string; text: string; sourceSceneSlug: string | null }>;
    total: number;
  };

  assert.equal(dueResponse.status, 200);
  assert.equal(dueBody.total, 1);
  assert.equal(dueBody.rows[0]?.userPhraseId, "user-phrase-p0");
  assert.equal(dueBody.rows[0]?.text, chunk.text);
  assert.equal(dueBody.rows[0]?.sourceSceneSlug, firstStarter.meta.slug);
  assert.equal(dueBody.rows.some((row) => row.text === "orphan builtin chunk"), false);
  assert.equal(requestedTables.includes("user_phrases"), true);
  assert.equal(requestedTables.includes("phrases"), false);

  const submitRequest = createJsonRequest(
    "http://localhost/api/review/submit",
    {
      userPhraseId: "user-phrase-p0",
      reviewResult: "good",
      source: "p0_regression",
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      variantRewritePromptId: "self",
      fullOutputText: `I can say ${chunk.text} in context.`,
    },
    "POST",
    { "x-idempotency-key": "p0-review-submit" },
  );
  const submitDependencies = {
    requireCurrentProfile: async () => ({ user: { id: "user-p0" } } as never),
    submitPhraseReview: reviewService.submitPhraseReview,
    getReviewSummary: reviewService.getReviewSummary,
  };

  const firstSubmit = await handlers.handleReviewSubmitPost(
    submitRequest.clone(),
    submitDependencies,
  );
  const secondSubmit = await handlers.handleReviewSubmitPost(
    submitRequest.clone(),
    submitDependencies,
  );
  const firstSubmitBody = await firstSubmit.json();
  const secondSubmitBody = await secondSubmit.json();

  assert.equal(firstSubmit.status, 200);
  assert.equal(secondSubmit.status, 200);
  assert.deepEqual(firstSubmitBody, secondSubmitBody);
  assert.equal(reviewLogs.length, 1);
  assert.equal(reviewLogs[0]?.user_phrase_id, "user-phrase-p0");
  assert.equal(reviewLogs[0]?.review_result, "good");
  assert.equal(reviewLogs[0]?.was_correct, true);
  assert.equal(reviewLogs[0]?.full_output_coverage, "contains_target");
  assert.equal(userPhrases[0]?.review_status, "reviewing");
  assert.equal(userPhrases[0]?.review_count, 1);
  assert.equal(userPhrases[0]?.correct_count, 1);
  assert.equal(userPhrases[0]?.incorrect_count, 0);
  assert.equal(typeof userPhrases[0]?.next_review_at, "string");
  assert.notEqual(userPhrases[0]?.next_review_at, savedAt);
  assert.equal(dailyStats[0]?.review_items_completed, 1);
  assert.equal(firstSubmitBody.summary.reviewedTodayCount, 1);
  assert.equal(firstSubmitBody.summary.reviewAccuracy, 100);

  const nextRecommendation = getTodayPrimaryRecommendation({
    scenes: starterSeeds.map((seed, index) =>
      toSceneListItem(seed, {
        learningStatus: index === 0 ? "completed" : "not_started",
        progressPercent: index === 0 ? 100 : 0,
      }),
    ),
    continueLearning: null,
    dueReviewCount: firstSubmitBody.summary.dueReviewCount,
  });

  assert.equal(nextRecommendation.type, "next_starter");
  assert.equal(nextRecommendation.scene?.slug, secondStarter.meta.slug);
});
