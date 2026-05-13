"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, AuthField } from "@/app/(auth)/auth-card";
import {
  buildAuthRedirectHref,
  resolveSafeRedirectTarget,
} from "@/lib/shared/auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const resolveLoginErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (code === "invalid_credentials") {
      return "邮箱或密码不正确；如果刚注册，请确认账号已创建并完成邮箱验证。";
    }
    if (code === "email_not_confirmed") {
      return "邮箱尚未验证，请先完成邮箱验证后再登录。";
    }
  }

  const message = error instanceof Error ? error.message : "";
  if (message === "Invalid login credentials") {
    return "邮箱或密码不正确；如果刚注册，请确认账号已创建并完成邮箱验证。";
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return "邮箱尚未验证，请先完成邮箱验证后再登录。";
  }

  return message || "登录失败。";
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = searchParams.get("redirect");
  const loginTarget = resolveSafeRedirectTarget(redirectTo);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) {
      toast.error("邮箱和密码不能为空。");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }

      await fetch("/api/me", { method: "GET" });
      toast.success("登录成功。");
      router.push(loginTarget);
      router.refresh();
    } catch (error) {
      toast.error(resolveLoginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="欢迎回来"
      description="请登录您的账号以继续"
      footer={
        <>
          还没有账号？{" "}
          <Link
            href={buildAuthRedirectHref("/signup", redirectTo)}
            className="font-semibold text-[#007AFF] no-underline"
          >
            立即注册
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <AuthField
          id="email"
          name="email"
          type="email"
          label="邮箱地址"
          placeholder="name@example.com"
          required
          icon={<Mail className="size-4" />}
        />
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-[13px] font-semibold text-[#1d1d1f]">
              密码
            </label>
            <a href="#" className="text-xs text-[#007AFF] no-underline">
              忘记密码？
            </a>
          </div>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-[#86868b]">
              <ShieldCheck className="size-4" />
            </span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="输入您的密码"
              required
              className="w-full rounded-xl border-[1.5px] border-[#e5e5e7] bg-white px-4 py-3.5 pl-12 text-[15px] text-[#1d1d1f] transition duration-200 placeholder:text-[#86868b] focus:border-[#007AFF] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/10"
            />
          </div>
        </div>
        <button
          className="mt-2.5 w-full cursor-pointer rounded-xl border-0 bg-[#007AFF] p-4 text-base font-semibold text-white transition duration-300 hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "登录中..." : "登 录"}
        </button>
      </form>
    </AuthCard>
  );
}
