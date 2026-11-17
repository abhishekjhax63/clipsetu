import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-ink-900 text-white hover:bg-ink-800 shadow-sm hover:shadow-md",
        primary:
          "bg-ink-900 text-white hover:bg-ink-800 shadow-sm hover:shadow-md",
        secondary:
          "bg-surface text-ink-900 border border-border hover:bg-surface-muted",
        outline:
          "border border-border bg-transparent hover:bg-surface-soft text-ink-900",
        ghost: "hover:bg-surface-muted text-ink-700",
        success:
          "bg-mint-600 text-white hover:bg-mint-700 shadow-sm",
        danger:
          "bg-danger text-white hover:opacity-90 shadow-sm",
        link: "text-ink-900 underline-offset-4 hover:underline h-auto p-0",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
