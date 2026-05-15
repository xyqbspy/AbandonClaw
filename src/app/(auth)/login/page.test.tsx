import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const replaceCalls: string[] = [];
let refreshCalls = 0;
const toastMessages: string[] = [];
let signInCalls = 0;
let searchParams = new URLSearchParams();
let signInResult: { error: unknown | null } = { error: null };

const mockedModules = {
  "next/navigation": {
    useRouter: () => ({
      replace: (href: string) => {
        replaceCalls.push(href);
      },
      refresh: () => {
        refreshCalls += 1;
      },
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
  "@/lib/supabase/client": {
    createSupabaseBrowserClient: () => ({
      auth: {
        signInWithPassword: async () => {
          signInCalls += 1;
          return signInResult;
        },
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
  replaceCalls.length = 0;
  refreshCalls = 0;
  toastMessages.length = 0;
  signInCalls = 0;
  searchParams = new URLSearchParams();
  signInResult = { error: null };
  LoginPageModule = null;
  globalThis.FormData = OriginalFormData;
});

test("/login 将 invalid_credentials 映射为中文提示", async () => {
  installFormDataShim();
  signInResult = {
    error: { code: "invalid_credentials", message: "Invalid login credentials" },
  };

  const LoginPage = getLoginPage();
  render(<LoginPage />);

  await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
  await userEvent.type(screen.getByLabelText("密码"), "wrong-password");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  await waitFor(() => {
    assert.ok(toastMessages.includes("邮箱或密码不正确"));
  });
  assert.equal(replaceCalls.length, 0);
});

test("/login 默认跳转到 /today，并在成功后 replace + refresh", async () => {
  installFormDataShim();
  const LoginPage = getLoginPage();
  render(<LoginPage />);

  await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
  await userEvent.type(screen.getByLabelText("密码"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  await waitFor(() => {
    assert.deepEqual(replaceCalls, ["/today"]);
    assert.equal(refreshCalls, 1);
  });
});

test("/login 支持 redirectTo 参数，并拒绝外部跳转", async () => {
  installFormDataShim();
  searchParams = new URLSearchParams("redirectTo=%2Freview");
  let LoginPage = getLoginPage();
  render(<LoginPage />);

  await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
  await userEvent.type(screen.getByLabelText("密码"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  await waitFor(() => {
    assert.deepEqual(replaceCalls, ["/review"]);
  });

  cleanup();
  replaceCalls.length = 0;
  refreshCalls = 0;
  LoginPageModule = null;
  searchParams = new URLSearchParams("next=%2F%2Fevil.example");
  LoginPage = getLoginPage();
  render(<LoginPage />);

  await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
  await userEvent.type(screen.getByLabelText("密码"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  await waitFor(() => {
    assert.deepEqual(replaceCalls, ["/today"]);
  });
});

test("/login 提交中会禁用按钮，避免重复发请求", async () => {
  installFormDataShim();
  let resolveSignIn: (() => void) | null = null;
  signInResult = { error: null };
  mockedModules["@/lib/supabase/client"] = {
    createSupabaseBrowserClient: () => ({
      auth: {
        signInWithPassword: async () => {
          signInCalls += 1;
          await new Promise<void>((resolve) => {
            resolveSignIn = resolve;
          });
          return { error: null };
        },
      },
    }),
  };
  LoginPageModule = null;

  const LoginPage = getLoginPage();
  render(<LoginPage />);

  await userEvent.type(screen.getByLabelText("邮箱地址"), "user@example.com");
  await userEvent.type(screen.getByLabelText("密码"), "password123");
  const submitButton = screen.getByRole("button", { name: "登录" });
  await userEvent.click(submitButton);

  await waitFor(() => {
    assert.equal(screen.getByRole("button", { name: "登录中..." }).hasAttribute("disabled"), true);
    assert.equal(signInCalls, 1);
  });

  await userEvent.click(screen.getByRole("button", { name: "登录中..." }));
  assert.equal(signInCalls, 1);

  resolveSignIn?.();
  await waitFor(() => {
    assert.deepEqual(replaceCalls, ["/today"]);
  });

  mockedModules["@/lib/supabase/client"] = {
    createSupabaseBrowserClient: () => ({
      auth: {
        signInWithPassword: async () => {
          signInCalls += 1;
          return signInResult;
        },
      },
    }),
  };
});
