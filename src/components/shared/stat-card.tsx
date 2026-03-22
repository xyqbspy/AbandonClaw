import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLE_SURFACE } from "@/lib/ui/apple-style";
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
    <Card className={cn(APPLE_SURFACE, className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
