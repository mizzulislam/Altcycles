import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs sm:text-sm font-semibold transition-all duration-100 ease-out active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        toolbar:
          "border border-border/80 bg-card hover:bg-muted/70 text-foreground shadow-2xs font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-xl px-3 text-xs",
        lg: "h-10 rounded-xl px-6",
        icon: "size-9 rounded-xl relative after:absolute after:-inset-1.5 after:content-[''] sm:after:hidden",
        "table-action":
          "size-8 rounded-lg p-0 relative after:absolute after:-inset-1 after:content-[''] sm:after:hidden shrink-0",
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
  loading?: boolean;
  tooltip?: React.ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      title,
      tooltip,
      tooltipSide = "top",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isCancel =
      typeof children === "string" &&
      (children.trim().toLowerCase() === "batal" ||
        children.trim().toLowerCase() === "batalkan");
    const cancelHoverClass =
      isCancel && (!variant || variant === "outline" || variant === "ghost")
        ? "hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 active:bg-rose-500/20"
        : "";

    const isDisabled = disabled || loading;
    const tooltipContent = tooltip ?? title;
    const buttonNode = (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          cancelHoverClass,
        )}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading ? "true" : undefined}
        {...props}
      >
        {loading && <Loader2Icon className="size-4 animate-spin shrink-0" />}
        {children}
      </Comp>
    );

    if (tooltipContent) {
      return (
        <ActionTooltip content={tooltipContent} side={tooltipSide}>
          {buttonNode}
        </ActionTooltip>
      );
    }

    return buttonNode;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
