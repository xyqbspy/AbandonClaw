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
  { label: "TTS 缓存", href: "/admin/tts" },
  { label: "可观测性", href: "/admin/observability" },
];

export function AdminNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    adminNavItems.findIndex(
      (item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)),
    ),
  );
  const itemWidth = 100 / adminNavItems.length;

  return (
    <nav
      aria-label="后台管理菜单"
      className="sticky top-16 z-20 overflow-x-auto"
    >
      <div
        className="relative grid w-full min-w-max items-center overflow-hidden rounded-[18px] bg-[#F7FAFC] p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] [@media(max-height:760px)]:rounded-[15px] [@media(max-height:760px)]:p-1"
        style={{ gridTemplateColumns: `repeat(${adminNavItems.length}, minmax(6.25rem, 1fr))` }}
      >
        <div
          aria-hidden="true"
          className="absolute bottom-1.5 top-1.5 rounded-[14px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] [@media(max-height:760px)]:bottom-1 [@media(max-height:760px)]:top-1 [@media(max-height:760px)]:rounded-[11px]"
          style={{
            left: `calc(${activeIndex * itemWidth}% + 6px)`,
            width: `calc(${itemWidth}% - 6px)`,
          }}
        />
        {adminNavItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-[1] inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-[14px] px-3 py-2.5 text-center text-[14px] font-bold whitespace-nowrap transition-colors",
                "[@media(max-height:760px)]:min-h-8 [@media(max-height:760px)]:rounded-[11px] [@media(max-height:760px)]:px-2 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[12px]",
                active
                  ? "text-[#1A365D]"
                  : "text-[#718096] hover:text-[#1A365D]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
