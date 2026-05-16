import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const savePhraseCalls: Array<Record<string, unknown>> = [];
const loadPhrasesCalls: unknown[][] = [];
const notifyActionSucceededCalls: string[] = [];
const notifyLoadFailedCalls: Array<string | null> = [];
let savePhraseShouldThrow = false;

const mockedModules = {
  "@/lib/utils/phrases-api": {
    savePhraseFromApi: async (payload: Record<string, unknown>) => {
      savePhraseCalls.push(payload);
      if (savePhraseShouldThrow) throw new Error("save-failed");
      return { userPhrase: { id: "new-id" } };
    },
  },
  "./chunks-page-notify": {
    notifyChunksActionSucceeded: (message: string) => {
      notifyActionSucceededCalls.push(message);
    },
    notifyChunksLoadFailed: (message: string | null) => {
      notifyLoadFailedCalls.push(message);
    },
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

const loadHook = () => {
  const modulePath = localRequire.resolve("./use-builtin-phrases-actions");
  delete localRequire.cache[modulePath];
  return localRequire("./use-builtin-phrases-actions") as typeof import("./use-builtin-phrases-actions");
};

afterEach(() => {
  cleanup();
  savePhraseCalls.length = 0;
  loadPhrasesCalls.length = 0;
  notifyActionSucceededCalls.length = 0;
  notifyLoadFailedCalls.length = 0;
  savePhraseShouldThrow = false;
});

const phrase = {
  id: "builtin-1",
  text: "burn out",
  translation: "耗尽",
  usageNote: null,
  level: "L1",
  category: "daily",
  tags: ["foo"],
  sourceScene: { slug: "office-life", title: "Office Life" },
};

type SetBuiltinUpdater = (
  current: Array<{ id: string; isSaved: boolean; text: string }>,
) => Array<{ id: string; isSaved: boolean; text: string }>;

const makeArgs = (capturedSetBuiltin: Array<SetBuiltinUpdater>) => ({
  setBuiltinPhrases: ((updater: SetBuiltinUpdater) => {
    capturedSetBuiltin.push(updater);
  }) as unknown as React.Dispatch<React.SetStateAction<unknown>>,
  loadPhrases: async (...args: unknown[]) => {
    loadPhrasesCalls.push(args);
  },
  query: "",
  reviewFilter: "all" as const,
  contentFilter: "expression" as const,
  expressionClusterFilterId: "",
});

test("save 成功路径：调 savePhraseFromApi、setBuiltinPhrases 标记 isSaved、notify 成功、reload phrases、清 savingPhraseId", async () => {
  const { useBuiltinPhrasesActions } = loadHook();
  const captured: Array<SetBuiltinUpdater> = [];
  const { result } = renderHook(() => useBuiltinPhrasesActions(makeArgs(captured) as never));

  await act(async () => {
    await result.current.save(phrase);
  });

  await waitFor(() => {
    assert.equal(savePhraseCalls.length, 1);
  });
  // 入参检查
  const call = savePhraseCalls[0];
  assert.equal(call.text, "burn out");
  assert.equal(call.translation, "耗尽");
  assert.equal(call.sourceSceneSlug, "office-life");
  assert.equal(call.sourceType, "scene");
  assert.deepEqual(
    (call.tags as string[]).sort(),
    ["builtin", "core_phrase", "daily", "foo"].sort(),
  );

  // setBuiltinPhrases updater 应当对匹配 id 标 isSaved
  assert.equal(captured.length, 1);
  const updater = captured[0];
  const next = updater([
    { id: "builtin-1", isSaved: false, text: "x" },
    { id: "other", isSaved: false, text: "y" },
  ]);
  assert.equal(next[0].isSaved, true);
  assert.equal(next[1].isSaved, false);

  assert.equal(notifyActionSucceededCalls.length, 1);
  assert.ok(loadPhrasesCalls.length >= 1);
  assert.equal(result.current.savingPhraseId, null);
});

test("save 失败路径：notify failed 并清 savingPhraseId", async () => {
  savePhraseShouldThrow = true;
  const { useBuiltinPhrasesActions } = loadHook();
  const { result } = renderHook(() => useBuiltinPhrasesActions(makeArgs([]) as never));

  await act(async () => {
    await result.current.save(phrase);
  });

  assert.equal(notifyLoadFailedCalls.length, 1);
  assert.equal(notifyLoadFailedCalls[0], "save-failed");
  assert.equal(notifyActionSucceededCalls.length, 0);
  assert.equal(result.current.savingPhraseId, null);
});

test("没有 sourceScene 时 sourceType 应回退到 manual", async () => {
  const { useBuiltinPhrasesActions } = loadHook();
  const { result } = renderHook(() => useBuiltinPhrasesActions(makeArgs([]) as never));

  await act(async () => {
    await result.current.save({ ...phrase, sourceScene: null });
  });

  await waitFor(() => {
    assert.equal(savePhraseCalls.length, 1);
  });
  assert.equal(savePhraseCalls[0].sourceType, "manual");
  assert.equal(savePhraseCalls[0].sourceSceneSlug, undefined);
});

test("save 期间 savingPhraseId 应当反映当前 phrase.id", async () => {
  let resolveFetch!: () => void;
  const blockedSavePromise = new Promise<void>((resolve) => {
    resolveFetch = resolve;
  });
  const realMock = mockedModules["@/lib/utils/phrases-api"].savePhraseFromApi;
  mockedModules["@/lib/utils/phrases-api"].savePhraseFromApi = (async (
    payload: Record<string, unknown>,
  ) => {
    savePhraseCalls.push(payload);
    await blockedSavePromise;
    return { userPhrase: { id: "x" } };
  }) as typeof realMock;

  const { useBuiltinPhrasesActions } = loadHook();
  const { result } = renderHook(() => useBuiltinPhrasesActions(makeArgs([]) as never));

  let savingPromise: Promise<void>;
  act(() => {
    savingPromise = result.current.save(phrase);
  });

  await waitFor(() => {
    assert.equal(result.current.savingPhraseId, "builtin-1");
  });

  await act(async () => {
    resolveFetch();
    await savingPromise!;
  });

  assert.equal(result.current.savingPhraseId, null);

  // 还原 mock
  mockedModules["@/lib/utils/phrases-api"].savePhraseFromApi = realMock;
});
