import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const regenerateCalls: Array<Array<{ chunkText: string; chunkKey: string }>> = [];
const notifyNoSourceCalls: number[] = [];
const notifySuccessCalls: number[] = [];
const notifyFailedCalls: Array<string | null> = [];
const focusDetailActionsOpenCalls: boolean[] = [];
let regenerateShouldThrow = false;

const mockedModules = {
  "@/lib/utils/tts-api": {
    regenerateChunkAudioBatch: async (items: Array<{ chunkText: string; chunkKey: string }>) => {
      regenerateCalls.push(items);
      if (regenerateShouldThrow) throw new Error("regen-failed");
    },
  },
  "@/lib/shared/tts": {
    buildChunkAudioKey: (text: string) => `key:${text}`,
  },
  "./chunks-focus-detail-notify": {
    notifyChunksFocusDetailNoSourceSentence: () => {
      notifyNoSourceCalls.push(1);
    },
    notifyChunksFocusDetailRegenerateAudioSuccess: () => {
      notifySuccessCalls.push(1);
    },
    notifyChunksFocusDetailRegenerateAudioFailed: (message: string | null) => {
      notifyFailedCalls.push(message);
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
  const modulePath = localRequire.resolve("./use-detail-audio-actions");
  delete localRequire.cache[modulePath];
  return localRequire("./use-detail-audio-actions") as typeof import("./use-detail-audio-actions");
};

afterEach(() => {
  cleanup();
  regenerateCalls.length = 0;
  notifyNoSourceCalls.length = 0;
  notifySuccessCalls.length = 0;
  notifyFailedCalls.length = 0;
  focusDetailActionsOpenCalls.length = 0;
  regenerateShouldThrow = false;
});

const makeArgs = (overrides: Partial<Record<string, unknown>> = {}) => ({
  focusDetail: {
    savedItem: { exampleSentences: [{ en: "I called it a day." }, { en: "Time to wrap up." }] },
  },
  focusDetailViewModel: {
    detailSpeakText: "call it a day",
    activeAssistItem: null,
  },
  setFocusDetailActionsOpen: (next: boolean) => {
    focusDetailActionsOpenCalls.push(next);
  },
  ...overrides,
}) as unknown as Parameters<
  ReturnType<typeof loadHook>["useDetailAudioActions"]
>[0];

test("无 focusDetail 时 regenerate 直接 return，不调 regenerateChunkAudioBatch", async () => {
  const { useDetailAudioActions } = loadHook();
  const { result } = renderHook(() =>
    useDetailAudioActions(makeArgs({ focusDetail: null })),
  );

  await act(async () => {
    await result.current.regenerate();
  });

  assert.equal(regenerateCalls.length, 0);
});

test("候选 texts 全为空时 notify no source 并不发起 regenerate", async () => {
  const { useDetailAudioActions } = loadHook();
  const { result } = renderHook(() =>
    useDetailAudioActions(
      makeArgs({
        focusDetail: { savedItem: { exampleSentences: [] } },
        focusDetailViewModel: { detailSpeakText: "", activeAssistItem: null },
      }),
    ),
  );

  await act(async () => {
    await result.current.regenerate();
  });

  assert.equal(notifyNoSourceCalls.length, 1);
  assert.equal(regenerateCalls.length, 0);
});

test("regenerate 成功路径：去重传入 batch + 关闭 actions + notify success + 清 regenerating", async () => {
  const { useDetailAudioActions } = loadHook();
  const { result } = renderHook(() =>
    useDetailAudioActions(
      makeArgs({
        focusDetail: {
          savedItem: {
            exampleSentences: [
              { en: "call it a day" }, // 与 detailSpeakText 同
              { en: "Time to wrap up." },
            ],
          },
        },
        focusDetailViewModel: {
          detailSpeakText: "call it a day",
          activeAssistItem: null,
        },
      }),
    ),
  );

  await act(async () => {
    await result.current.regenerate();
  });

  await waitFor(() => {
    assert.equal(regenerateCalls.length, 1);
  });
  // 去重后只有 2 个 unique items
  assert.equal(regenerateCalls[0].length, 2);
  const texts = regenerateCalls[0].map((item) => item.chunkText);
  assert.deepEqual(texts.sort(), ["Time to wrap up.", "call it a day"]);
  assert.equal(regenerateCalls[0][0].chunkKey.startsWith("key:"), true);

  assert.deepEqual(focusDetailActionsOpenCalls, [false]);
  assert.equal(notifySuccessCalls.length, 1);
  assert.equal(result.current.regenerating, false);
});

test("savedItem 没 exampleSentences 时回退到 activeAssistItem.examples", async () => {
  const { useDetailAudioActions } = loadHook();
  const { result } = renderHook(() =>
    useDetailAudioActions(
      makeArgs({
        focusDetail: { savedItem: { exampleSentences: null } },
        focusDetailViewModel: {
          detailSpeakText: "burn out",
          activeAssistItem: { examples: [{ en: "Don't burn out." }] },
        },
      }),
    ),
  );

  await act(async () => {
    await result.current.regenerate();
  });

  await waitFor(() => {
    assert.equal(regenerateCalls.length, 1);
  });
  const texts = regenerateCalls[0].map((item) => item.chunkText).sort();
  assert.deepEqual(texts, ["Don't burn out.", "burn out"]);
});

test("regenerate 失败时 notify failed 且保留 regenerating=false", async () => {
  regenerateShouldThrow = true;
  const { useDetailAudioActions } = loadHook();
  const { result } = renderHook(() => useDetailAudioActions(makeArgs()));

  await act(async () => {
    await result.current.regenerate();
  });

  assert.equal(notifyFailedCalls.length, 1);
  assert.equal(notifyFailedCalls[0], "regen-failed");
  assert.equal(notifySuccessCalls.length, 0);
  assert.equal(result.current.regenerating, false);
});
