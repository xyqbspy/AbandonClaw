import Link from "next/link";
import { Feather } from "lucide-react";
import { appCopy } from "@/lib/constants/copy";

const loginLinkClassName =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#007aff] px-5 text-sm font-semibold text-white transition hover:bg-[#005fc8]";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 overflow-x-auto bg-white/80 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex h-16 w-max min-w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-extrabold text-[#1d1d1f]"
        >
          <Feather className="size-5 shrink-0 text-[#007aff]" />
          <span className="whitespace-nowrap">{appCopy.brand.name}</span>
        </Link>
        <Link href="/login" className={loginLinkClassName}>
          登录
        </Link>
      </div>
    </header>
  );
}
