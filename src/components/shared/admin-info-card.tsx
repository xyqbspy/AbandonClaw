import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLE_SURFACE } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export function AdminInfoCard({
  title,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn(APPLE_SURFACE, className)}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("text-sm", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminInfoList({
  items,
  className,
}: {
  items: Array<{
    label: ReactNode;
    value: ReactNode;
    muted?: boolean;
  }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {items.map((item, index) => (
        <p key={index} className={item.muted ? "text-muted-foreground" : undefined}>
          {item.label}
          {item.value}
        </p>
      ))}
    </div>
  );
}

export function AdminNoticeCard({
  children,
  tone = "danger",
  className,
}: {
  children: ReactNode;
  tone?: "success" | "info" | "danger";
  className?: string;
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-destructive/30 bg-destructive/5 text-destructive";

  return (
    <Card className={cn(toneClassName, className)}>
      <CardContent className="pt-4 text-sm">{children}</CardContent>
    </Card>
  );
}
