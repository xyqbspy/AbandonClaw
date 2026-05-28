"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AnonymousBlockTrigger =
  | "feature_disabled"
  | "explain_quota_exhausted"
  | "tts_quota_exhausted";

type ModalCopy = {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
};

const TRIGGER_COPY: Record<AnonymousBlockTrigger, ModalCopy> = {
  feature_disabled: {
    title: "这个功能要登录才能用",
    description:
      "保存表达、提交复习、生成场景这些动作会写入你的学习库,匿名访问无法持久化,所以暂时被禁用。",
    primaryLabel: "立即注册解锁",
    secondaryLabel: "稍后",
  },
  explain_quota_exhausted: {
    title: "AI 解释配额今天用完了",
    description:
      "体验模式下每天可以试用 3 次 AI 表达解释,你已经用完。注册后会按账号配额单独算,完全独立。",
    primaryLabel: "立即注册解锁",
    secondaryLabel: "稍后",
  },
  tts_quota_exhausted: {
    title: "音频播放配额今天用完了",
    description:
      "体验模式下每天可以播放 30 段预生成音频,你已经用完。注册后会按账号配额单独算,可以反复听。",
    primaryLabel: "立即注册解锁",
    secondaryLabel: "稍后",
  },
};

export function AnonymousBlockModal({
  isAnonymous,
  visible,
  trigger,
  onDismiss,
  registerHref = "/register",
  onRegisterClick,
  capabilityLabel,
  className,
}: {
  isAnonymous: boolean;
  visible: boolean;
  trigger: AnonymousBlockTrigger;
  onDismiss: () => void;
  registerHref?: string;
  onRegisterClick?: () => void;
  capabilityLabel?: string;
  className?: string;
}) {
  if (!isAnonymous || !visible) return null;
  const copy = TRIGGER_COPY[trigger];
  return (
    <div
      data-testid="anonymous-block-modal-backdrop"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        data-testid="anonymous-block-modal"
        data-trigger={trigger}
        className={cn(
          "max-w-md rounded-xl bg-card p-5 shadow-lg ring-1 ring-foreground/10",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
        {capabilityLabel ? (
          <p
            data-testid="anonymous-block-modal-capability"
            className="mt-1 text-xs text-foreground/60"
          >
            涉及功能: {capabilityLabel}
          </p>
        ) : null}
        <p className="mt-3 text-sm leading-6 text-foreground/80">{copy.description}</p>
        <div className="mt-5 flex flex-row items-center justify-end gap-2">
          <Button
            variant="ghost"
            radius="sm"
            size="sm"
            onClick={onDismiss}
            data-testid="anonymous-block-modal-dismiss"
          >
            {copy.secondaryLabel}
          </Button>
          <Button asChild radius="sm" size="sm">
            <Link
              href={registerHref}
              data-testid="anonymous-block-modal-register"
              onClick={onRegisterClick}
            >
              {copy.primaryLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
