import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLE_META_TEXT } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon,
  valueClassName,
  className,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-xl bg-white py-5 shadow-sm ring-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={cn("text-3xl font-bold tracking-tight text-slate-800", valueClassName)}>{value}</p>
        {hint ? <p className={APPLE_META_TEXT}>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
