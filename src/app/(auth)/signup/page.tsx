"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">注册</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {registrationMode === "closed"
            ? "当前暂未开放注册。"
            : registrationMode === "invite_only"
              ? "当前为邀请注册，请使用有效邀请码创建账号。"
              : "创建账号并开始场景化学习。"}
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="username">用户名</Label>
          <Input id="username" name="username" placeholder="你的昵称" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" name="email" type="email" placeholder="name@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input id="password" name="password" type="password" placeholder="设置密码" required />
        </div>
        {registrationMode === "invite_only" ? (
          <div className="space-y-2">
            <Label htmlFor="inviteCode">邀请码</Label>
            <Input id="inviteCode" name="inviteCode" placeholder="输入邀请码" required />
          </div>
        ) : null}
        <Button className="w-full" type="submit" disabled={submitting || registrationMode === "closed"}>
          {submitting ? "创建中..." : "创建账号"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        已有账号？{" "}
        <Link
          href={buildAuthRedirectHref("/login", redirectTo)}
          className="text-foreground underline underline-offset-4"
        >
          去登录
        </Link>
      </p>
    </div>
  );
}
