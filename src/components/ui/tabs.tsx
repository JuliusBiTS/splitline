"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Tabs restyled with Splitline tokens (ADR-0005).
 * - `line` (default): result tabs; active = accent 600 text + 2 px accent underline.
 * - `segmented`: Living Lab tabs; `chip` track, active = white with a small shadow.
 */
function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-4 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva("group/tabs-list flex items-center", {
  variants: {
    variant: {
      line: "relative w-full gap-6 overflow-x-auto border-b border-divider",
      segmented: "w-fit gap-1 rounded-control bg-chip p-1",
    },
  },
  defaultVariants: { variant: "line" },
})

function TabsList({
  className,
  variant = "line",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-[15px] font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-ink disabled:pointer-events-none disabled:opacity-50",
        // line
        "group-data-[variant=line]/tabs-list:h-11 group-data-[variant=line]/tabs-list:data-active:font-semibold group-data-[variant=line]/tabs-list:data-active:text-brand",
        "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand after:opacity-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        // segmented
        "group-data-[variant=segmented]/tabs-list:h-8 group-data-[variant=segmented]/tabs-list:rounded-control group-data-[variant=segmented]/tabs-list:px-3 group-data-[variant=segmented]/tabs-list:text-sm group-data-[variant=segmented]/tabs-list:data-active:bg-surface group-data-[variant=segmented]/tabs-list:data-active:text-ink group-data-[variant=segmented]/tabs-list:data-active:shadow-doc",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
