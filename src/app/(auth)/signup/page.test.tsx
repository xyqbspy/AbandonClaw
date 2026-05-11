import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const routerPushCalls: string[] = [];
const toastMessages: string[] = [];

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      push: (href: string) => {
        routerPushCalls.push(href);
      },
      refresh: () => undefined,
    }),
    useSearchParams: () => new URLSearchParams(),
  },
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
  sonner: {
    toast: {
      error: (message: string) => {
        toastMessages.push(message);
      },
      success: (message: string) => {
        toastMessages.push(message);
      },
    },
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

let SignupPageModule: React.ComponentType | null = null;

function getSignupPage() {
  if (!SignupPageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: React.ComponentType;
    };
    SignupPageModule = imported.default;
  }
  return SignupPageModule;
}

afterEach(() => {
  cleanup();
  routerPushCalls.length = 0;
  toastMessages.length = 0;
});

test("/signup renders email code input and sends code", async () => {
  const fetchCalls: Array<{ url: string; body?: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({
      url: String(url),
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    if (String(url) === "/api/auth/signup") {
      return Response.json({ mode: "invite_only" });
    }
    if (String(url) === "/api/auth/signup/email-code") {
      return Response.json({ email: "user@example.com", expiresInSeconds: 600 });
    }
    return Response.json({});
  }) as typeof fetch;

  try {
    const SignupPage = getSignupPage();
    render(<SignupPage />);

    await waitFor(() => {
      assert.ok(screen.getByLabelText("邮箱验证码"));
    });

    await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => {
      assert.equal(fetchCalls.at(-1)?.url, "/api/auth/signup/email-code");
    });

    assert.match(fetchCalls.at(-1)?.body ?? "", /user@example.com/);
    assert.ok(toastMessages.includes("验证码已发送，请查看邮箱。"));
    assert.ok(screen.getByLabelText("邀请码"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
