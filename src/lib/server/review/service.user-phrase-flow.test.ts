import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import type {
  PhraseReviewLogRow,
  PhraseRow,
  UserDailyLearningStatsRow,
  UserPhraseRow,
} from "@/lib/server/db/types";

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

const basePhrase = (overrides: Partial<PhraseRow>): PhraseRow =>
  ({
    id: "phrase-1",
    normalized_text: "call it a day",
    display_text: "call it a day",
    translation: "今天先到这里",
    usage_note: "用于结束一段工作或练习。",
    difficulty: null,
    tags: [],
    is_builtin: false,
    is_core: false,
    created_at: "2026-05-15T00:00:00.000Z",
    updated_at: "2026-05-15T00:00:00.000Z",
    ...overrides,
  }) as PhraseRow;

const baseUserPhrase = (overrides: Partial<UserPhraseRow>): UserPhraseRow =>
  ({
    id: "user-phrase-1",
    user_id: "user-1",
    phrase_id: "phrase-1",
    status: "saved",
    review_status: "saved",
    review_count: 0,
    correct_count: 0,
    incorrect_count: 0,
    last_reviewed_at: null,
    next_review_at: "2026-05-14T00:00:00.000Z",
    mastered_at: null,
    source_scene_id: "scene-1",
    source_scene_slug: "daily-greeting",
    source_type: "scene",
    source_note: null,
    source_sentence_index: 0,
    source_sentence_text: "Let's call it a day.",
    source_chunk_text: "call it a day",
    learning_item_type: "expression",
    ai_enrichment_status: "pending",
    ai_enrichment_error: null,
    ai_enriched_at: null,
    saved_at: "2026-05-15T00:00:00.000Z",
    last_seen_at: "2026-05-15T00:00:00.000Z",
    archived_at: null,
    created_at: "2026-05-15T00:00:00.000Z",
    updated_at: "2026-05-15T00:00:00.000Z",
    ...overrides,
  }) as UserPhraseRow;

const attachPhrase = (row: UserPhraseRow): StoredUserPhrase => ({
  ...row,
  phrase: phrases.find((item) => item.id === row.phrase_id) ?? null,
});

class FakeQuery {
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private limitCount: number | null = null;
  private returning = false;

  constructor(
    private table: TableName,
    private operation: "select" | "update" | "upsert",
    private payload?: Record<string, unknown>,
  ) {}

  select() {
    this.returning = true;
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

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private tableRows(): Array<Record<string, unknown>> {
    if (this.table === "user_phrases") return userPhrases.map(attachPhrase) as Array<Record<string, unknown>>;
    if (this.table === "phrase_review_logs") return reviewLogs as Array<Record<string, unknown>>;
    if (this.table === "user_expression_cluster_members") return [];
    if (this.table === "user_daily_learning_stats") return dailyStats as Array<Record<string, unknown>>;
    return phrases as Array<Record<string, unknown>>;
  }

  private applyFilters(rows: Array<Record<string, unknown>>) {
    let result = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.limitCount !== null) result = result.slice(0, this.limitCount);
    return result;
  }

  private async execute(): Promise<{ data: unknown; error: null }> {
    if (this.operation === "update" && this.table === "user_phrases") {
      const matched = this.applyFilters(userPhrases as Array<Record<string, unknown>>);
      userPhrases = userPhrases.map((row) =>
        matched.some((item) => item.id === row.id)
          ? ({ ...row, ...this.payload } as UserPhraseRow)
          : row,
      );
      const updated = userPhrases.filter((row) => matched.some((item) => item.id === row.id));
      return { data: this.returning ? updated.map(attachPhrase)[0] ?? null : null, error: null };
    }

    if (this.operation === "upsert" && this.table === "user_daily_learning_stats") {
      const next = this.payload as UserDailyLearningStatsRow;
      dailyStats = [
        next,
        ...dailyStats.filter((row) => !(row.user_id === next.user_id && row.date === next.date)),
      ];
      return { data: this.returning ? next : null, error: null };
    }

    return { data: this.applyFilters(this.tableRows()), error: null };
  }
}

