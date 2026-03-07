import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl shadow-black/5 md:grid-cols-2">
        <section className="hidden bg-muted/70 p-8 md:block">
          <h2 className="text-3xl font-semibold leading-tight">回到你的英语学习节奏。</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            在语境中阅读，收藏值得反复接触的短语，并通过每日复习稳步沉淀。
          </p>
        </section>
        <section className="p-6 sm:p-8">{children}</section>
      </div>
    </main>
  );
}
