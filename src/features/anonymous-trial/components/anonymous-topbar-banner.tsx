"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isQuotaCritical,
  type AnonymousQuotaSnapshot,
} from "../use-anonymous-mode";

const CAPABILITY_LABEL: Record<string, string> = {
  explain_selection: "AI 表达解释",
  tts_play: "音频播放",
};

const formatQuotaLine = (snapshot: AnonymousQuotaSnapshot | null): string => {
  if (!snapshot) return "体验模式 · 注册解锁全部功能";
  const label = CAPABILITY_LABEL[snapshot.capability] ?? snapshot.capability;
  if (snapshot.sessionLimit === null || snapshot.sessionRemaining === null) {
    return `体验模式 · ${label} 配额加载中`;
  }
  return `体验模式 · ${label} 剩 ${snapshot.sessionRemaining}/${snapshot.sessionLimit} 次`;
};

export function AnonymousTopbarBanner({
  isAnonymous,
  primaryCapability = "explain_selection",
  quotaByCapability,
  registerHref = "/signup",
  onRegisterClick,
  className,
}: {
  isAnonymous: boolean;
  primaryCapability?: string;
  quotaByCapability: Record<string, AnonymousQuotaSnapshot>;
  registerHref?: string;
  onRegisterClick?: () => void;
  className?: string;
}) {
  if (!isAnonymous) return null;
  const snapshot = quotaByCapability[primaryCapability] ?? null;
  const critical = snapshot ? isQuotaCritical(snapshot) : false;
  return (
    <div
      data-testid="anonymous-topbar-banner"
      data-critical={critical || undefined}
      className={cn(
        "flex w-full flex-row items-center justify-between gap-3 border-b px-4 py-2 text-xs sm:text-sm",
        critical
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border/60 bg-muted/40 text-foreground/85",
        className,
      )}
    >
      <span data-testid="anonymous-topbar-quota-line">
        {critical ? "⚠️ " : null}
        {formatQuotaLine(snapshot)}
      </span>
      <Button asChild radius="sm" size="sm">
        <Link
          href={registerHref}
          data-testid="anonymous-topbar-register-action"
          onClick={onRegisterClick}
        >
          立即注册解锁
        </Link>
      </Button>
    </div>
  );
}
