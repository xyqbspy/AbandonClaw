import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import type { PracticeSet } from "@/lib/types/learning-flow";
import type { UserScenePracticeSetRow } from "@/lib/server/db/types";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Scene 1",
  sourceType: "original",
  generationSource: "ai",
  exercises: [],
  status: "generated",
  createdAt: "2026-04-21T00:00:00.000Z",
};

let rows: UserScenePracticeSetRow[] = [];

class FakeQuery {
  private filters: Array<(row: UserScenePracticeSetRow) => boolean> = [];
  private limitCount: number | null = null;
  private orderColumn: keyof UserScenePracticeSetRow | null = null;
  private orderAscending = true;
  private returning = false;

  constructor(
    private operation: "select" | "update" | "upsert",
    private payload?: Partial<UserScenePracticeSetRow>,
  ) {}

  select() {
    this.returning = true;
    return this;
  }

  eq(column: keyof UserScenePracticeSetRow, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  is(column: keyof UserScenePracticeSetRow, value: null) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: keyof UserScenePracticeSetRow, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  order(column: keyof UserScenePracticeSetRow, options: { ascending: boolean }) {
    this.orderColumn = column;
    this.orderAscending = options.ascending;
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

  private applyFilters() {
    let result = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.orderColumn) {
      const column = this.orderColumn;
      result = [...result].sort((left, right) => {
        const leftValue = String(left[column] ?? "");
        const rightValue = String(right[column] ?? "");
        return this.orderAscending
          ? leftValue.localeCompare(rightValue)
          : rightValue.localeCompare(leftValue);
      });
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }

  private async execute(): Promise<{ data: unknown; error: null }> {
    if (this.operation === "upsert") {
      const row = {
        created_at: "2026-04-21T00:00:00.000Z",
        updated_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        ...this.payload,
      } as UserScenePracticeSetRow;
      rows = [row, ...rows.filter((item) => item.id !== row.id)];
      return { data: this.returning ? row : null, error: null };
    }

    if (this.operation === "update") {
      const matched = this.applyFilters();
      rows = rows.map((row) =>
        matched.some((item) => item.id === row.id)
          ? ({
              ...row,
              ...this.payload,
              updated_at: "2026-04-21T00:01:00.000Z",
            } as UserScenePracticeSetRow)
          : row,
      );
      const updated = rows.filter((row) => matched.some((item) => item.id === row.id));
      return { data: this.returning ? updated[0] ?? null : null, error: null };
    }

    return { data: this.applyFilters(), error: null };
  }
}

const fakeClient = {
  from: () => ({
    select: () => new FakeQuery("select"),
    update: (payload: Partial<UserScenePracticeSetRow>) => new FakeQuery("update", payload),
    upsert: (payload: Partial<UserScenePracticeSetRow>) => new FakeQuery("upsert", payload),
  }),
};

const mockedModules = {
  "@/lib/supabase/server": {
    createSupabaseServerClient: async () => fakeClient,
  },
  "@/lib/server/scene/service": {
    getSceneRecordBySlug: async () => ({
      row: {
        id: "scene-1",
      },
    }),
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
  const modulePath = localRequire.resolve("./practice-set-service");
  delete localRequire.cache[modulePath];
  return localRequire("./practice-set-service") as typeof import("./practice-set-service");
};

afterEach(() => {
  rows = [];
});

test("scene practice set service 会保存并读取 latest practice set", async () => {
  const service = getService();

  await service.saveScenePracticeSet("user-1", "scene-1", {
    practiceSet,
    replaceExisting: false,
  });
  const latest = await service.getLatestScenePracticeSet("user-1", "scene-1");

  assert.equal(latest.practiceSet?.id, "practice-1");
  assert.equal(rows[0]?.user_id, "user-1");
  assert.equal(rows[0]?.scene_id, "scene-1");
});

test("scene practice set service 重新生成会废弃同来源旧 set", async () => {
  const service = getService();

  await service.saveScenePracticeSet("user-1", "scene-1", {
    practiceSet,
    replaceExisting: false,
  });
  await service.saveScenePracticeSet("user-1", "scene-1", {
    practiceSet: {
      ...practiceSet,
      id: "practice-2",
    },
    replaceExisting: true,
  });

  assert.equal(rows.find((row) => row.id === "practice-1")?.status, "abandoned");
  assert.equal(rows.find((row) => row.id === "practice-2")?.status, "generated");
});

test("scene practice set service 会拒绝不属于当前场景的 set", async () => {
  const service = getService();

  await assert.rejects(
    () =>
      service.saveScenePracticeSet("user-1", "scene-1", {
        practiceSet: {
          ...practiceSet,
          sourceSceneId: "other-scene",
        },
        replaceExisting: false,
      }),
    /does not belong/,
  );
});

test("scene practice set service 会校验 practiceSetId 所有权", async () => {
  const service = getService();

  await service.saveScenePracticeSet("user-1", "scene-1", {
    practiceSet,
    replaceExisting: false,
  });

  await service.assertScenePracticeSetBelongsToScene({
    userId: "user-1",
    sceneId: "scene-1",
    practiceSetId: "practice-1",
  });
  await assert.rejects(
    () =>
      service.assertScenePracticeSetBelongsToScene({
        userId: "user-1",
        sceneId: "scene-1",
        practiceSetId: "missing",
      }),
    /does not belong/,
  );
});

