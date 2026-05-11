"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather } from "lucide-react";
import { mainNav } from "@/lib/constants/navigation";
import { appCopy } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";

const primaryNav = mainNav.filter((item) => item.href !== "/settings");
const footerNav = mainNav.filter((item) => item.href === "/settings");

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] shrink-0 flex-col bg-[#1e293b] text-white lg:flex">
      <div className="flex h-[92px] items-center gap-3 px-6 text-[20px] font-extrabold tracking-[0.01em]">
        <Feather className="size-6 text-[#3b82f6]" aria-hidden="true" />
        <span>{appCopy.brand.name.replace(" English", "")}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="主菜单">
        {primaryNav.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="border-t border-white/5 p-6">
        {footerNav.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
}: {
  item: (typeof mainNav)[number];
  pathname: string;
}) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    (item.href === "/scenes" && pathname.startsWith("/scene/"));

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-medium transition-colors active:scale-[0.99]",
        active
          ? "bg-[#3b82f6]/15 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute bottom-3 left-0 top-3 w-1 rounded-r bg-[#3b82f6]"
        />
      ) : null}
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span>{item.title}</span>
    </Link>
  );
}
