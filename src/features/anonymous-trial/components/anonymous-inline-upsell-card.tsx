"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AnonymousInlineUpsellCard({
  isAnonymous,
  visible,
  onDismiss,
  expressionCount,
  registerHref = "/signup",
  onRegisterClick,
  className,
}: {
  isAnonymous: boolean;
  visible: boolean;
  onDismiss: () => void;
  expressionCount: number;
  registerHref?: string;
  onRegisterClick?: () => void;
  className?: string;
}) {
  if (!isAnonymous || !visible) return null;
  return (
    <Card
      data-testid="anonymous-inline-upsell-card"
      size="sm"
      className={cn("border border-primary/30 bg-primary/5", className)}
    >
      <CardContent className="flex flex-col gap-3 px-4 pb-4 text-sm leading-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">
            刚刚学的这个场景里有 {expressionCount} 个表达
          </p>
          <p className="text-foreground/70">
            注册后可以一键全部保存到自己的表达库,下次复习再用。
          </p>
        </div>
        <div className="flex flex-row items-center gap-2 sm:shrink-0">
          <Button asChild radius="sm" size="sm">
            <Link
              href={registerHref}
              data-testid="anonymous-inline-upsell-register"
              onClick={onRegisterClick}
            >
              注册保存
            </Link>
          </Button>
          <Button
            variant="ghost"
            radius="sm"
            size="sm"
            onClick={onDismiss}
            data-testid="anonymous-inline-upsell-dismiss"
          >
            稍后
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
