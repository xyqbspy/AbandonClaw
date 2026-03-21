import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React, { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelectionToolbar } from "./selection-toolbar";

afterEach(() => {
  cleanup();
});

test("SelectionToolbar 会透传位置和可见态样式", () => {
  const toolbarRef = createRef<HTMLDivElement>();

  render(
    <SelectionToolbar
      visible={false}
      top={48}
      left={96}
      toolbarRef={toolbarRef}
      onExplain={() => undefined}
      onSave={() => undefined}
      onReview={() => undefined}
      onPronounce={() => undefined}
    />,
  );

  const toolbar = screen.getByRole("toolbar", { name: "选中文本操作" });
  assert.equal(toolbar.style.top, "48px");
  assert.equal(toolbar.style.left, "96px");
  assert.match(toolbar.className, /pointer-events-none/);
  assert.equal(toolbarRef.current, toolbar);
});

test("SelectionToolbar 会处理释义、收藏、复习和朗读动作", () => {
  const calls = {
    explain: 0,
    save: 0,
    review: 0,
    pronounce: 0,
  };

  render(
    <SelectionToolbar
      visible
      top={0}
      left={0}
      toolbarRef={createRef<HTMLDivElement>()}
      onExplain={() => {
        calls.explain += 1;
      }}
      onSave={() => {
        calls.save += 1;
      }}
      onReview={() => {
        calls.review += 1;
      }}
      onPronounce={() => {
        calls.pronounce += 1;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "释义" }));
  fireEvent.click(screen.getByRole("button", { name: "收藏" }));
  fireEvent.click(screen.getByRole("button", { name: "复习" }));
  fireEvent.click(screen.getByRole("button", { name: "朗读" }));

  assert.deepEqual(calls, {
    explain: 1,
    save: 1,
    review: 1,
    pronounce: 1,
  });
});
