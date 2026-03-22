import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { APPLE_SURFACE } from "@/lib/ui/apple-style";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={APPLE_SURFACE}>
      <CardContent className={cn("pt-4", className)}>{children}</CardContent>
    </Card>
  );
}

export function FilterBarForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <form className={cn("grid gap-2", className)}>{children}</form>;
}

export function FilterBarMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2 text-xs text-muted-foreground", className)}>
      {children}
    </div>
  );
}
