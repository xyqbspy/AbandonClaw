"use client";

import { Skeleton } from "@/components/ui/skeleton";

const SECTION_CARD_CLASS =
  "rounded-[var(--mobile-adapt-overlay-card-radius)] border border-border/50 bg-background/92 p-[var(--mobile-adapt-space-md)] shadow-sm";

export function SceneDetailSkeleton() {
  return (
    <div
      className="space-y-[var(--mobile-adapt-space-xl)] p-[var(--mobile-adapt-space-sheet)]"
      aria-label="场景加载骨架"
      aria-busy="true"
    >
      <section className={SECTION_CARD_CLASS}>
        <div className="flex items-start justify-between gap-[var(--mobile-adapt-space-md)]">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-8 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-5/6 rounded-full" />
          </div>
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>
      </section>

      <section className={SECTION_CARD_CLASS}>
        <div className="flex items-center justify-between gap-[var(--mobile-adapt-space-md)]">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
        <div className="mt-[var(--mobile-adapt-space-md)] grid grid-cols-4 gap-[var(--mobile-adapt-space-sm)]">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </section>

      <section className="space-y-[var(--mobile-adapt-space-md)]">
        <div className={SECTION_CARD_CLASS}>
          <Skeleton className="h-5 w-28 rounded-full" />
          <div className="mt-[var(--mobile-adapt-space-md)] space-y-3">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-11/12 rounded-full" />
            <Skeleton className="h-4 w-4/5 rounded-full" />
          </div>
          <div className="mt-[var(--mobile-adapt-space-md)] flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <div className={SECTION_CARD_CLASS}>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-10/12 rounded-full" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
