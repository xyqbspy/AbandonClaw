import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (message === "Unauthorized") {
      redirect("/login");
    }
    redirect("/");
  }

  return (
    <div className="space-y-5">
      <AdminNav />
      {children}
    </div>
  );
}
