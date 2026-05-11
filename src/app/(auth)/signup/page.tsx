"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, ShieldCheck, Ticket, User } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, AuthField } from "@/app/(auth)/auth-card";
import {
  buildAuthRedirectHref,
  isSafeRedirectTarget,
} from "@/lib/shared/auth-redirect";

type RegistrationMode = "closed" | "invite_only" | "open";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const inviteCode = String(formData.get("inviteCode") ?? "").trim();

    if (!email || !password) {
      toast.error("邮箱和密码不能为空。");
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
          inviteCode,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "注册失败。");
      }

      toast.success("账号已创建，请先完成邮箱验证。");
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
            ? "当前为邀请注册，请使用有效邀请码创建账号。"
            : "创建账号并开始场景化学习。"
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
