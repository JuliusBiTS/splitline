"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon } from "lucide-react"

/**
 * Sonner restyled with Splitline tokens (ADR-0005). Light-only design, so the theme is fixed.
 * Toasts are for passive confirmations only ("Charter exported", "Link copied"); never for a
 * decision. Sonner renders its own aria-live region.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon aria-hidden className="size-4 text-brand" />,
        info: <InfoIcon aria-hidden className="size-4 text-brand" />,
      }}
      style={
        {
          "--normal-bg": "var(--sl-surface)",
          "--normal-text": "var(--sl-ink)",
          "--normal-border": "var(--sl-border)",
          "--border-radius": "var(--sl-r-card)",
          "--font-family": "var(--sl-font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "shadow-elevated text-[15px]" } }}
      {...props}
    />
  )
}

export { Toaster }
