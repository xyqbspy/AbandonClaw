"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { label: "总览", href: "/admin" },
  { label: "场景", href: "/admin/scenes" },
  { label: "表达库", href: "/admin/phrases" },
  { label: "导入场景", href: "/admin/imported" },
  { label: "变体", href: "/admin/variants" },
  { label: "AI 缓存", href: "/admin/cache" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {adminNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
