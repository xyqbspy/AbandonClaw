"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/lib/constants/navigation";
import { Wordmark } from "@/components/branding/wordmark";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card/60 p-4 lg:block">
      <div className="mb-8">
        <Wordmark />
      </div>
      <nav className="grid gap-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/scenes" && pathname.startsWith("/scene/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition active:scale-[0.99] ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
