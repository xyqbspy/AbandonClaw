import Link from "next/link";
import { Wordmark } from "@/components/branding/wordmark";
import { marketingNav } from "@/lib/constants/navigation";
import {
  APPLE_BUTTON_BASE,
  APPLE_BUTTON_STRONG,
  APPLE_BUTTON_TEXT_MD,
  APPLE_META_TEXT,
} from "@/lib/ui/apple-style";

const primaryButtonClassName = `${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_MD} inline-flex h-8 items-center justify-center px-4`;
const secondaryButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_MD} inline-flex h-7 items-center justify-center px-2.5`;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-border-soft)] bg-background/90 backdrop-blur">
      <div className="app-container flex h-16 items-center justify-between gap-4">
        <Wordmark />
        <nav className="hidden items-center gap-5 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`cursor-pointer text-sm transition hover:text-foreground ${APPLE_META_TEXT}`}
            >
              {item.title}
            </Link>
          ))}
          <Link href="/scenes" className={primaryButtonClassName}>
            开始学习
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/login" className={secondaryButtonClassName}>
            登录
          </Link>
          <Link href="/scenes" className={`${APPLE_BUTTON_STRONG} ${APPLE_BUTTON_TEXT_MD} inline-flex h-7 items-center justify-center px-2.5`}>
            开始学习
          </Link>
        </div>
      </div>
    </header>
  );
}
