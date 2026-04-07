import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { LoopActionButton } from "./loop-action-button";

afterEach(() => {
  cleanup();
});

test("LoopActionButton 会渲染播放家族的默认、播放中与暂停状态", () => {
  const { rerender } = render(
    <LoopActionButton onClick={() => undefined} ariaLabel="循环播放" icon="play" />,
  );

  let button = screen.getByRole("button", { name: "循环播放" });
  assert.equal(button.getAttribute("data-audio-state"), "idle");
  assert.equal(button.querySelector('[data-audio-icon-family="play"]') !== null, true);

  rerender(
    <LoopActionButton active onClick={() => undefined} ariaLabel="停止循环" icon="play" />,
  );

  button = screen.getByRole("button", { name: "停止循环" });
  assert.equal(button.getAttribute("data-audio-state"), "playing");
  assert.equal(button.querySelectorAll('[data-audio-wave]').length >= 6, true);

  rerender(
    <LoopActionButton paused onClick={() => undefined} ariaLabel="暂停循环" icon="play" />,
  );

  button = screen.getByRole("button", { name: "暂停循环" });
  assert.equal(button.getAttribute("data-audio-state"), "paused");
  assert.equal(button.querySelector('[data-audio-icon-state="paused"]') !== null, true);
});

test("LoopActionButton 会渲染 tts 家族的播放中状态", () => {
  render(
    <LoopActionButton active onClick={() => undefined} ariaLabel="停止循环播放" icon="tts" />,
  );

  const button = screen.getByRole("button", { name: "停止循环播放" });
  assert.equal(button.getAttribute("data-audio-state"), "playing");
  assert.match(button.className, /text-primary/);
  assert.equal(button.querySelector('[data-audio-icon-family="tts"][data-audio-icon-state="playing"]') !== null, true);
});
