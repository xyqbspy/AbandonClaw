import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { AnonymousBlockTrigger } from "./anonymous-block-modal";

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

let ModalModule: {
  AnonymousBlockModal: (props: {
    isAnonymous: boolean;
    visible: boolean;
    trigger: AnonymousBlockTrigger;
    onDismiss: () => void;
    registerHref?: string;
    capabilityLabel?: string;
  }) => React.ReactElement | null;
} | null = null;

function getComponent() {
  if (!ModalModule) {
    const modulePath = localRequire.resolve("./anonymous-block-modal");
    delete localRequire.cache[modulePath];
    ModalModule = localRequire("./anonymous-block-modal") as never;
  }
  return ModalModule!.AnonymousBlockModal;
}

test("AnonymousBlockModal isAnonymous=false 时不渲染", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={false}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {}}
    />,
  );
  assert.equal(
    result.container.querySelector("[data-testid=\"anonymous-block-modal\"]"),
    null,
  );
});

test("AnonymousBlockModal visible=false 时不渲染", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={false}
      trigger="feature_disabled"
      onDismiss={() => {}}
    />,
  );
  assert.equal(
    result.container.querySelector("[data-testid=\"anonymous-block-modal\"]"),
    null,
  );
});

test("AnonymousBlockModal feature_disabled 触发器使用对应文案", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {}}
    />,
  );
  const modal = result.getByTestId("anonymous-block-modal");
  assert.equal(modal.getAttribute("data-trigger"), "feature_disabled");
  assert.match(result.container.textContent ?? "", /这个功能要登录才能用/);
  assert.match(result.container.textContent ?? "", /持久化/);
});

test("AnonymousBlockModal explain_quota_exhausted 触发器使用对应文案", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="explain_quota_exhausted"
      onDismiss={() => {}}
    />,
  );
  const modal = result.getByTestId("anonymous-block-modal");
  assert.equal(modal.getAttribute("data-trigger"), "explain_quota_exhausted");
  assert.match(result.container.textContent ?? "", /AI 解释配额今天用完了/);
  assert.match(result.container.textContent ?? "", /3 次/);
});

test("AnonymousBlockModal tts_quota_exhausted 触发器使用对应文案", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="tts_quota_exhausted"
      onDismiss={() => {}}
    />,
  );
  const modal = result.getByTestId("anonymous-block-modal");
  assert.equal(modal.getAttribute("data-trigger"), "tts_quota_exhausted");
  assert.match(result.container.textContent ?? "", /音频播放配额今天用完了/);
  assert.match(result.container.textContent ?? "", /30 段/);
});

test("AnonymousBlockModal 渲染 capabilityLabel 当传入时", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {}}
      capabilityLabel="保存表达"
    />,
  );
  const label = result.getByTestId("anonymous-block-modal-capability");
  assert.match(label.textContent ?? "", /涉及功能: 保存表达/);
});

test("AnonymousBlockModal 未传 capabilityLabel 时不渲染该段", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {}}
    />,
  );
  assert.equal(
    result.container.querySelector(
      "[data-testid=\"anonymous-block-modal-capability\"]",
    ),
    null,
  );
});

test("AnonymousBlockModal 注册按钮指向 /register 默认地址", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {}}
    />,
  );
  const register = result.getByTestId("anonymous-block-modal-register");
  assert.equal(register.getAttribute("href"), "/register");
});

test("AnonymousBlockModal 支持自定义 registerHref(灰度场景)", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="explain_quota_exhausted"
      onDismiss={() => {}}
      registerHref="/share/register?from=quota_modal"
    />,
  );
  const register = result.getByTestId("anonymous-block-modal-register");
  assert.equal(register.getAttribute("href"), "/share/register?from=quota_modal");
});

test("AnonymousBlockModal 稍后按钮触发 onDismiss", () => {
  const Component = getComponent();
  let dismissed = 0;
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {
        dismissed += 1;
      }}
    />,
  );
  const dismiss = result.getByTestId("anonymous-block-modal-dismiss");
  fireEvent.click(dismiss);
  assert.equal(dismissed, 1);
});

test("AnonymousBlockModal 点击背景触发 onDismiss", () => {
  const Component = getComponent();
  let dismissed = 0;
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {
        dismissed += 1;
      }}
    />,
  );
  const backdrop = result.getByTestId("anonymous-block-modal-backdrop");
  fireEvent.click(backdrop);
  assert.equal(dismissed, 1);
});

test("AnonymousBlockModal 点击内部卡片不触发 onDismiss(stopPropagation)", () => {
  const Component = getComponent();
  let dismissed = 0;
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      trigger="feature_disabled"
      onDismiss={() => {
        dismissed += 1;
      }}
    />,
  );
  const modal = result.getByTestId("anonymous-block-modal");
  fireEvent.click(modal);
  assert.equal(dismissed, 0);
});
