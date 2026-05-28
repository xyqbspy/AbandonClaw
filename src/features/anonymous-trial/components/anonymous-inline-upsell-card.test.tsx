import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";

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

let CardModule: {
  AnonymousInlineUpsellCard: (props: {
    isAnonymous: boolean;
    visible: boolean;
    onDismiss: () => void;
    expressionCount: number;
    registerHref?: string;
  }) => React.ReactElement | null;
} | null = null;

function getComponent() {
  if (!CardModule) {
    const modulePath = localRequire.resolve("./anonymous-inline-upsell-card");
    delete localRequire.cache[modulePath];
    CardModule = localRequire("./anonymous-inline-upsell-card") as never;
  }
  return CardModule!.AnonymousInlineUpsellCard;
}

test("AnonymousInlineUpsellCard isAnonymous=false 时不渲染", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={false}
      visible={true}
      onDismiss={() => {}}
      expressionCount={5}
    />,
  );
  assert.equal(
    result.container.querySelector("[data-testid=\"anonymous-inline-upsell-card\"]"),
    null,
  );
});

test("AnonymousInlineUpsellCard visible=false 时不渲染(模拟 L2 已 dismiss)", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={false}
      onDismiss={() => {}}
      expressionCount={5}
    />,
  );
  assert.equal(
    result.container.querySelector("[data-testid=\"anonymous-inline-upsell-card\"]"),
    null,
  );
});

test("AnonymousInlineUpsellCard 渲染表达数量 + 注册按钮指向 /register", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      onDismiss={() => {}}
      expressionCount={7}
    />,
  );
  assert.match(result.container.textContent ?? "", /刚刚学的这个场景里有 7 个表达/);
  const register = result.getByTestId("anonymous-inline-upsell-register");
  assert.equal(register.getAttribute("href"), "/register");
});

test("AnonymousInlineUpsellCard 稍后按钮触发 onDismiss", () => {
  const Component = getComponent();
  let dismissed = 0;
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      onDismiss={() => {
        dismissed += 1;
      }}
      expressionCount={3}
    />,
  );
  const dismiss = result.getByTestId("anonymous-inline-upsell-dismiss");
  fireEvent.click(dismiss);
  assert.equal(dismissed, 1);
});

test("AnonymousInlineUpsellCard 支持自定义 registerHref(灰度场景)", () => {
  const Component = getComponent();
  const result = render(
    <Component
      isAnonymous={true}
      visible={true}
      onDismiss={() => {}}
      expressionCount={2}
      registerHref="/share/register?from=scene"
    />,
  );
  const register = result.getByTestId("anonymous-inline-upsell-register");
  assert.equal(register.getAttribute("href"), "/share/register?from=scene");
});
