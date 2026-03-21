import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FocusDetailActions } from "./focus-detail-actions";

afterEach(() => {
  cleanup();
});

test("FocusDetailActions 在菜单展开后会触发移入和独立主表达动作", () => {
  let moveCount = 0;
  let detachCount = 0;

  render(
    <FocusDetailActions
      open
      show
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster
      canSetStandaloneMain
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      hasFocusDetailText
      appleButtonClassName="btn"
      labels={{
        moreActions: "更多操作",
        openAsMain: "设为本簇主表达",
        moveIntoCluster: "移入当前表达簇",
        detachClusterMember: "设置为独立主表达",
      }}
      onToggleOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => {
        moveCount += 1;
      }}
      onRequestSetStandaloneMain={() => {
        detachCount += 1;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "移入当前表达簇" }));
  fireEvent.click(screen.getByRole("button", { name: "设置为独立主表达" }));

  assert.equal(moveCount, 1);
  assert.equal(detachCount, 1);
});

test("FocusDetailActions 在 loading 时会禁用移入按钮", () => {
  render(
    <FocusDetailActions
      open
      show
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster
      canSetStandaloneMain={false}
      movingIntoCluster
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      hasFocusDetailText
      appleButtonClassName="btn"
      labels={{
        moreActions: "更多操作",
        openAsMain: "设为本簇主表达",
        moveIntoCluster: "移入当前表达簇",
        detachClusterMember: "设置为独立主表达",
      }}
      onToggleOpen={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
    />,
  );

  const moveButton = screen.getByRole("button", { name: "移入当前表达簇..." });
  assert.equal(moveButton.hasAttribute("disabled"), true);
});
