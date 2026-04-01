"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  buildAuthRedirectHref,
  isSafeRedirectTarget,
} from "@/lib/shared/auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = searchParams.get("redirect");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      toast.error("邮箱和密码不能为空。");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw new Error(error.message);
      toast.success("账号已创建。如需验证，请检查邮箱。");
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
          创建账号并开始场景化学习。
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
        <Button className="w-full" type="submit" disabled={submitting}>
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
