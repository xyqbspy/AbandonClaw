import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DetailSheetShell } from "./detail-sheet-shell";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

test("DetailSheetShell 会渲染 header body footer 并透传样式类", () => {
  render(
    <DetailSheetShell
      open
      ariaLabel="表达详情"
      onOpenChange={() => undefined}
      header={<div>头部标题</div>}
      footer={<div>底部动作</div>}
      headerClassName="header-test"
      bodyClassName="body-test"
      footerClassName="footer-test"
      panelClassName="panel-test"
      containerClassName="container-test"
    >
      <div>中间内容</div>
    </DetailSheetShell>,
  );

  const dialog = screen.getByRole("dialog", { name: "表达详情" });
  assert.ok(dialog.className.includes("panel-test"));
  assert.ok(dialog.parentElement?.className.includes("container-test"));
  assert.ok(screen.getByText("头部标题").closest("header")?.className.includes("header-test"));
  assert.ok(screen.getByText("中间内容").parentElement?.className.includes("body-test"));
  assert.ok(screen.getByText("底部动作").closest("footer")?.className.includes("footer-test"));
});

test("DetailSheetShell 会在打开时锁定滚动，并在关闭按钮点击时传出 false", () => {
  const states: boolean[] = [];

  render(
    <DetailSheetShell open ariaLabel="表达详情" onOpenChange={(open) => states.push(open)}>
      <div>内容</div>
    </DetailSheetShell>,
  );

  assert.equal(document.body.style.overflow, "hidden");

  fireEvent.click(screen.getAllByRole("button", { name: "关闭详情" })[1]);
  assert.deepEqual(states, [false]);
});

test("DetailSheetShell 默认点击遮罩会关闭，且可隐藏右上角关闭按钮", () => {
  const states: boolean[] = [];

  render(
    <DetailSheetShell
      open
      ariaLabel="表达详情"
      closeLabel="关闭面板"
      showCloseButton={false}
      onOpenChange={(open) => states.push(open)}
    >
      <div>内容</div>
    </DetailSheetShell>,
  );

  const closeButtons = screen.getAllByRole("button", { name: "关闭面板" });
  assert.equal(closeButtons.length, 1);

  fireEvent.click(closeButtons[0]);
  assert.deepEqual(states, [false]);
});

test("DetailSheetShell 可以禁用遮罩关闭", () => {
  const states: boolean[] = [];

  render(
    <DetailSheetShell
      open
      ariaLabel="表达详情"
      closeOnBackdropClick={false}
      showCloseButton={false}
      onOpenChange={(open) => states.push(open)}
    >
      <div>内容</div>
    </DetailSheetShell>,
  );

  const backdrop = screen.getByRole("dialog", { name: "表达详情" }).previousElementSibling as HTMLElement;
  fireEvent.click(backdrop);

  assert.deepEqual(states, []);
});

test("DetailSheetShell 在关闭状态下不渲染弹层，也不会锁定滚动", () => {
  document.body.style.overflow = "auto";

  render(
    <DetailSheetShell open={false} ariaLabel="表达详情" onOpenChange={() => undefined}>
      <div>内容</div>
    </DetailSheetShell>,
  );

  assert.equal(screen.queryByRole("dialog", { name: "表达详情" }), null);
  assert.equal(document.body.style.overflow, "auto");
});

test("DetailSheetShell 从打开变为关闭时会恢复原始滚动样式", () => {
  document.body.style.overflow = "scroll";

  const { rerender } = render(
    <DetailSheetShell open ariaLabel="表达详情" onOpenChange={() => undefined}>
      <div>内容</div>
    </DetailSheetShell>,
  );

  assert.equal(document.body.style.overflow, "hidden");

  rerender(
    <DetailSheetShell open={false} ariaLabel="表达详情" onOpenChange={() => undefined}>
      <div>内容</div>
    </DetailSheetShell>,
  );

  assert.equal(screen.queryByRole("dialog", { name: "表达详情" }), null);
  assert.equal(document.body.style.overflow, "scroll");
});

test("DetailSheetShell 在没有 header 且隐藏关闭按钮时不会渲染顶栏", () => {
  render(
    <DetailSheetShell open ariaLabel="表达详情" showCloseButton={false} onOpenChange={() => undefined}>
      <div>只有内容区</div>
    </DetailSheetShell>,
  );

  const dialog = screen.getByRole("dialog", { name: "表达详情" });
  assert.equal(dialog.querySelector("header"), null);
  assert.equal(screen.getByText("只有内容区").closest("section"), dialog);
});
