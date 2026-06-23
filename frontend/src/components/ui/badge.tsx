import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
    "transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  ),
  {
    variants: {
      variant: {
        default:
          "border border-border bg-secondary text-secondary-foreground",
        accent:
          "border border-accent/20 bg-accent/10 text-accent",
        success:
          "border border-success/20 bg-success/10 text-success",
        warning:
          "border border-warning/30 bg-warning/10 text-amber-700",
        destructive:
          "border border-destructive/20 bg-destructive/10 text-destructive",
        outline:
          "border border-border bg-transparent text-foreground",
        solid:
          "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
