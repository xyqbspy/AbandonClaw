import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  clearClientEventRecords,
  recordClientEvent,
  recordClientFailureSummary,
} from "@/lib/utils/client-events";
import { ClientEventsPanel } from "./client-events-panel";

afterEach(() => {
  cleanup();
  clearClientEventRecords();
});

test("ClientEventsPanel 会展示最近业务事件并支持筛选和清空", () => {
  recordClientEvent("today_continue_clicked", {
    sceneSlug: "coffee-chat",
  });
  recordClientFailureSummary("tts_scene_loop_failed", {
    sceneSlug: "coffee-chat",
  });

  render(<ClientEventsPanel />);

  screen.getByText("today_continue_clicked");
  screen.getByText("tts_scene_loop_failed");

  fireEvent.change(screen.getByDisplayValue("全部类型"), {
    target: { value: "failure" },
  });

  screen.getByText("tts_scene_loop_failed");
  assert.equal(screen.queryByText("today_continue_clicked"), null);

  fireEvent.click(screen.getByRole("button", { name: "清空记录" }));
  screen.getByText("当前没有可回看的业务记录。");
});
