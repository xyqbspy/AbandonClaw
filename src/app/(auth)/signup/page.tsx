"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, Mail, ShieldCheck, Ticket, User } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, AuthField } from "@/app/(auth)/auth-card";
import {
  buildAuthRedirectHref,
  isSafeRedirectTarget,
} from "@/lib/shared/auth-redirect";

type RegistrationMode = "closed" | "invite_only" | "open";

const CODE_COOLDOWN_SECONDS = 60;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("closed");
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/signup", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ mode?: RegistrationMode }>)
      .then((body) => {
        if (!cancelled && body.mode) {
          setRegistrationMode(body.mode);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegistrationMode("closed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendEmailCode = async () => {
    if (sendingCode || cooldown > 0) return;

    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value.trim() ?? "";
    if (!email) {
      toast.error("请先填写邮箱地址。");
      emailInput?.focus();
      return;
    }

    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/signup/email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "验证码发送失败。");
      }

      setCooldown(CODE_COOLDOWN_SECONDS);
      toast.success("验证码已发送，请查看邮箱。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "验证码发送失败。");
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const emailCode = String(formData.get("emailCode") ?? "").trim();
    const inviteCode = String(formData.get("inviteCode") ?? "").trim();

    if (!email || !password) {
      toast.error("邮箱和密码不能为空。");
      return;
    }
    if (!emailCode) {
      toast.error("请填写邮箱验证码。");
      return;
    }
    if (registrationMode === "invite_only" && !inviteCode) {
      toast.error("当前为邀请注册，请填写邀请码。");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          emailCode,
          inviteCode,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "注册失败。");
      }

      toast.success("账号已创建，请登录继续。");
      router.push(
        isSafeRedirectTarget(redirectTo)
          ? `/login?redirect=${encodeURIComponent(redirectTo)}`
          : "/login",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="创建账号"
      description={
        registrationMode === "closed"
          ? "当前暂未开放注册。"
          : registrationMode === "invite_only"
            ? "当前为邀请注册，请使用邮箱验证码和有效邀请码创建账号。"
            : "使用邮箱验证码创建账号并开始场景化学习。"
      }
      footer={
        <>
          已有账号？{" "}
          <Link
            href={buildAuthRedirectHref("/login", redirectTo)}
            className="font-semibold text-[#007AFF] no-underline"
          >
            去登录
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <AuthField
          id="username"
          name="username"
          label="用户名"
          placeholder="你的昵称"
          icon={<User className="size-4" />}
        />
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
          <label htmlFor="emailCode" className="mb-2 block text-[13px] font-semibold text-[#1d1d1f]">
            邮箱验证码
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex min-w-0 flex-1 items-center">
              <span className="absolute left-4 text-[#86868b]">
                <KeyRound className="size-4" />
              </span>
              <input
                id="emailCode"
                name="emailCode"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="6 位验证码"
                required
                className="w-full rounded-xl border-[1.5px] border-[#e5e5e7] bg-white px-4 py-3.5 pl-12 text-[15px] text-[#1d1d1f] transition duration-200 placeholder:text-[#86868b] focus:border-[#007AFF] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/10"
              />
            </div>
            <button
              type="button"
              onClick={sendEmailCode}
              disabled={sendingCode || cooldown > 0 || registrationMode === "closed"}
              className="min-h-12 shrink-0 rounded-xl border border-[#007AFF] px-4 text-sm font-semibold text-[#007AFF] transition hover:bg-[#e5f1ff] disabled:cursor-not-allowed disabled:border-[#d2d2d7] disabled:text-[#86868b]"
            >
              {sendingCode ? "发送中..." : cooldown > 0 ? `${cooldown}s 后重发` : "发送验证码"}
            </button>
          </div>
        </div>
        <AuthField
          id="password"
          name="password"
          type="password"
          label="密码"
          placeholder="设置密码"
          required
          icon={<ShieldCheck className="size-4" />}
        />
        {registrationMode === "invite_only" ? (
          <AuthField
            id="inviteCode"
            name="inviteCode"
            label="邀请码"
            placeholder="输入邀请码"
            required
            icon={<Ticket className="size-4" />}
          />
        ) : null}
        <button
          className="mt-2.5 w-full cursor-pointer rounded-xl border-0 bg-[#007AFF] p-4 text-base font-semibold text-white transition duration-300 hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting || registrationMode === "closed"}
        >
          {submitting ? "创建中..." : "创建账号"}
        </button>
      </form>
    </AuthCard>
  );
}
