import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const routerReplaceCalls: string[] = [];
const toastMessages: string[] = [];
let searchParams = new URLSearchParams();

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      replace: (href: string) => {
        routerReplaceCalls.push(href);
      },
      refresh: () => undefined,
    }),
    useSearchParams: () => searchParams,
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
const OriginalFormData = globalThis.FormData;

const installFormDataShim = () => {
  globalThis.FormData = class TestFormData extends OriginalFormData {
    constructor(form?: HTMLFormElement) {
      super();
      if (!form) return;
      for (const element of Array.from(form.elements)) {
        const input = element as HTMLInputElement;
        if (
          input.tagName === "INPUT" &&
          input.name &&
          input.type !== "submit" &&
          input.type !== "button"
        ) {
          this.set(input.name, input.value);
        }
      }
    }
  } as typeof FormData;
};

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
  routerReplaceCalls.length = 0;
  toastMessages.length = 0;
  searchParams = new URLSearchParams();
  SignupPageModule = null;
  globalThis.FormData = OriginalFormData;
});

test("/signup 会发送验证码并显示 invite_only 输入框", async () => {
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
    assert.ok(toastMessages.includes("验证码已发送，请查收邮箱"));
    assert.ok(screen.getByLabelText("邀请码"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("/signup 会把无效邀请码映射为中文提示", async () => {
  installFormDataShim();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url) === "/api/auth/signup" && init?.method !== "POST") {
      return Response.json({ mode: "invite_only" });
    }
    if (String(url) === "/api/auth/signup/email-code") {
      return Response.json({ email: "user@example.com", expiresInSeconds: 600 });
    }
    return new Response(
      JSON.stringify({ error: "Invite code is invalid or expired.", requestId: "req-1" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const SignupPage = getSignupPage();
    render(<SignupPage />);

    await waitFor(() => {
      assert.ok(screen.getByLabelText("邀请码"));
    });

    await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "password123");
    await userEvent.type(screen.getByLabelText("邮箱验证码"), "123456");
    await userEvent.type(screen.getByLabelText("邀请码"), "bad-code");
    await userEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      assert.ok(toastMessages.includes("邀请码无效或已过期"));
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("/signup 会把验证码发送限流映射为中文提示", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    if (String(url) === "/api/auth/signup") {
      return Response.json({ mode: "open" });
    }
    return new Response(
      JSON.stringify({ error: "Too many requests.", requestId: "req-2" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const SignupPage = getSignupPage();
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => {
      assert.ok(toastMessages.includes("操作太频繁，请稍后再试"));
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("/signup 注册成功后会回到登录页并保留合法 redirect", async () => {
  installFormDataShim();
  searchParams = new URLSearchParams("redirectTo=%2Freview");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url) === "/api/auth/signup" && init?.method !== "POST") {
      return Response.json({ mode: "open" }, { status: 200 });
    }
    return Response.json({});
  }) as typeof fetch;

  try {
    const SignupPage = getSignupPage();
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "password123");
    await userEvent.type(screen.getByLabelText("邮箱验证码"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      assert.deepEqual(routerReplaceCalls, ["/login?redirect=%2Freview"]);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