const fakeClient = {
  from: (table: TableName) => {
    requestedTables.push(table);
    return {
      select: () => new FakeQuery(table, "select"),
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
    listVisibleScenesBySlugs: async ({
      slugs,
    }: {
      userId: string;
      slugs: string[];
    }) => slugs.filter(Boolean).map((slug) => ({ slug })),
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

const getService = () => {
  const modulePath = localRequire.resolve("./service");
  delete localRequire.cache[modulePath];
  return localRequire("./service") as typeof import("./service");
};

afterEach(() => {
  phrases = [];
  userPhrases = [];
  reviewLogs = [];
  dailyStats = [];
  requestedTables = [];
});

test("Review due 会消费 scene 保存生成的 user_phrase，而不是直接读取 builtin chunk", async () => {
  phrases = [
    basePhrase({ id: "phrase-1", display_text: "call it a day" }),
    basePhrase({ id: "builtin-only", display_text: "orphan builtin chunk", is_builtin: true }),
  ];
  userPhrases = [
    baseUserPhrase({ id: "user-phrase-1", phrase_id: "phrase-1" }),
    baseUserPhrase({
      id: "future-user-phrase",
      phrase_id: "future-phrase",
      next_review_at: "2999-01-01T00:00:00.000Z",
    }),
  ];

  const service = getService();
  const rows = await service.getDueReviewItems("user-1", { limit: 20 });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.userPhraseId, "user-phrase-1");
  assert.equal(rows[0]?.text, "call it a day");
  assert.equal(rows[0]?.sourceSceneSlug, "daily-greeting");
  assert.equal(rows[0]?.sourceSceneAvailable, true);
  assert.equal(rows[0]?.reviewStatus, "saved");
  assert.equal(rows[0]?.nextReviewAt, "2026-05-14T00:00:00.000Z");
  assert.ok(requestedTables.includes("user_phrases"));
  assert.equal(requestedTables.includes("phrases"), false);
  assert.equal(rows.some((row) => row.text === "orphan builtin chunk"), false);
});

test("Review due 会把 next_review_at 为空的已保存 user_phrase 视为可消费", async () => {
  phrases = [basePhrase({ id: "phrase-1", display_text: "call it a day" })];
  userPhrases = [
    baseUserPhrase({
      id: "user-phrase-1",
      phrase_id: "phrase-1",
      next_review_at: null,
    }),
  ];

  const service = getService();
  const rows = await service.getDueReviewItems("user-1", { limit: 20 });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.userPhraseId, "user-phrase-1");
  assert.equal(rows[0]?.nextReviewAt, null);
});

test("Review submit 会写 review log 并推进 user_phrase review 状态", async () => {
  phrases = [basePhrase({ id: "phrase-1", display_text: "call it a day" })];
  userPhrases = [baseUserPhrase({ id: "user-phrase-1", phrase_id: "phrase-1" })];

  const service = getService();
  const item = await service.submitPhraseReview("user-1", {
    userPhraseId: "user-phrase-1",
    reviewResult: "good",
    source: "review_page",
    recognitionState: "recognized",
    outputConfidence: "high",
    fullOutputStatus: "completed",
    variantRewriteStatus: "completed",
    variantRewritePromptId: "self",
    fullOutputText: "We should call it a day now.",
  });

  const updated = userPhrases[0];
  assert.equal(item.userPhraseId, "user-phrase-1");
  assert.equal(item.reviewStatus, "reviewing");
  assert.equal(updated?.review_status, "reviewing");
  assert.equal(updated?.review_count, 1);
  assert.equal(updated?.correct_count, 1);
  assert.equal(updated?.incorrect_count, 0);
  assert.equal(typeof updated?.last_reviewed_at, "string");
  assert.equal(typeof updated?.next_review_at, "string");
  assert.equal(reviewLogs.length, 1);
  assert.equal(reviewLogs[0]?.user_phrase_id, "user-phrase-1");
  assert.equal(reviewLogs[0]?.review_result, "good");
  assert.equal(reviewLogs[0]?.full_output_coverage, "contains_target");
  assert.equal(reviewLogs[0]?.was_correct, true);
  assert.equal(dailyStats[0]?.review_items_completed, 1);
});
