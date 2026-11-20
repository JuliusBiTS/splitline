import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Button restyled with Splitline tokens (ADR-0005): 4 px radius, 36–48 px heights,
 * accent primary with white 500 text, focus from the global accent outline.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-transparent font-medium whitespace-nowrap transition-colors duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-st-blocker [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand text-on-brand hover:bg-brand-hover",
        outline: "border-border-strong bg-surface text-ink hover:bg-chip aria-expanded:bg-chip",
        secondary: "bg-chip text-ink-2 hover:bg-subtle",
        ghost: "text-ink hover:bg-chip aria-expanded:bg-chip",
        destructive: "bg-st-blocker-bg text-st-blocker hover:border-st-blocker",
        link: "h-auto px-0 text-brand underline-offset-4 hover:text-brand-hover hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-4 text-[15px]",
        lg: "h-11 px-5 text-[15px]",
        xl: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
