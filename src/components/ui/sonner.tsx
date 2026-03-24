"use client"

import type { CSSProperties } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      expand
      gap={14}
      offset={20}
      visibleToasts={4}
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast rounded-[22px] border border-black/8 bg-white/92 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-[14px]",
          title: "text-[13px] font-medium leading-5 text-foreground",
          description: "mt-1 text-xs leading-5 text-muted-foreground",
          icon: "mt-0.5",
          actionButton:
            "rounded-full border border-black/10 bg-black px-3 py-1.5 text-xs font-medium text-white",
          cancelButton:
            "rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-foreground",
          success: "cn-toast-success",
          error: "cn-toast-error",
          info: "cn-toast-info",
          warning: "cn-toast-warning",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
