"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button app-button inline-flex shrink-0 cursor-pointer items-center justify-center border bg-clip-padding text-sm whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "app-button-primary",
        outline: "app-button-outline",
        secondary: "app-button-secondary",
        ghost: "app-button-ghost",
        destructive: "app-button-danger",
        link: "border-transparent bg-transparent px-0 text-primary shadow-none hover:underline",
      },
      radius: {
        default: "rounded-[12px]",
        sm: "rounded-[10px]",
        lg: "rounded-[14px]",
        pill: "rounded-full",
        none: "rounded-none",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      radius: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>

function Button({
  className,
  variant = "default",
  radius = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, radius, size, className }))}
      {...props}
    />
  )
}

type IconButtonProps = Omit<ButtonProps, "size"> & {
  size?: "icon-xs" | "icon-sm" | "icon" | "icon-lg"
  label?: string
}

function IconButton({
  className,
  size = "icon",
  label,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      size={size}
      className={className}
      aria-label={props["aria-label"] ?? label}
      {...props}
    >
      {children}
      {label ? <span className="sr-only">{label}</span> : null}
    </Button>
  )
}

export { Button, IconButton, buttonVariants }
export type { ButtonProps, IconButtonProps }
