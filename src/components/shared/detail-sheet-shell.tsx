"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APPLE_BUTTON_BASE, APPLE_BUTTON_TEXT_SM } from "@/lib/ui/apple-style";

const appleButtonClassName = `${APPLE_BUTTON_BASE} ${APPLE_BUTTON_TEXT_SM}`;

type DetailSheetShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  closeLabel?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  containerClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
};

export function DetailSheetShell({
  open,
  onOpenChange,
  ariaLabel,
  closeLabel = "关闭详情",
  header,
  footer,
  children,
  containerClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  showCloseButton = true,
}: DetailSheetShellProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[70]", containerClassName)} aria-hidden={!open}>
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[71] flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl animate-in slide-in-from-bottom-6 fade-in-0 duration-200",
          panelClassName,
        )}
      >
        {header || showCloseButton ? (
          <header className={cn("shrink-0 flex items-start justify-between gap-3 px-4 pb-3 pt-3", headerClassName)}>
            <div className="min-w-0 flex-1">{header}</div>
            {showCloseButton ? (
              <Button
                size="icon-sm"
                variant="ghost"
                className={cn("cursor-pointer shrink-0", appleButtonClassName)}
                aria-label={closeLabel}
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </header>
        ) : null}

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4", bodyClassName)}>{children}</div>

        {footer ? <footer className={cn("shrink-0 bg-background/95 p-3", footerClassName)}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
