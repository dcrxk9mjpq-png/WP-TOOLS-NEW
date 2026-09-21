import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

/**
 * Sizes are deliberately larger than the shadcn defaults: this is used on
 * classroom tablets, often one-handed, so the default control is a 44px
 * touch target (WCAG 2.2 target size) rather than 36px.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--wp-radius-md)] text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wp-focus))] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--wp-primary))] text-white shadow-[var(--wp-shadow-sm)] hover:bg-[hsl(var(--wp-primary-700))]",
        destructive:
          "bg-[hsl(var(--wp-danger))] text-white shadow-[var(--wp-shadow-sm)] hover:bg-[hsl(var(--wp-danger))]/90",
        outline:
          "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--wp-ink))] shadow-[var(--wp-shadow-sm)] hover:border-[hsl(var(--wp-primary)/0.4)] hover:bg-[hsl(var(--wp-primary-tint))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]",
        ghost:
          "text-[hsl(var(--wp-ink))] hover:bg-[hsl(var(--wp-primary-soft))] hover:text-[hsl(var(--wp-primary-700))]",
        link: "text-[hsl(var(--wp-primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-[var(--wp-radius-sm)] px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-7 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
