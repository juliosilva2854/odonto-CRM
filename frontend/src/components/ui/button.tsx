import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "ring-offset-background transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
  ),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-xs hover:shadow-glow",
        outline:
          "border border-border bg-card text-foreground hover:bg-secondary shadow-xs",
        ghost:
          "text-foreground hover:bg-secondary",
        link:
          "text-accent underline-offset-4 hover:underline px-0",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 shadow-xs",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
        subtle:
          "bg-accent/10 text-accent hover:bg-accent/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        xl: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
