import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render } from "@testing-library/react";

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

let GuidanceModule: { AnonymousGuidanceState: (props: {
  page: "review" | "progress" | "chunks";
  registerHref?: string;
}) => React.ReactElement } | null = null;

function getComponent() {
  if (!GuidanceModule) {
    const modulePath = localRequire.resolve("./anonymous-guidance-state");
    delete localRequire.cache[modulePath];
    GuidanceModule = localRequire("./anonymous-guidance-state") as never;
  }
  return GuidanceModule!.AnonymousGuidanceState;
}

test("AnonymousGuidanceState review 页渲染三段式 + 立即注册按钮指向 /register", () => {
  const Component = getComponent();
  const result = render(<Component page="review" />);
  const container = result.getByTestId("anonymous-guidance-state");
  assert.equal(container.getAttribute("data-page"), "review");
  assert.match(result.container.textContent ?? "", /复习功能需要先登录/);
  assert.match(result.container.textContent ?? "", /为什么用不了/);
  assert.match(result.container.textContent ?? "", /注册后可解锁/);
  assert.match(result.container.textContent ?? "", /现在可以做什么/);
  const primary = result.getByTestId("anonymous-guidance-primary-action");
  assert.equal(primary.getAttribute("href"), "/register");
});

test("AnonymousGuidanceState progress 页文案聚焦学习时长 / 连续打卡", () => {
  const Component = getComponent();
  const result = render(<Component page="progress" />);
  const text = result.container.textContent ?? "";
  assert.match(text, /学习进度需要先登录/);
  assert.match(text, /学习时长/);
  assert.match(text, /连续打卡/);
});

test("AnonymousGuidanceState chunks 页文案聚焦表达库 / 保存按钮", () => {
  const Component = getComponent();
  const result = render(<Component page="chunks" />);
  const text = result.container.textContent ?? "";
  assert.match(text, /我的表达库需要先登录/);
  assert.match(text, /保存/);
});

test("AnonymousGuidanceState 支持自定义 registerHref(灰度可指向 /share/register)", () => {
  const Component = getComponent();
  const result = render(
    <Component page="review" registerHref="/share/register?from=review" />,
  );
  const primary = result.getByTestId("anonymous-guidance-primary-action");
  assert.equal(primary.getAttribute("href"), "/share/register?from=review");
});
