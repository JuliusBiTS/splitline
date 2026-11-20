"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { toggleVariants } from "@/components/ui/toggle"

type GroupVariant = VariantProps<typeof toggleVariants>

const ToggleGroupContext = React.createContext<GroupVariant>({ variant: "segment", size: "default" })

/**
 * Toggle group restyled with Splitline tokens (ADR-0005). The `segment` variant joins items into
 * one control with a shared border and 4 px outer radius; `chip` lays pills out with an 8 px gap.
 */
function ToggleGroup({
  className,
  variant = "segment",
  size = "default",
  children,
  ...props
}: ToggleGroupPrimitive.Props & GroupVariant) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center",
        variant === "chip" ? "flex-wrap gap-2" : "gap-0",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  )
}

function ToggleGroupItem({ className, children, ...props }: TogglePrimitive.Props) {
  const { variant, size } = React.useContext(ToggleGroupContext)
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ variant, size }),
        variant === "segment" &&
          "-ml-px rounded-none first:ml-0 first:rounded-l-control last:rounded-r-control focus-visible:z-10 data-pressed:z-[1]",
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  )
}

export { ToggleGroup, ToggleGroupItem }
