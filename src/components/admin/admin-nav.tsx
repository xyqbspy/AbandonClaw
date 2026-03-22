"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM } from "@/lib/ui/apple-style";

const adminNavItems = [
  { label: "总览", href: "/admin" },
  { label: "场景", href: "/admin/scenes" },
  { label: "表达库", href: "/admin/phrases" },
  { label: "导入场景", href: "/admin/imported" },
  { label: "变体", href: "/admin/variants" },
  { label: "AI 缓存", href: "/admin/cache" },
  { label: "TTS 缓存", href: "/admin/tts" },
];

export function AdminNav() {
  const pathname = usePathname();
  const appleNavClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {adminNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              `${appleNavClassName} px-3 py-1.5 text-xs transition-colors`,
              active
                ? "bg-[rgb(32,44,60)] text-white hover:bg-[rgb(25,36,50)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
