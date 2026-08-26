"use client";

import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  visible: boolean;
  onToggleVisibility: () => void;
  hint?: string;
  error?: string;
};

export function PasswordField({
  label,
  visible,
  onToggleVisibility,
  hint,
  error,
  id,
  className,
  ...props
}: PasswordFieldProps) {
  const inputId = id ?? props.name;
  const descriptionId = `${inputId}-description`;

  return (
    <div className="grid gap-2 text-sm font-bold text-ink">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? descriptionId : undefined}
          className={cn(
            "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 pr-12 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15",
            error && "border-danger focus:border-danger focus:ring-danger/15",
            className,
          )}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      </div>
      {error || hint ? (
        <span id={descriptionId} className={cn("text-xs font-normal text-ink-muted", error && "text-danger")}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}
