import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 select-none active:opacity-90",
  {
    variants: {
      variant: {
        primary: "bg-steel text-steel-ink hover:bg-ink",
        secondary: "bg-panel text-ink border border-line hover:bg-raised",
        ghost: "text-mute hover:text-ink hover:bg-panel",
        danger: "bg-danger/15 text-danger hover:bg-danger/25",
      },
      size: {
        md: "h-11 px-4 rounded-md text-sm",
        sm: "h-9 px-3 rounded-sm text-xs",
        icon: "size-11 rounded-md",
        "icon-sm": "size-9 rounded-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
