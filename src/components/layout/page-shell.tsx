import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
