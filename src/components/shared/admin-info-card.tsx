import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";
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
    <Card className={cn("rounded-xl bg-white py-5 shadow-sm ring-0", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-800">{title}</CardTitle>
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
        <p key={index} className={item.muted ? APPLE_META_TEXT : "text-slate-700"}>
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
      ? "border border-green-100 bg-green-50 text-green-700"
      : tone === "info"
        ? "border border-blue-100 bg-blue-50 text-blue-700"
        : "border border-red-100 bg-red-50 text-red-700";

  return (
    <Card className={cn("rounded-xl py-0 shadow-none ring-0", toneClassName, className)}>
      <CardContent className="px-4 py-3 text-sm font-medium">{children}</CardContent>
    </Card>
  );
}
