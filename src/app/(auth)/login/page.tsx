"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    toast.success("登录成功，正在进入今日学习");
    setTimeout(() => {
      router.push("/today");
    }, 220);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">认证流程已预留 Supabase 接入结构，可继续无缝扩展。</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" type="email" placeholder="name@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input id="password" type="password" placeholder="********" required />
        </div>
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "登录中..." : "登录"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        还没有账号？{" "}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          立即注册
        </Link>
      </p>
    </div>
  );
}
