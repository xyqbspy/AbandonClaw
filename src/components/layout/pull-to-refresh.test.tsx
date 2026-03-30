import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

let currentPathname = "/chunks/";

const mockedModules = {
  "next/navigation": {
    usePathname: () => currentPathname,
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let PullToRefreshModule: typeof import("./pull-to-refresh") | null = null;

function getPullToRefresh() {
  if (!PullToRefreshModule) {
    const modulePath = localRequire.resolve("./pull-to-refresh");
    delete localRequire.cache[modulePath];
    PullToRefreshModule = localRequire("./pull-to-refresh") as typeof import("./pull-to-refresh");
  }
  return PullToRefreshModule.PullToRefresh;
}

afterEach(() => {
  cleanup();
  currentPathname = "/chunks/";
  PullToRefreshModule = null;
});

test("PullToRefresh 会把尾斜杠路径标准化后再派发刷新事件", async () => {
  const PullToRefresh = getPullToRefresh();
  const receivedPaths: string[] = [];
  const handledStates: boolean[] = [];

  const originalScrollY = window.scrollY;
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: 0,
  });

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<{ pathname?: string; handled?: boolean }>;
    receivedPaths.push(customEvent.detail?.pathname ?? "");
    customEvent.detail.handled = true;
    handledStates.push(Boolean(customEvent.detail.handled));
  };

  window.addEventListener("app:pull-refresh", listener as EventListener);

  const { container } = render(
    <PullToRefresh>
      <div>content</div>
    </PullToRefresh>,
  );

  const root = container.firstElementChild;
  assert.ok(root);

  fireEvent.touchStart(root, {
    targetTouches: [{ clientY: 0 }],
    touches: [{ clientY: 0 }],
  });
  fireEvent.touchMove(root, {
    targetTouches: [{ clientY: 220 }],
    touches: [{ clientY: 220 }],
  });
  fireEvent.touchEnd(root);

  await waitFor(() => {
    assert.deepEqual(receivedPaths, ["/chunks"]);
    assert.deepEqual(handledStates, [true]);
  });

  window.removeEventListener("app:pull-refresh", listener as EventListener);
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: originalScrollY,
  });
});
