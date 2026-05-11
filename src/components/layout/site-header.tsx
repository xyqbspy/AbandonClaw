import Link from "next/link";
import { Feather } from "lucide-react";
import { marketingNav } from "@/lib/constants/navigation";
import { appCopy } from "@/lib/constants/copy";

const navLinkClassName =
  "text-sm font-medium text-[#1d1d1f] transition hover:text-[#007aff]";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-extrabold text-[#1d1d1f]">
          <Feather className="size-5 text-[#007aff]" />
          <span>{appCopy.brand.name}</span>
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClassName}
            >
              {item.title}
            </Link>
          ))}
          <Link
            href="/scenes"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#007aff] px-5 text-sm font-semibold text-white transition hover:bg-[#005fc8]"
          >
            开始学习
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/login" className="inline-flex h-8 items-center justify-center px-2 text-sm font-semibold text-[#1d1d1f]">
            登录
          </Link>
          <Link
            href="/scenes"
            className="inline-flex h-8 items-center justify-center rounded-full bg-[#007aff] px-4 text-sm font-semibold text-white"
          >
            开始学习
          </Link>
        </div>
      </div>
    </header>
  );
}
