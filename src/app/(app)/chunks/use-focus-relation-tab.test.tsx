import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useFocusRelationTab } from "./use-focus-relation-tab";

afterEach(() => {
  cleanup();
});

test("useFocusRelationTab 初始状态", () => {
  const { result } = renderHook(() => useFocusRelationTab());

  assert.equal(result.current.focusRelationTab, "similar");
  assert.equal(result.current.expandedFocusMainId, null);
  assert.equal(result.current.focusRelationActiveText, "");
  assert.equal(result.current.detailConfirmAction, null);
  assert.equal(result.current.focusDetailActionsOpen, false);
});

test("useFocusRelationTab tab 切换", () => {
  const { result } = renderHook(() => useFocusRelationTab());

  act(() => {
    result.current.setFocusRelationTab("contrast");
  });
  assert.equal(result.current.focusRelationTab, "contrast");

  act(() => {
    result.current.setFocusRelationTab("similar");
  });
  assert.equal(result.current.focusRelationTab, "similar");
});

test("useFocusRelationTab expandedFocusMainId 切换", () => {
  const { result } = renderHook(() => useFocusRelationTab());

  act(() => {
    result.current.setExpandedFocusMainId("phrase-1");
  });
  assert.equal(result.current.expandedFocusMainId, "phrase-1");

  act(() => {
    result.current.setExpandedFocusMainId((current) =>
      current === "phrase-1" ? null : "phrase-1",
    );
  });
  assert.equal(result.current.expandedFocusMainId, null);
});

test("useFocusRelationTab focusRelationActiveText 更新", () => {
  const { result } = renderHook(() => useFocusRelationTab());

  act(() => {
    result.current.setFocusRelationActiveText("running on empty");
  });
  assert.equal(result.current.focusRelationActiveText, "running on empty");
});

test("useFocusRelationTab detailConfirmAction 与 actionsOpen", () => {
  const { result } = renderHook(() => useFocusRelationTab());

  act(() => {
    result.current.setFocusDetailActionsOpen(true);
    result.current.setDetailConfirmAction("set-cluster-main");
  });
  assert.equal(result.current.focusDetailActionsOpen, true);
  assert.equal(result.current.detailConfirmAction, "set-cluster-main");

  act(() => {
    result.current.setFocusDetailActionsOpen(false);
    result.current.setDetailConfirmAction(null);
  });
  assert.equal(result.current.focusDetailActionsOpen, false);
  assert.equal(result.current.detailConfirmAction, null);
});

test("useFocusRelationTab detailConfirmAction 支持三种动作", () => {
  const { result } = renderHook(() => useFocusRelationTab());

  for (const action of ["set-cluster-main", "set-standalone-main", "delete-expression"] as const) {
    act(() => {
      result.current.setDetailConfirmAction(action);
    });
    assert.equal(result.current.detailConfirmAction, action);
  }
});
