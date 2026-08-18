import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning";
}) {
  const toneClasses = {
    neutral: "bg-surface-muted text-ink-muted",
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  } as const;

  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
          {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`} aria-hidden="true">
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function EmptyAdminState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-52 place-items-center px-5 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-ink-muted">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-extrabold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function RequestStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "approved") return <Badge tone="success">Disetujui</Badge>;
  if (normalized === "rejected") return <Badge tone="danger">Ditolak</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

export function CardStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge tone="success">Selesai</Badge>;
  if (normalized === "active") return <Badge tone="brand">Aktif</Badge>;
  return <Badge tone="neutral">Terkunci</Badge>;
}

export function RewardStatusBadge({ status }: { status: string }) {
  if (status.toLowerCase() === "expired") {
    return <Badge tone="danger">Kedaluwarsa</Badge>;
  }
  return status.toLowerCase() === "redeemed" ? (
    <Badge tone="neutral">Sudah ditebus</Badge>
  ) : (
    <Badge tone="success">Tersedia</Badge>
  );
}

export function formatAdminDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Makassar",
  }).format(date);
}

export function displayText(value: string | null | undefined, fallback = "–") {
  const normalized = value?.trim();
  return normalized || fallback;
}
