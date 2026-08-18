import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-white shadow-[0_10px_30px_rgba(43,39,40,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
