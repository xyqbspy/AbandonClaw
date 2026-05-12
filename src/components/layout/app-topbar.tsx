"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/layout/mobile-nav";

type AppTopbarProps = {
  userDisplay: {
    displayName: string;
    email: string;
    initials: string;
  };
};

export function AppTopbar({ userDisplay }: AppTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const topbarTitle = pathname.startsWith("/admin") ? <AdminTopbarBreadcrumb pathname={pathname} /> : "今日学习空间";

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "退出登录失败。");
      }
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出登录失败。");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-xl">
      <div className="flex h-[70px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <MobileNav />
          <div
            className="hidden size-10 items-center justify-center rounded-full text-[#334155] lg:flex"
            aria-hidden="true"
          >
            <Menu className="size-5" />
          </div>
          <h1 className="truncate text-[17px] font-semibold tracking-normal text-[#334155] sm:text-[18px]">
            {topbarTitle}
          </h1>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative hidden size-10 shrink-0 items-center justify-center rounded-full border border-[#e2e8f0] text-[#334155] transition-colors hover:bg-[#f1f5f9] sm:inline-flex"
            aria-label="通知"
          >
            <Bell className="size-5" aria-hidden="true" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-white bg-[#ef4444]" />
          </button>

          <div className="flex min-w-0 items-center gap-2 rounded-full bg-[#f1f5f9] px-2 py-1.5 transition-colors hover:bg-[#e2e8f0] sm:gap-3 sm:px-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-[12px] font-semibold text-white">
              {userDisplay.initials.slice(0, 2)}
            </div>
            <div className="hidden min-w-0 flex-col leading-none sm:flex">
              <span className="max-w-[9rem] truncate text-[14px] font-semibold text-[#334155]">
                {userDisplay.displayName}
              </span>
              {userDisplay.email ? (
                <span className="mt-1 max-w-[11rem] truncate text-[11px] font-medium text-[#94a3b8]">
                  {userDisplay.email}
                </span>
              ) : null}
            </div>
            <ChevronDown className="hidden size-3 shrink-0 text-[#94a3b8] sm:block" aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-[14px] font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2] sm:px-3"
            aria-label="退出登录"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const adminBreadcrumbLabels = [
  { href: "/admin/users", label: "用户" },
  { href: "/admin/invites", label: "邀请码" },
  { href: "/admin/scenes", label: "场景" },
  { href: "/admin/phrases", label: "表达库" },
  { href: "/admin/imported", label: "导入场景" },
  { href: "/admin/variants", label: "变体" },
  { href: "/admin/cache", label: "AI 缓存" },
  { href: "/admin/tts", label: "TTS 缓存" },
  { href: "/admin/observability", label: "可观测性" },
];

function AdminTopbarBreadcrumb({ pathname }: { pathname: string }) {
  const current =
    adminBreadcrumbLabels.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ??
    "总览";

  return (
    <>
      管理后台 <span className="text-[#94a3b8]">/</span>{" "}
      <span className="text-blue-600">{current}</span>
    </>
  );
}
