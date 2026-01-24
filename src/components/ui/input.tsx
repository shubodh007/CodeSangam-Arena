import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-10 border-border bg-input px-3 py-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        arena:
          "h-12 border-border bg-input px-4 py-3 text-base focus-visible:border-primary focus-visible:bg-input-focus focus-visible:ring-2 focus-visible:ring-primary/20",
        ghost:
          "h-10 border-transparent bg-transparent px-3 py-2 hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
