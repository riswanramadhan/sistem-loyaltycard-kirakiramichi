import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-[0_4px_0_#b9151a] hover:bg-brand-strong active:translate-y-0.5 active:shadow-[0_2px_0_#b9151a]",
  secondary:
    "bg-accent text-ink shadow-[0_4px_0_#d6aa00] hover:bg-accent-strong active:translate-y-0.5 active:shadow-[0_2px_0_#d6aa00]",
  outline: "border border-line bg-white text-ink hover:border-brand/50 hover:bg-brand-soft",
  danger: "bg-danger text-white hover:bg-red-700",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  icon: "size-11 p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
