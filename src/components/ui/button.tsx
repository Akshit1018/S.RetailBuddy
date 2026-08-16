import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-fg shadow-sm hover:brightness-105",
        secondary:
          "border border-border bg-elevated text-fg hover:bg-muted-surface",
        outline:
          "border border-border-strong bg-transparent text-fg hover:bg-elevated",
        ghost: "text-fg hover:bg-elevated",
        danger:
          "border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15",
        sell: "bg-sell text-sell-fg shadow-sm hover:brightness-110",
      },
      size: {
        default: "h-11 min-h-11 px-5 py-2",
        sm: "h-10 min-h-10 px-4 text-xs",
        lg: "h-12 min-h-12 px-6 text-[15px]",
        xl: "h-14 min-h-14 px-7 text-base",
        icon: "h-11 w-11 min-h-11 min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
