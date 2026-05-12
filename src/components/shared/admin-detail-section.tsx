import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminDetailSection({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("rounded-xl bg-white py-5 shadow-sm ring-0", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-800">{title}</CardTitle>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function AdminDetailGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-2 text-sm text-slate-700 sm:grid-cols-2", className)}>{children}</div>;
}

export function AdminDetailItem({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <p className={className}>
      <span className="text-slate-400">{label}</span> {value}
    </p>
  );
}

export function AdminCodeBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "max-h-64 overflow-auto whitespace-pre-wrap rounded-[12px] bg-slate-50 p-3 text-xs text-slate-700",
        className,
      )}
    >
      {children}
    </pre>
  );
}
