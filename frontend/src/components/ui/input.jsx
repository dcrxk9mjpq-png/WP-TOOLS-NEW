import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[var(--wp-radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-base",
        "shadow-[var(--wp-shadow-sm)] transition-[border-color,box-shadow] duration-150",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-[hsl(var(--wp-ink-faint))]",
        "hover:border-[hsl(var(--wp-primary)/0.35)]",
        "focus-visible:border-[hsl(var(--wp-primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[hsl(var(--wp-focus))]",
        "aria-[invalid=true]:border-[hsl(var(--wp-danger))] aria-[invalid=true]:outline-[hsl(var(--wp-danger))]",
        "disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-60",
        "md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
