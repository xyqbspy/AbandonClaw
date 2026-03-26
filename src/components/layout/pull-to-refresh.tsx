"use client";

import { ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 72;

const shouldEnablePullRefresh = (pathname: string) => {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const exact = new Set([
    "/scenes",
    "/chunks",
    "/review",
    "/admin/scenes",
    "/admin/phrases",
    "/admin/imported",
    "/admin/variants",
    "/admin/cache",
    "/admin/tts",
  ]);
  if (exact.has(normalized)) return true;
  return false;
};

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input,textarea,select,button,a,[role='button'],[data-no-pull-refresh='true']",
    ),
  );
};

export function PullToRefresh({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const enabled = useMemo(() => shouldEnablePullRefresh(pathname), [pathname]);
  const [startY, setStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!enabled || refreshing || isInteractiveTarget(event.target)) return;
    if (window.scrollY > 0) return;
    setStartY(event.touches[0]?.clientY ?? null);
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!enabled || refreshing || startY === null) return;
    const currentY = event.touches[0]?.clientY ?? startY;
    const delta = currentY - startY;
    if (delta <= 0 || window.scrollY > 0) {
      setPullDistance(0);
      return;
    }
    const eased = Math.min(110, delta * 0.55);
    setPullDistance(eased);
    if (eased > 1) event.preventDefault();
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (!enabled || refreshing) return;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD;
    setStartY(null);
    setPullDistance(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    window.setTimeout(() => {
      const refreshDetail = {
        pathname,
        handled: false,
      };
      window.dispatchEvent(
        new CustomEvent("app:pull-refresh", {
          detail: refreshDetail,
        }),
      );
      if (!refreshDetail.handled) {
        window.location.reload();
        return;
      }
      window.setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }, 120);
  };

  const indicatorText = refreshing
    ? "刷新中..."
    : pullDistance >= PULL_THRESHOLD
      ? "松开刷新"
      : "下拉刷新";

  return (
    <div
      className="relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {enabled ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-14 z-20 flex h-6 items-center justify-center text-[11px] text-muted-foreground transition-opacity duration-150",
            pullDistance > 2 || refreshing ? "opacity-100" : "opacity-0",
          )}
        >
          {indicatorText}
        </div>
      ) : null}
      {children}
    </div>
  );
}
