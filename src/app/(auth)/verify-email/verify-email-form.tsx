"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export function VerifyEmailForm() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      toast.error("请填写注册邮箱。");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "验证邮件发送失败。");
      }

      toast.success("验证邮件已发送，请检查邮箱。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "验证邮件发送失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="text-sm font-medium text-foreground" htmlFor="verify-email-address">
        注册邮箱
      </label>
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
        <Mail className="size-4 text-muted-foreground" />
        <input
          id="verify-email-address"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <button
        className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "发送中..." : "重新发送验证邮件"}
      </button>
    </form>
  );
}
