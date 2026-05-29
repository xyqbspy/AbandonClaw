import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render } from "@testing-library/react";
import type { AnonymousQuotaSnapshot } from "../use-anonymous-mode";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const mockedModules = {
  "next/link": {
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
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

afterEach(() => {
  cleanup();
});

let BannerModule: {
  AnonymousTopbarBanner: (props: {
    isAnonymous: boolean;
    primaryCapability?: string;
    quotaByCapability: Record<string, AnonymousQuotaSnapshot>;
    registerHref?: string;
  }) => React.ReactElement | null;
} | null = null;

function getComponent() {
  if (!BannerModule) {
    const modulePath = localRequire.resolve("./anonymous-topbar-banner");
    delete localRequire.cache[modulePath];
    BannerModule = localRequire("./anonymous-topbar-banner") as never;
  }
  return BannerModule!.AnonymousTopbarBanner;
}

const makeSnapshot = (
  overrides: Partial<AnonymousQuotaSnapshot> = {},
): AnonymousQuotaSnapshot => ({
  capability: "explain_selection",
  dailyLimit: 200,
  dailyRemaining: 180,
  sessionLimit: 3,
  sessionRemaining: 3,
  resetAt: null,
  ...overrides,
});

test("AnonymousTopbarBanner isAnonymous=false 时不渲染", () => {
  const Component = getComponent();
  const result = render(
    <Component isAnonymous={false} quotaByCapability={{}} />,
  );
  assert.equal(result.container.querySelector("[data-testid=\"anonymous-topbar-banner\"]"), null);
});

test("AnonymousTopbarBanner 渲染配额行 + 注册按钮", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      quotaByCapability={{
        explain_selection: makeSnapshot({ sessionRemaining: 2, sessionLimit: 3 }),
      }}
    />,
  );
  const quotaLine = result.getByTestId("anonymous-topbar-quota-line");
  assert.match(quotaLine.textContent ?? "", /AI 表达解释 剩 2\/3 次/);
  const action = result.getByTestId("anonymous-topbar-register-action");
  assert.equal(action.getAttribute("href"), "/signup");
});

test("AnonymousTopbarBanner sessionRemaining<=1 时标记 critical + ⚠️ 前缀", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      quotaByCapability={{
        explain_selection: makeSnapshot({ sessionRemaining: 1 }),
      }}
    />,
  );
  const banner = result.getByTestId("anonymous-topbar-banner");
  assert.equal(banner.getAttribute("data-critical"), "true");
  const quotaLine = result.getByTestId("anonymous-topbar-quota-line");
  assert.match(quotaLine.textContent ?? "", /⚠️/);
});

test("AnonymousTopbarBanner sessionRemaining=0 也算 critical", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      quotaByCapability={{
        explain_selection: makeSnapshot({ sessionRemaining: 0 }),
      }}
    />,
  );
  const banner = result.getByTestId("anonymous-topbar-banner");
  assert.equal(banner.getAttribute("data-critical"), "true");
});

test("AnonymousTopbarBanner 缺 snapshot 时回退到默认文案", () => {
  const Component = getComponent();
  const result = render(
    <Component isAnonymous={true} quotaByCapability={{}} />,
  );
  const quotaLine = result.getByTestId("anonymous-topbar-quota-line");
  assert.match(quotaLine.textContent ?? "", /体验模式 · 注册解锁全部功能/);
  const banner = result.getByTestId("anonymous-topbar-banner");
  assert.equal(banner.getAttribute("data-critical"), null);
});

test("AnonymousTopbarBanner 支持自定义 registerHref(灰度场景)", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      quotaByCapability={{}}
      registerHref="/signup?from=topbar"
    />,
  );
  const action = result.getByTestId("anonymous-topbar-register-action");
  assert.equal(action.getAttribute("href"), "/signup?from=topbar");
});

test("AnonymousTopbarBanner sessionLimit=null 时显示加载中文案", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      quotaByCapability={{
        tts_play: makeSnapshot({
          capability: "tts_play",
          sessionLimit: null,
          sessionRemaining: null,
        }),
      }}
      primaryCapability="tts_play"
    />,
  );
  const quotaLine = result.getByTestId("anonymous-topbar-quota-line");
  assert.match(quotaLine.textContent ?? "", /音频播放 配额加载中/);
});
