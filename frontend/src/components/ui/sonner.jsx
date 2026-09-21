import { Toaster as Sonner, toast } from "sonner";

/**
 * Toasts in the platform's own palette.
 *
 * Sonner's stock success/error colours are a saturated green and red on near
 * black, which looks alarming on a classroom screen and clashes with the muted
 * accent. Each severity is mapped to a platform token instead: success to the
 * accent green, error to the restrained red, warning to amber, info to the
 * steel blue used for Next.
 */
const Toaster = ({ ...props }) => (
  <Sonner
    className="toaster group"
    toastOptions={{
      duration: 4200,
      classNames: {
        toast:
          "group toast min-h-[56px] rounded-[var(--wp-radius-lg)] border bg-[hsl(var(--card))] text-[hsl(var(--wp-ink))] border-[hsl(var(--border))] shadow-[var(--wp-shadow-md)] text-sm font-medium",
        title: "font-semibold",
        description: "text-[hsl(var(--wp-ink-muted))]",
        actionButton:
          "bg-[hsl(var(--wp-primary))] text-white rounded-full px-3 min-h-[32px] font-semibold",
        cancelButton:
          "bg-[hsl(var(--muted))] text-[hsl(var(--wp-ink-muted))] rounded-full px-3 min-h-[32px]",
        closeButton:
          "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--wp-ink-muted))]",
        success:
          "border-[hsl(var(--wp-primary)/0.35)] bg-[hsl(var(--wp-success-soft))] text-[hsl(var(--wp-primary-700))]",
        error:
          "border-[hsl(var(--wp-danger)/0.35)] bg-[hsl(var(--wp-danger-soft))] text-[hsl(var(--wp-danger))]",
        warning:
          "border-[hsl(var(--wp-warning)/0.35)] bg-[hsl(var(--wp-warning-soft))] text-[hsl(var(--wp-warning))]",
        info:
          "border-[hsl(var(--wp-info)/0.3)] bg-[hsl(var(--wp-info-soft))] text-[hsl(var(--wp-info))]",
      },
    }}
    {...props}
  />
);

export { Toaster, toast };
