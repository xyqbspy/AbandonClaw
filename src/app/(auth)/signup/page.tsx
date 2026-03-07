"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    toast.success("注册完成，欢迎开始学习");
    setTimeout(() => {
      router.push("/today");
    }, 220);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">注册</h1>
        <p className="mt-2 text-sm text-muted-foreground">创建账号后即可开始第一节课程。</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">昵称</Label>
          <Input id="name" placeholder="请输入昵称" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" type="email" placeholder="name@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input id="password" type="password" placeholder="请设置密码" required />
        </div>
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "创建中..." : "注册并开始学习"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        已有账号？{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          去登录
        </Link>
      </p>
    </div>
  );
}
