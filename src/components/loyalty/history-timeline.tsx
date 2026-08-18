import { BadgeCheck, Clock3, Gift, RotateCcw, Sparkles, Trophy, XCircle } from "lucide-react";
import { formatDateTime } from "@/components/loyalty/format";
import { cn } from "@/lib/utils";

export type HistoryItem = {
  id: string;
  occurredAt: string;
  title: string;
  detail: string | null;
  meta: string;
  kind: "approved" | "pending" | "rejected" | "completed" | "reward" | "redeemed" | "revoked";
};

const presentation = {
  approved: { icon: Sparkles, className: "bg-brand-soft text-brand" },
  pending: { icon: Clock3, className: "bg-warning-soft text-warning" },
  rejected: { icon: XCircle, className: "bg-danger-soft text-danger" },
  completed: { icon: Trophy, className: "bg-success-soft text-success" },
  reward: { icon: Gift, className: "bg-warning-soft text-warning" },
  redeemed: { icon: BadgeCheck, className: "bg-success-soft text-success" },
  revoked: { icon: RotateCcw, className: "bg-surface-muted text-ink-muted" },
} as const;

export function HistoryTimeline({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-line bg-white px-6 py-12 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Clock3 className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-extrabold text-ink">Belum ada aktivitas stamp</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">Yuk mulai loyalty journey kamu!</p>
      </div>
    );
  }

  return (
    <ol className="relative ml-5 border-l border-line" aria-label="Riwayat loyalty, terbaru lebih dulu">
      {items.map((item, index) => {
        const view = presentation[item.kind];
        const Icon = view.icon;
        return (
          <li key={item.id} className={cn("relative pl-8", index < items.length - 1 && "pb-7")}>
            <span
              className={cn(
                "absolute -left-[21px] top-0 grid size-10 place-items-center rounded-2xl border-4 border-surface",
                view.className,
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <article className="rounded-2xl border border-line bg-white p-4 shadow-[0_8px_24px_rgba(43,39,40,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold leading-5 text-ink">{item.title}</h2>
                  <p className="mt-1 text-xs font-semibold text-ink-muted">{item.meta}</p>
                </div>
                <time dateTime={item.occurredAt} className="text-[11px] font-semibold text-ink-faint">
                  {formatDateTime(item.occurredAt)}
                </time>
              </div>
              {item.detail ? (
                <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs leading-5 text-ink-muted">
                  {item.detail}
                </p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

