import Link from "next/link";
import { appCopy } from "@/lib/constants/copy";

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
        A
      </span>
      <span className="text-sm font-semibold tracking-tight">{appCopy.brand.name}</span>
    </Link>
  );
}
