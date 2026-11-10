import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  // Focus ring: the official DS button draws `outline:1px solid var(--accent-500)` with a -1px
  // offset, gated on `data-whatinput="keyboard"` rather than the browser's own `:focus-visible`
  // (G1110) — so a pointer click never leaves a ring. `outline-none` on the base class clears the
  // UA ring; the ring itself is added by the `[data-whatinput=keyboard]` rule in globals.css.
  // Disabled styling is one global `[data-disabled]` rule (G1014 ①, 40% + default cursor), not a
  // per-component class; `data-disabled` is what Base UI emits. `data-static` is the second gate
  // (G1014 ②): the hover variant and focus rules skip it, so a control used as static text gets
  // no state styling at all.
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Craft's filled CTAs are pills (`--radius-full`); the outline/ghost chrome stays squared.
        default: "rounded-full bg-primary text-primary-foreground hover:bg-primary/80",
        // G972: official `Default` tints its left/right content slots to 85% (`--foreground-800`),
        // so the icon reads lighter than the label. Local `outline`/`ghost` are the
        // foreground-surface variants standing in for it.
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:text-[var(--foreground-800)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 [&_svg]:text-[var(--foreground-800)]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        // G972: the official `Active` variant — the rail-selected look. Resting 4% background at
        // 100% text, climbing to 6% on hover / popup-open / focus and 8% on press.
        active:
          "bg-[var(--foreground-100)] text-[var(--foreground-900)] hover:bg-[var(--foreground-150)] aria-expanded:bg-[var(--foreground-150)] aria-pressed:bg-[var(--foreground-150)] data-popup-open:bg-[var(--foreground-150)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
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
  isStatic = false,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** G1014 ②: render as static text — no hover/focus/press styling, default cursor. */
    isStatic?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-static={isStatic ? "" : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
