import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import {
  AnimatedLoadingText,
  formatLoadingText,
  LoadingButton,
  LoadingContent,
  LoadingOverlay,
  LoadingState,
} from "./action-loading";

afterEach(() => {
  cleanup();
});

test("LoadingButton 在 loading 时会显示统一加载文案并禁用按钮", () => {
  render(
    <LoadingButton loading loadingText="进入中...">
      进入场景
    </LoadingButton>,
  );

  const button = screen.getByRole("button", { name: "进入中..." });
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.equal(button.hasAttribute("disabled"), true);
  screen.getByText("进入中...");
});

test("LoadingButton 会把字符串 loadingText 自动转成动态省略号", async () => {
  const { container } = render(
    <LoadingButton loading loadingText="生成中...">
      提交
    </LoadingButton>,
  );

  const button = screen.getByRole("button", { name: "生成中..." });
  assert.equal(button.getAttribute("aria-busy"), "true");
  await screen.findByText((_content, element) =>
    element === container.querySelector("button span:last-child span") &&
    Boolean(element?.textContent?.includes("生成中.")),
  );
});

test("LoadingContent 在非 loading 时保留原始文案", () => {
  render(<LoadingContent loading={false}>保存</LoadingContent>);

  screen.getByText("保存");
  assert.equal(screen.queryByText("保存中..."), null);
});

test("LoadingOverlay 在 loading 时会渲染覆盖提示", () => {
  render(
    <div className="relative">
      <LoadingOverlay loading loadingText="进入场景中..." />
    </div>,
  );

  screen.getByText("进入场景中...");
});

test("LoadingState 会把字符串 text 自动转成动态省略号", async () => {
  const { container } = render(<LoadingState text="场景加载中..." />);

  await screen.findByText((_content, element) =>
    element === container.querySelector("div span:last-child span") &&
    Boolean(element?.textContent?.includes("场景加载中.")),
  );
  screen.getByText("场景加载中...");
});

test("LoadingState 会渲染统一的区块加载提示", () => {
  render(<LoadingState text="场景加载中..." />);

  screen.getByText("场景加载中...");
});

test("AnimatedLoadingText 会轮流展示省略号", async () => {
  const { container } = render(<AnimatedLoadingText text="正在生成中" intervalMs={20} />);

  await screen.findByText((_content, element) =>
    element === container.firstChild &&
    Boolean(element?.textContent?.includes("正在生成中.")),
  );
  await screen.findByText((_content, element) =>
    element === container.firstChild &&
    Boolean(element?.textContent?.includes("正在生成中..")),
  );
  await screen.findByText((_content, element) =>
    element === container.firstChild &&
    Boolean(element?.textContent?.includes("正在生成中...")),
  );
});

test("formatLoadingText 会避免重复追加省略号", () => {
  assert.equal(formatLoadingText("加入表达簇"), "加入表达簇...");
  assert.equal(formatLoadingText("加入表达簇..."), "加入表达簇...");
});

test("formatLoadingText 支持自定义后缀", () => {
  assert.equal(formatLoadingText("开始听整段", "中..."), "开始听整段中...");
  assert.equal(formatLoadingText("练习准备中...", "中..."), "练习准备中...");
});
