import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { useSentenceExpressionSave } from "./use-sentence-expression-save";

afterEach(() => {
  cleanup();
});

const buildItem = (overrides: Partial<UserPhraseItemResponse> = {}): UserPhraseItemResponse =>
  ({
    userPhraseId: "p1",
    text: "running on empty",
    translation: "精疲力竭",
    ...overrides,
  }) as UserPhraseItemResponse;

test("useSentenceExpressionSave 初始状态为空", () => {
  const { result } = renderHook(() =>
    useSentenceExpressionSave({
      savePhrase: async () => undefined as never,
      notifySaved: () => {},
      notifyFailed: () => {},
    }),
  );

  assert.equal(result.current.savingSentenceExpressionKey, null);
  assert.deepEqual(result.current.savedSentenceExpressionKeys, {});
});

test("useSentenceExpressionSave 成功路径标记 saved 并触发 notifySaved", async () => {
  const savedCalls: number[] = [];
  const savePhraseArgs: Array<Record<string, unknown>> = [];
  const { result } = renderHook(() =>
    useSentenceExpressionSave({
      savePhrase: async (payload) => {
        savePhraseArgs.push(payload as Record<string, unknown>);
        return undefined as never;
      },
      notifySaved: () => {
        savedCalls.push(1);
      },
      notifyFailed: () => {},
    }),
  );

  await act(async () => {
    await result.current.saveExpressionFromSentence(
      buildItem(),
      "running on empty",
    );
  });

  await waitFor(() => {
    assert.equal(result.current.savingSentenceExpressionKey, null);
  });
  assert.equal(savedCalls.length, 1);
  assert.equal(savePhraseArgs.length, 1);
  assert.equal(savePhraseArgs[0].text, "running on empty");
  assert.equal(savePhraseArgs[0].learningItemType, "expression");
  assert.equal(savePhraseArgs[0].sourceType, "manual");
  assert.equal(savePhraseArgs[0].sourceSentenceText, "running on empty");
  assert.equal(savePhraseArgs[0].translation, "精疲力竭");
  assert.equal(result.current.savedSentenceExpressionKeys["p1:running on empty"], true);
});

test("useSentenceExpressionSave 失败路径触发 notifyFailed 并清理 saving 标记", async () => {
  const failedMessages: Array<string | null> = [];
  const { result } = renderHook(() =>
    useSentenceExpressionSave({
      savePhrase: async () => {
        throw new Error("network error");
      },
      notifySaved: () => {},
      notifyFailed: (message) => {
        failedMessages.push(message);
      },
    }),
  );

  await act(async () => {
    await result.current.saveExpressionFromSentence(buildItem(), "running on empty");
  });

  assert.equal(result.current.savingSentenceExpressionKey, null);
  assert.deepEqual(failedMessages, ["network error"]);
  assert.deepEqual(result.current.savedSentenceExpressionKeys, {});
});

test("useSentenceExpressionSave 同一 key 进行中再次调用直接 noop", async () => {
  let resolveSave: () => void = () => {};
  const savePromise = new Promise<void>((resolve) => {
    resolveSave = resolve;
  });
  const saveCalls: number[] = [];
  const { result } = renderHook(() =>
    useSentenceExpressionSave({
      savePhrase: async () => {
        saveCalls.push(1);
        await savePromise;
        return undefined as never;
      },
      notifySaved: () => {},
      notifyFailed: () => {},
    }),
  );

  void act(() => {
    void result.current.saveExpressionFromSentence(buildItem(), "running on empty");
  });
  await waitFor(() => {
    assert.equal(result.current.savingSentenceExpressionKey, "p1:running on empty");
  });

  await act(async () => {
    await result.current.saveExpressionFromSentence(buildItem(), "running on empty");
  });

  assert.equal(saveCalls.length, 1);
  resolveSave();
  await waitFor(() => {
    assert.equal(result.current.savingSentenceExpressionKey, null);
  });
});

test("useSentenceExpressionSave 空表达直接跳过", async () => {
  const saveCalls: number[] = [];
  const { result } = renderHook(() =>
    useSentenceExpressionSave({
      savePhrase: async () => {
        saveCalls.push(1);
        return undefined as never;
      },
      notifySaved: () => {},
      notifyFailed: () => {},
    }),
  );

  await act(async () => {
    await result.current.saveExpressionFromSentence(buildItem(), "   ");
  });

  assert.equal(saveCalls.length, 0);
  assert.equal(result.current.savingSentenceExpressionKey, null);
});
