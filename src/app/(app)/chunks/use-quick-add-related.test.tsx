import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const savePhraseCalls: Array<Record<string, unknown>> = [];
const enrichCalls: Array<Record<string, unknown>> = [];
const loadPhrasesCalls: unknown[][] = [];
const invalidateCalls: string[][] = [];
const focusRelationTabCalls: string[] = [];
const focusDetailTabCalls: string[] = [];
const focusDetailActionsOpenCalls: boolean[] = [];
const notifyMissingCalls: number[] = [];
const notifyValidationCalls: string[] = [];
const notifyQuickAddSuccessCalls: string[] = [];
const notifyQuickAddFailedCalls: Array<string | null> = [];
const notifyCopySuccessCalls: number[] = [];
const notifyCopyFailedCalls: number[] = [];
let savePhraseShouldThrow = false;
const clipboardWrites: string[] = [];
let clipboardShouldThrow = false;

const mockedModules = {
  "@/lib/utils/phrases-api": {
    savePhraseFromApi: async (payload: Record<string, unknown>) => {
      savePhraseCalls.push(payload);
      if (savePhraseShouldThrow) throw new Error("save-failed");
      return {
        userPhrase: { id: "new-user-phrase-id" },
      };
    },
    enrichSimilarExpressionFromApi: async (payload: Record<string, unknown>) => {
      enrichCalls.push(payload);
      return { userPhraseId: "new-user-phrase-id", status: "done" };
    },
  },
  "./chunks-focus-detail-notify": {
    notifyChunksFocusDetailCopyTargetFailed: () => {
      notifyCopyFailedCalls.push(1);
    },
    notifyChunksFocusDetailCopyTargetSuccess: () => {
      notifyCopySuccessCalls.push(1);
    },
    notifyChunksFocusDetailMissingExpression: () => {
      notifyMissingCalls.push(1);
    },
    notifyChunksFocusDetailQuickAddFailed: (message: string | null) => {
      notifyQuickAddFailedCalls.push(message);
    },
    notifyChunksFocusDetailQuickAddSucceeded: (message: string) => {
      notifyQuickAddSuccessCalls.push(message);
    },
    notifyChunksFocusDetailQuickAddValidation: (message: string) => {
      notifyValidationCalls.push(message);
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
  const modulePath = localRequire.resolve("./use-quick-add-related");
  delete localRequire.cache[modulePath];
  return localRequire("./use-quick-add-related") as typeof import("./use-quick-add-related");
};

afterEach(() => {
  cleanup();
  savePhraseCalls.length = 0;
  enrichCalls.length = 0;
  loadPhrasesCalls.length = 0;
  invalidateCalls.length = 0;
  focusRelationTabCalls.length = 0;
  focusDetailTabCalls.length = 0;
  focusDetailActionsOpenCalls.length = 0;
  notifyMissingCalls.length = 0;
  notifyValidationCalls.length = 0;
  notifyQuickAddSuccessCalls.length = 0;
  notifyQuickAddFailedCalls.length = 0;
  notifyCopySuccessCalls.length = 0;
  notifyCopyFailedCalls.length = 0;
  clipboardWrites.length = 0;
  savePhraseShouldThrow = false;
  clipboardShouldThrow = false;
});

const focusExpression = {
  userPhraseId: "focus-1",
  text: "call it a day",
  normalizedText: "call it a day",
} as unknown as Parameters<
  ReturnType<typeof loadHook>["useQuickAddRelated"]
>[0]["focusExpression"];

const focusDetail = { savedItem: { expressionClusterId: null } } as unknown as Parameters<
  ReturnType<typeof loadHook>["useQuickAddRelated"]
>[0]["focusDetail"];

const focusDetailViewModel = {
  similarRows: [{ text: "wrap it up" }],
  contrastRows: [{ text: "burn out" }],
} as unknown as Parameters<
  ReturnType<typeof loadHook>["useQuickAddRelated"]
>[0]["focusDetailViewModel"];

const makeArgs = (overrides: Partial<Record<string, unknown>> = {}) => {
  const onOpenChange = (next: boolean) => {
    focusDetailActionsOpenCalls.push(next);
  };
  return {
    open: false,
    onOpenChange,
    focusExpression,
    focusDetail,
    focusDetailViewModel,
    phraseByNormalized: new Map(),
    loadPhrases: async (...args: unknown[]) => {
      loadPhrasesCalls.push(args);
    },
    invalidateSavedRelations: (ids: string[]) => {
      invalidateCalls.push(ids);
    },
    setFocusRelationTab: (tab: string) => {
      focusRelationTabCalls.push(tab);
    },
    setFocusDetailTab: (tab: string) => {
      focusDetailTabCalls.push(tab);
    },
    setFocusDetailActionsOpen: (next: boolean) => {
      focusDetailActionsOpenCalls.push(next);
    },
    query: "",
    reviewFilter: "all" as const,
    contentFilter: "expression" as const,
    expressionClusterFilterId: "",
    ...overrides,
  } as unknown as Parameters<
    ReturnType<typeof loadHook>["useQuickAddRelated"]
  >[0];
};

test("空白文本提交时触发 missingExpression notify，不调 savePhraseFromApi", async () => {
  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() => useQuickAddRelated(makeArgs()));

  await act(async () => {
    await result.current.save();
  });

  assert.equal(notifyMissingCalls.length, 1);
  assert.equal(savePhraseCalls.length, 0);
});

test("validationMessage 命中重复（与当前 focus 同名）时阻止提交并 notify validation", async () => {
  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() => useQuickAddRelated(makeArgs()));

  act(() => {
    result.current.setText("call it a day");
  });
  assert.ok(result.current.validationMessage);

  await act(async () => {
    await result.current.save();
  });

  assert.equal(notifyValidationCalls.length, 1);
  assert.equal(savePhraseCalls.length, 0);
});

