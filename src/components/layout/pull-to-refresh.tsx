"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 72;

const normalizePathname = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

const shouldEnablePullRefresh = (pathname: string) => {
  const normalized = normalizePathname(pathname);
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const pathnameRef = useRef(pathname);
  const [startY, setStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    startYRef.current = startY;
  }, [startY]);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (!enabledRef.current || refreshingRef.current || isInteractiveTarget(event.target)) return;
      if (window.scrollY > 0) return;
      const nextStartY = event.touches[0]?.clientY ?? null;
      startYRef.current = nextStartY;
      setStartY(nextStartY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!enabledRef.current || refreshingRef.current || startYRef.current === null) return;
      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const delta = currentY - startYRef.current;
      if (delta <= 0 || window.scrollY > 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const eased = Math.min(110, delta * 0.55);
      pullDistanceRef.current = eased;
      setPullDistance(eased);
      if (eased > 1 && event.cancelable) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!enabledRef.current || refreshingRef.current) return;
      const shouldRefresh = pullDistanceRef.current >= PULL_THRESHOLD;
      startYRef.current = null;
      pullDistanceRef.current = 0;
      setStartY(null);
      setPullDistance(0);
      if (!shouldRefresh) return;
      refreshingRef.current = true;
      setRefreshing(true);
      window.setTimeout(() => {
        const refreshDetail = {
          pathname: normalizePathname(pathnameRef.current),
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
          refreshingRef.current = false;
          setRefreshing(false);
        }, 400);
      }, 120);
    };

    const handleTouchCancel = () => {
      startYRef.current = null;
      pullDistanceRef.current = 0;
      setStartY(null);
      setPullDistance(0);
    };

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: false });
    root.addEventListener("touchend", handleTouchEnd, { passive: true });
    root.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", handleTouchEnd);
      root.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []);

  const indicatorText = refreshing
    ? "刷新中..."
    : pullDistance >= PULL_THRESHOLD
      ? "松开刷新"
      : "下拉刷新";

  return (
    <div ref={rootRef} className="relative">
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
