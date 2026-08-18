import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusMessage({
  children,
  tone = "error",
  className,
}: {
  children: React.ReactNode;
  tone?: "error" | "success";
  className?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
        tone === "success"
          ? "border-success/20 bg-success-soft text-success"
          : "border-danger/20 bg-danger-soft text-danger",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
