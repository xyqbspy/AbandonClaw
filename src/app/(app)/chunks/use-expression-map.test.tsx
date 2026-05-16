import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ExpressionMapResponse } from "@/lib/types/expression-map";
import type { UserPhraseItemResponse } from "@/lib/utils/phrases-api";
import { useExpressionMap } from "./use-expression-map";

afterEach(() => {
  cleanup();
});

test("useExpressionMap 初始状态为空", () => {
  const { result } = renderHook(() => useExpressionMap());

  assert.equal(result.current.state.open, false);
  assert.equal(result.current.state.loading, false);
  assert.equal(result.current.state.error, null);
  assert.equal(result.current.state.data, null);
  assert.equal(result.current.state.sourceExpression, null);
  assert.equal(result.current.state.openingForId, null);
});

test("useExpressionMap setters 正常更新 state", () => {
  const { result } = renderHook(() => useExpressionMap());

  const fakePhrase = { userPhraseId: "p1", text: "running on empty" } as unknown as UserPhraseItemResponse;
  const fakeData = { version: "v1" } as unknown as ExpressionMapResponse;

  act(() => {
    result.current.setters.setOpen(true);
    result.current.setters.setLoading(true);
    result.current.setters.setError("network error");
    result.current.setters.setData(fakeData);
    result.current.setters.setSourceExpression(fakePhrase);
    result.current.setters.setOpeningForId("p1");
  });

  assert.equal(result.current.state.open, true);
  assert.equal(result.current.state.loading, true);
  assert.equal(result.current.state.error, "network error");
  assert.equal(result.current.state.data, fakeData);
  assert.equal(result.current.state.sourceExpression, fakePhrase);
  assert.equal(result.current.state.openingForId, "p1");
});

test("useExpressionMap close 将 open 设回 false", () => {
  const { result } = renderHook(() => useExpressionMap());

  act(() => {
    result.current.setters.setOpen(true);
  });
  assert.equal(result.current.state.open, true);

  act(() => {
    result.current.close();
  });
  assert.equal(result.current.state.open, false);
});

test("useExpressionMap resetError 清空 error 但不影响其它 state", () => {
  const { result } = renderHook(() => useExpressionMap());

  act(() => {
    result.current.setters.setError("some error");
    result.current.setters.setOpen(true);
    result.current.setters.setLoading(true);
  });

  act(() => {
    result.current.resetError();
  });

  assert.equal(result.current.state.error, null);
  assert.equal(result.current.state.open, true);
  assert.equal(result.current.state.loading, true);
});
