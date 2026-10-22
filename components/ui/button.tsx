import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // 0.985 is below the threshold where a press registers as a press. 0.97 is
  // felt without being seen, and the curve is the product's own.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,color,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:bg-accent-hover shadow-[0_1px_0_0_rgb(255_255_255/0.14)_inset]",
        // Liquid glass. The blur is a utility rather than part of
        // `.glass-control`, because this build strips a hand-written
        // backdrop-filter out of custom CSS. Saturation is what stops the
        // surface reading as grey film: it pulls colour out of whatever sits
        // behind it, which is the whole trick.
        glass:
          "glass-control backdrop-blur-xl backdrop-saturate-150",
        secondary:
          "border border-border-strong bg-surface-raised text-fg hover:bg-surface-hover",
        ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
        outline:
          "border border-border-strong bg-transparent text-fg hover:bg-surface-hover",
        destructive: "bg-destructive text-white hover:opacity-90",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9.5 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-9",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
