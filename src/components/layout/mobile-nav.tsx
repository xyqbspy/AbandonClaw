"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather, Menu } from "lucide-react";
import { mainNav } from "@/lib/constants/navigation";
import { appCopy } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#334155] transition-colors hover:bg-[#f1f5f9] lg:hidden"
            aria-label="打开导航"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[85%] max-w-sm gap-0 rounded-r-[18px] border-0 bg-[#1e293b] p-0 text-white shadow-[0_24px_60px_rgba(15,23,42,0.35)]"
      >
        <div className="flex h-[92px] items-center gap-3 px-6 text-[20px] font-extrabold">
          <Feather className="size-6 text-[#3b82f6]" aria-hidden="true" />
          <span>{appCopy.brand.name.replace(" English", "")}</span>
        </div>
        <nav className="grid gap-1 px-3 pb-6" aria-label="移动端主菜单">
          {mainNav.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/scenes" && pathname.startsWith("/scene/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-4 text-[15px] font-medium transition-colors active:scale-[0.99]",
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
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
