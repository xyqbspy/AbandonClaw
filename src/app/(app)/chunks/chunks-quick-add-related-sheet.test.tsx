import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React, { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChunksQuickAddRelatedSheet } from "./chunks-quick-add-related-sheet";

afterEach(() => {
  cleanup();
});

const labels = {
  title: "添加关联表达",
  description: "直接补一条关联表达。",
  targetLabel: "当前主表达",
  copyTarget: "点击复制",
  textLabel: "关联表达",
  textPlaceholder: "get through the day",
  relationTypeLabel: "关联类型",
  similar: "同类",
  contrast: "对照",
  submit: "保存关联表达",
};

test("ChunksQuickAddRelatedSheet 会处理复制和提交动作", () => {
  let copyCount = 0;
  let submitCount = 0;

  render(
    <ChunksQuickAddRelatedSheet
      open
      saving={false}
      text="keep going"
      relationType="similar"
      targetText="burn yourself out"
      inputRef={createRef<HTMLInputElement>()}
      validationMessage={null}
      libraryHint={null}
      labels={labels}
      applePanelClassName=""
      appleButtonStrongClassName=""
      appleInputPanelClassName=""
      appleMetaTextClassName=""
      appleBannerDangerClassName=""
      appleBannerInfoClassName=""
      appleListItemClassName=""
      onOpenChange={() => undefined}
      onCopyTarget={() => {
        copyCount += 1;
      }}
      onTextChange={() => undefined}
      onRelationTypeChange={() => undefined}
      onSubmit={() => {
        submitCount += 1;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /当前主表达/ }));
  fireEvent.click(screen.getByRole("button", { name: labels.submit }));

  assert.equal(copyCount, 1);
  assert.equal(submitCount, 1);
});

test("ChunksQuickAddRelatedSheet 有校验错误时会展示提示并禁用提交", () => {
  render(
    <ChunksQuickAddRelatedSheet
      open
      saving={false}
      text="burn yourself out"
      relationType="similar"
      targetText="burn yourself out"
      inputRef={createRef<HTMLInputElement>()}
      validationMessage="不能重复添加当前主表达。"
      libraryHint={null}
      labels={labels}
      applePanelClassName=""
      appleButtonStrongClassName=""
      appleInputPanelClassName=""
      appleMetaTextClassName=""
      appleBannerDangerClassName=""
      appleBannerInfoClassName=""
      appleListItemClassName=""
      onOpenChange={() => undefined}
      onCopyTarget={() => undefined}
      onTextChange={() => undefined}
      onRelationTypeChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.ok(screen.getByText("不能重复添加当前主表达。"));
  assert.equal(screen.getByRole("button", { name: labels.submit }).hasAttribute("disabled"), true);
});
