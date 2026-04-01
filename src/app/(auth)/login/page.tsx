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
  resolveSafeRedirectTarget,
} from "@/lib/shared/auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
        throw new Error(error.message);
      }

      await fetch("/api/me", { method: "GET" });
      toast.success("登录成功。");
      router.push(loginTarget);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          登录后继续你的学习流程。
        </p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" name="email" type="email" placeholder="name@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input id="password" name="password" type="password" placeholder="********" required />
        </div>
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "登录中..." : "登录"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        还没有账号？{" "}
        <Link
          href={buildAuthRedirectHref("/signup", redirectTo)}
          className="text-foreground underline underline-offset-4"
        >
          去注册
        </Link>
      </p>
    </div>
  );
}
