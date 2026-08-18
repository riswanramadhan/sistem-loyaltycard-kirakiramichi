import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, id, className, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  const descriptionId = `${inputId}-description`;

  return (
    <label htmlFor={inputId} className="grid gap-2 text-sm font-bold text-ink">
      {label}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? descriptionId : undefined}
        className={cn(
          "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15",
          error && "border-danger focus:border-danger focus:ring-danger/15",
          className,
        )}
        {...props}
      />
      {(error || hint) && (
        <span
          id={descriptionId}
          className={cn("text-xs font-normal text-ink-muted", error && "text-danger")}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const inputId = id ?? props.name;
  const descriptionId = inputId ? `${inputId}-description` : undefined;
  return (
    <label htmlFor={inputId} className="grid gap-2 text-sm font-bold text-ink">
      {label}
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? descriptionId : undefined}
        className={cn(
          "min-h-24 w-full resize-y rounded-xl border border-line bg-white px-3.5 py-3 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {(error || hint) && (
        <span
          id={descriptionId}
          className={cn(
            "text-xs font-normal text-ink-muted",
            error && "text-danger",
          )}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}
