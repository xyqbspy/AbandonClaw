import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppSidebar />
      <div className="min-h-screen lg:pl-[260px]">{children}</div>
    </div>
  );
}
