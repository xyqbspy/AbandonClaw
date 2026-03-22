import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FocusDetailActions } from "./focus-detail-actions";

afterEach(() => {
  cleanup();
});

test("FocusDetailActions 在菜单展开后会触发查找、手动添加、重生成、移入和独立主表达动作", () => {
  let findCount = 0;
  let manualAddCount = 0;
  let regenerateCount = 0;
  let enrichCount = 0;
  let moveCount = 0;
  let detachCount = 0;

  render(
    <FocusDetailActions
      open
      show
      canShowFindRelations
      canShowManualAddRelated
      canShowRegenerateAudio
      canShowRetryEnrichment
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster
      canSetStandaloneMain
      focusAssistLoading={false}
      openingManualAddRelated={false}
      regeneratingAudio={false}
      retryingEnrichment={false}
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      hasFocusDetailText
      appleButtonClassName="btn"
      labels={{
        moreActions: "更多操作",
        findRelations: "查找同类 / 对照表达",
        manualAddRelated: "添加关联表达",
        regenerateAudio: "重新生成音频",
        retryEnrichment: "补全当前chunk",
        openAsMain: "设为本簇主表达",
        moveIntoCluster: "移入当前表达簇",
        detachClusterMember: "设为独立主表达",
      }}
      onToggleOpen={() => undefined}
      onRequestFindRelations={() => {
        findCount += 1;
      }}
      onRequestManualAddRelated={() => {
        manualAddCount += 1;
      }}
      onRequestRegenerateAudio={() => {
        regenerateCount += 1;
      }}
      onRequestRetryEnrichment={() => {
        enrichCount += 1;
      }}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => {
        moveCount += 1;
      }}
      onRequestSetStandaloneMain={() => {
        detachCount += 1;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "查找同类 / 对照表达" }));
  fireEvent.click(screen.getByRole("button", { name: "添加关联表达" }));
  fireEvent.click(screen.getByRole("button", { name: "重新生成音频" }));
  fireEvent.click(screen.getByRole("button", { name: "补全当前chunk" }));
  fireEvent.click(screen.getByRole("button", { name: "移入当前表达簇" }));
  fireEvent.click(screen.getByRole("button", { name: "设为独立主表达" }));

  assert.equal(findCount, 1);
  assert.equal(manualAddCount, 1);
  assert.equal(regenerateCount, 1);
  assert.equal(enrichCount, 1);
  assert.equal(moveCount, 1);
  assert.equal(detachCount, 1);
});

test("FocusDetailActions 在 loading 时会禁用查找、手动添加、重生成和移入按钮", () => {
  render(
    <FocusDetailActions
      open
      show
      canShowFindRelations
      canShowManualAddRelated
      canShowRegenerateAudio
      canShowRetryEnrichment
      canSetCurrentClusterMain={false}
      canMoveIntoCurrentCluster
      canSetStandaloneMain={false}
      focusAssistLoading
      openingManualAddRelated
      regeneratingAudio
      retryingEnrichment
      movingIntoCluster
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      hasFocusDetailText
      appleButtonClassName="btn"
      labels={{
        moreActions: "更多操作",
        findRelations: "查找同类 / 对照表达",
        manualAddRelated: "添加关联表达",
        regenerateAudio: "重新生成音频",
        retryEnrichment: "补全当前chunk",
        openAsMain: "设为本簇主表达",
        moveIntoCluster: "移入当前表达簇",
        detachClusterMember: "设为独立主表达",
      }}
      onToggleOpen={() => undefined}
      onRequestFindRelations={() => undefined}
      onRequestManualAddRelated={() => undefined}
      onRequestRegenerateAudio={() => undefined}
      onRequestRetryEnrichment={() => undefined}
      onRequestSetCurrentClusterMain={() => undefined}
      onRequestMoveIntoCluster={() => undefined}
      onRequestSetStandaloneMain={() => undefined}
    />,
  );

  const findButton = screen.getByRole("button", { name: "查找同类 / 对照表达..." });
  const manualAddButton = screen.getByRole("button", { name: "添加关联表达..." });
  const regenerateButton = screen.getByRole("button", { name: "重新生成音频..." });
  const enrichButton = screen.getByRole("button", { name: "补全当前chunk..." });
  const moveButton = screen.getByRole("button", { name: "移入当前表达簇..." });

  assert.equal(findButton.hasAttribute("disabled"), true);
  assert.equal(manualAddButton.hasAttribute("disabled"), true);
  assert.equal(regenerateButton.hasAttribute("disabled"), true);
  assert.equal(enrichButton.hasAttribute("disabled"), true);
  assert.equal(moveButton.hasAttribute("disabled"), true);
});
