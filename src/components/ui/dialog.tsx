"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Dialog restyled with Splitline tokens (ADR-0005). `variant="sheet-right"` is the WhatIfDrawer
 * shape: a 440 px right sheet that slides in over 240 ms (handoff); `sheet-bottom` is its mobile form.
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-ink/20 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

const POPUP_VARIANTS = {
  center:
    "top-1/2 left-1/2 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-card sm:max-w-md data-ending-style:opacity-0 data-starting-style:opacity-0",
  "sheet-right":
    "top-0 right-0 h-dvh w-full max-w-[440px] overflow-y-auto border-l border-border data-ending-style:translate-x-full data-starting-style:translate-x-full",
  "sheet-bottom":
    "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-card border-t border-border data-ending-style:translate-y-full data-starting-style:translate-y-full",
} as const

function DialogContent({
  className,
  children,
  variant = "center",
  showOverlay = true,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  variant?: keyof typeof POPUP_VARIANTS
  showOverlay?: boolean
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      {showOverlay && <DialogOverlay />}
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-surface p-8 text-ink shadow-elevated transition-[transform,opacity] duration-[240ms] ease-out",
          POPUP_VARIANTS[variant],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" />}
          >
            <XIcon aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 pr-10", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-2 flex flex-col-reverse gap-2 border-t border-divider pt-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-xl font-semibold text-ink", className)} {...props} />
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[15px] text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
