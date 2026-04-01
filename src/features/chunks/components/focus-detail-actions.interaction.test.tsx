import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { FocusDetailActions } from "./focus-detail-actions";

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  globalThis.window = dom.window as unknown as typeof globalThis & Window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
}

afterEach(() => {
  cleanup();
});

test("FocusDetailActions 在菜单展开后会触发查找、手动添加、重生成、移入、独立和删除动作", () => {
  let findCount = 0;
  let manualAddCount = 0;
  let regenerateCount = 0;
  let enrichCount = 0;
  let moveCount = 0;
  let detachCount = 0;
  let deleteCount = 0;

  const view = render(
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
      canDeleteCurrentExpression
      focusAssistLoading={false}
      openingManualAddRelated={false}
      regeneratingAudio={false}
      retryingEnrichment={false}
      movingIntoCluster={false}
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      deletingCurrentExpression={false}
      hasFocusDetailText
      appleButtonClassName="btn"
      labels={{
        moreActions: "更多操作",
        findRelations: "查找同类 / 对照表达",
        manualAddRelated: "添加关联表达",
        regenerateAudio: "重新生成音频",
        retryEnrichment: "补全当前chunk",
        deleteExpression: "删除当前表达",
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
      onRequestDeleteCurrentExpression={() => {
        deleteCount += 1;
      }}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "查找同类 / 对照表达" }));
  fireEvent.click(view.getByRole("button", { name: "添加关联表达" }));
  fireEvent.click(view.getByRole("button", { name: "重新生成音频" }));
  fireEvent.click(view.getByRole("button", { name: "补全当前chunk" }));
  fireEvent.click(view.getByRole("button", { name: "移入当前表达簇" }));
  fireEvent.click(view.getByRole("button", { name: "设为独立主表达" }));
  fireEvent.click(view.getByRole("button", { name: "删除当前表达" }));

  assert.equal(findCount, 1);
  assert.equal(manualAddCount, 1);
  assert.equal(regenerateCount, 1);
  assert.equal(enrichCount, 1);
  assert.equal(moveCount, 1);
  assert.equal(detachCount, 1);
  assert.equal(deleteCount, 1);
});

test("FocusDetailActions 在 loading 时会禁用查找、手动添加、重生成、移入和删除按钮", () => {
  const view = render(
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
      canDeleteCurrentExpression
      focusAssistLoading
      openingManualAddRelated
      regeneratingAudio
      retryingEnrichment
      movingIntoCluster
      ensuringMoveTargetCluster={false}
      detachingClusterMember={false}
      deletingCurrentExpression
      hasFocusDetailText
      appleButtonClassName="btn"
      labels={{
        moreActions: "更多操作",
        findRelations: "查找同类 / 对照表达",
        manualAddRelated: "添加关联表达",
        regenerateAudio: "重新生成音频",
        retryEnrichment: "补全当前chunk",
        deleteExpression: "删除当前表达",
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
      onRequestDeleteCurrentExpression={() => undefined}
    />,
  );

  assert.equal(
    view.getByRole("button", { name: "查找同类 / 对照表达..." }).hasAttribute("disabled"),
    true,
  );
  assert.equal(
    view.getByRole("button", { name: "添加关联表达..." }).hasAttribute("disabled"),
    true,
  );
  assert.equal(
    view.getByRole("button", { name: "重新生成音频..." }).hasAttribute("disabled"),
    true,
  );
  assert.equal(
    view.getByRole("button", { name: "补全当前chunk..." }).hasAttribute("disabled"),
    true,
  );
  assert.equal(
    view.getByRole("button", { name: "移入当前表达簇..." }).hasAttribute("disabled"),
    true,
  );
  assert.equal(
    view.getByRole("button", { name: "删除当前表达..." }).hasAttribute("disabled"),
    true,
  );
});
