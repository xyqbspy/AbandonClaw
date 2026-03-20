"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { clearIndexedDbCache } from "@/lib/cache/indexeddb";

export function AppTopbar() {
  const router = useRouter();
  const [clearingCache, setClearingCache] = useState(false);

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

  const handleClearLocalCache = async () => {
    const confirmed = window.confirm(
      "确认清空当前浏览器的本地缓存吗？这会删除 IndexedDB 里的场景和列表缓存，并刷新页面。",
    );
    if (!confirmed || clearingCache) return;

    setClearingCache(true);
    try {
      const cleared = await clearIndexedDbCache();
      if (!cleared) {
        throw new Error("本地缓存清除失败，请关闭其他页面后重试。");
      }
      toast.success("本地缓存已清除，正在刷新页面。");
      window.setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (error) {
      setClearingCache(false);
      toast.error(error instanceof Error ? error.message : "本地缓存清除失败。");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="app-container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileNav />
          <p className="text-sm font-medium text-muted-foreground">今日学习空间</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline">
            <Bell className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleClearLocalCache()}>
            {clearingCache ? "清理中..." : "清本地缓存"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleLogout()}>
            退出登录
          </Button>
          <Avatar className="size-8">
            <AvatarFallback>YL</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
