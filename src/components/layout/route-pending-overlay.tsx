"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const SHOW_DELAY_MS = 140;
const MAX_PENDING_MS = 12000;

function shouldHandleAnchorClick(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  const nextUrl = new URL(href, window.location.href);
  if (nextUrl.origin !== window.location.origin) return false;

  const currentUrl = new URL(window.location.href);
  const samePage =
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search;

  return !samePage;
}

export function RoutePendingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [pendingRouteKey, setPendingRouteKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: number | null = null;
    let maxTimer: number | null = null;

    const clearTimers = () => {
      if (showTimer != null) {
        window.clearTimeout(showTimer);
        showTimer = null;
      }
      if (maxTimer != null) {
        window.clearTimeout(maxTimer);
        maxTimer = null;
      }
    };

    const startPending = () => {
      clearTimers();
      setPendingRouteKey(routeKey);
      setVisible(false);
      showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      maxTimer = window.setTimeout(() => {
        setPendingRouteKey(null);
        setVisible(false);
        clearTimers();
      }, MAX_PENDING_MS);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !shouldHandleAnchorClick(event, anchor)) return;
      startPending();
    };

    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      startPending();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      clearTimers();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [routeKey]);

  if (!visible || pendingRouteKey !== routeKey) return null;

  return (
    <div
      aria-live="polite"
      aria-label="页面加载中"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/18 backdrop-blur-[2px]"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <Loader2 className="size-7 animate-spin text-blue-600" aria-hidden="true" />
      </div>
    </div>
  );
}
