import Link from "next/link";
import { marketingNav } from "@/lib/constants/navigation";
import { Wordmark } from "@/components/branding/wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="app-container flex h-16 items-center justify-between gap-4">
        <Wordmark />
        <nav className="hidden items-center gap-5 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="cursor-pointer text-sm text-muted-foreground transition hover:text-foreground"
            >
              {item.title}
            </Link>
          ))}
          <Link
            href="/scenes"
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            开始学习
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/login"
            className="inline-flex h-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            登录
          </Link>
          <Link
            href="/scenes"
            className="inline-flex h-7 cursor-pointer items-center justify-center rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            开始学习
          </Link>
        </div>
      </div>
    </header>
  );
}
