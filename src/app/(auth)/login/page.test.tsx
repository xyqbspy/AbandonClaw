import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const toastMessages: string[] = [];

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      push: () => undefined,
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
  "@/lib/supabase/client": {
    createSupabaseBrowserClient: () => ({
      auth: {
        signInWithPassword: async () => ({
          error: { code: "invalid_credentials", message: "Invalid login credentials" },
        }),
      },
    }),
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

let LoginPageModule: React.ComponentType | null = null;

function getLoginPage() {
  if (!LoginPageModule) {
    const modulePath = localRequire.resolve("./page");
    delete localRequire.cache[modulePath];
    const imported = localRequire("./page") as {
      default: React.ComponentType;
    };
    LoginPageModule = imported.default;
  }
  return LoginPageModule;
}

afterEach(() => {
  cleanup();
  toastMessages.length = 0;
});

test("/login 将 invalid_credentials 映射为安全中文提示", async () => {
  const OriginalFormData = globalThis.FormData;
  globalThis.FormData = class TestFormData extends OriginalFormData {
    constructor(form?: HTMLFormElement) {
      super();
      if (!form) return;
      for (const element of Array.from(form.elements)) {
        const input = element as HTMLInputElement;
        if (input.tagName === "INPUT" && input.name && input.type !== "submit" && input.type !== "button") {
          this.set(input.name, input.value);
        }
      }
    }
  } as typeof FormData;
  const LoginPage = getLoginPage();
  try {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));

    await waitFor(() => {
      assert.ok(
        toastMessages.includes(
          "邮箱或密码不正确；如果刚注册，请确认账号已创建并完成邮箱验证。",
        ),
      );
    });
  } finally {
    globalThis.FormData = OriginalFormData;
  }
});
