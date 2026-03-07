import { Bell } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
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
          <Avatar className="size-8">
            <AvatarFallback>YL</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
