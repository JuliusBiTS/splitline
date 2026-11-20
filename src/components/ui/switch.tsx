"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

/**
 * Switch restyled with Splitline tokens (ADR-0005): 40×24, on = accent. Off = `faint` instead of the
 * handoff's `placeholder`, which is only 2.6:1 on white (WCAG 1.4.11 needs 3:1; ADR-0005 deviation).
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-pill p-0.5 transition-colors duration-150 ease-out data-checked:bg-brand data-unchecked:bg-faint data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-pill bg-surface shadow-doc transition-transform duration-150 ease-out data-checked:translate-x-4 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
