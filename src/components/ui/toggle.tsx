"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Toggle restyled with Splitline tokens (ADR-0005).
 * - `segment`: owner control (Machine / Machine + review / Human); pressed = accent bg + white 500.
 * - `chip`: reason-code pill; pressed = ink bg + white.
 */
const toggleVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        segment:
          "border border-border-strong bg-surface text-ink-2 hover:bg-chip data-pressed:border-brand data-pressed:bg-brand data-pressed:text-on-brand",
        chip:
          "rounded-pill border border-border-strong bg-surface text-ink-2 hover:bg-chip data-pressed:border-ink data-pressed:bg-ink data-pressed:text-on-brand",
      },
      size: {
        sm: "h-7 px-3 text-[13px]",
        default: "h-9 px-3 text-sm",
      },
    },
    defaultVariants: { variant: "segment", size: "default" },
  }
)

function Toggle({
  className,
  variant = "segment",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
}

export { Toggle, toggleVariants }