test("save 成功路径触发 enrich、loadPhrases、invalidate、tab 切换、close、reset、notify 成功", async () => {
  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() =>
    useQuickAddRelated(
      makeArgs({
        // 给一个不重复的 text 让 validationMessage = null
        // 注意 setText 在 hook 内调用，下面会 act
      }),
    ),
  );

  act(() => {
    result.current.setText("call this finished");
    result.current.setRelationType("similar");
  });

  await act(async () => {
    await result.current.save();
  });

  await waitFor(() => {
    assert.equal(savePhraseCalls.length, 1);
  });
  assert.equal(enrichCalls.length, 1);
  assert.ok(loadPhrasesCalls.length >= 1);
  assert.deepEqual(invalidateCalls[0], ["focus-1", "new-user-phrase-id"]);
  assert.deepEqual(focusRelationTabCalls, ["similar"]);
  assert.deepEqual(focusDetailTabCalls, ["similar"]);
  // 至少包含一次 onOpenChange(false) 与 setFocusDetailActionsOpen(false)
  assert.ok(focusDetailActionsOpenCalls.includes(false));
  assert.equal(notifyQuickAddSuccessCalls.length, 1);
  assert.equal(result.current.text, ""); // reset 后清空
});

test("save 失败时 notify failed 并保留 saving=false", async () => {
  savePhraseShouldThrow = true;
  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() => useQuickAddRelated(makeArgs()));

  act(() => {
    result.current.setText("a fresh expression");
  });

  await act(async () => {
    await result.current.save();
  });

  assert.equal(notifyQuickAddFailedCalls.length, 1);
  assert.equal(result.current.saving, false);
  assert.equal(savePhraseCalls.length, 1);
});

test("copyTarget 成功写剪贴板 + notify success", async () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (text: string) => {
          if (clipboardShouldThrow) throw new Error("clipboard-failed");
          clipboardWrites.push(text);
        },
      },
    },
  });

  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() => useQuickAddRelated(makeArgs()));

  await act(async () => {
    await result.current.copyTarget();
  });

  assert.deepEqual(clipboardWrites, ["call it a day"]);
  assert.equal(notifyCopySuccessCalls.length, 1);
});

test("copyTarget 异常时 notify failed", async () => {
  clipboardShouldThrow = true;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error("clipboard-failed");
        },
      },
    },
  });

  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() => useQuickAddRelated(makeArgs()));

  await act(async () => {
    await result.current.copyTarget();
  });

  assert.equal(notifyCopyFailedCalls.length, 1);
});

test("handleOpenChange 关闭时 saving=false 会触发 reset", async () => {
  const { useQuickAddRelated } = loadHook();
  const { result } = renderHook(() => useQuickAddRelated(makeArgs()));

  act(() => {
    result.current.setText("draft");
    result.current.setRelationType("contrast");
  });

  act(() => {
    result.current.handleOpenChange(false);
  });

  assert.equal(result.current.text, "");
  assert.equal(result.current.relationType, "similar");
  // onOpenChange 回调被调用且传 false
  assert.ok(focusDetailActionsOpenCalls.includes(false));
});
