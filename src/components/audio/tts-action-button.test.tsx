import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { TtsActionButton } from "./tts-action-button";

afterEach(() => {
  cleanup();
});

test("TtsActionButton 会渲染默认与播放中状态", () => {
  const { rerender } = render(
    <TtsActionButton onClick={() => undefined} ariaLabel="朗读" />,
  );

  let button = screen.getByRole("button", { name: "朗读" });
  assert.equal(button.getAttribute("data-audio-state"), "idle");
  assert.match(button.className, /muted-foreground/);
  assert.equal(button.querySelector('[data-audio-icon-state="idle"]') !== null, true);

  rerender(
    <TtsActionButton active onClick={() => undefined} ariaLabel="停止朗读" />,
  );

  button = screen.getByRole("button", { name: "停止朗读" });
  assert.equal(button.getAttribute("data-audio-state"), "playing");
  assert.match(button.className, /text-primary/);
  assert.equal(button.querySelector('[data-audio-icon-state="playing"]') !== null, true);
});

test("TtsActionButton 会渲染暂停和加载状态", () => {
  const { rerender } = render(
    <TtsActionButton paused onClick={() => undefined} ariaLabel="继续朗读" />,
  );

  let button = screen.getByRole("button", { name: "继续朗读" });
  assert.equal(button.getAttribute("data-audio-state"), "paused");
  assert.equal(button.querySelector('[data-audio-icon-state="paused"]') !== null, true);

  rerender(
    <TtsActionButton loading onClick={() => undefined} ariaLabel="加载中" />,
  );

  button = screen.getByRole("button", { name: "加载中" });
  assert.equal(button.getAttribute("data-audio-state"), "loading");
  assert.equal(button.querySelector("svg")?.className.baseVal.includes("animate-spin"), true);
});

test("TtsActionButton 支持软表面按钮样式", () => {
  const { rerender } = render(
    <TtsActionButton surface="soft" onClick={() => undefined} ariaLabel="朗读" />,
  );

  let button = screen.getByRole("button", { name: "朗读" });
  assert.match(button.className, /bg-\[var\(--app-surface-subtle\)\]/);
  assert.match(button.className, /border-\[var\(--app-border-soft\)\]/);

  rerender(
    <TtsActionButton surface="soft" active onClick={() => undefined} ariaLabel="停止朗读" />,
  );

  button = screen.getByRole("button", { name: "停止朗读" });
  assert.match(button.className, /bg-primary\/12/);
  assert.match(button.className, /text-primary/);
});
