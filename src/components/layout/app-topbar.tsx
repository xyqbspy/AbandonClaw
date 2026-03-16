"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
  const router = useRouter();

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
