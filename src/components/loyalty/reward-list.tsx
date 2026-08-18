import { BadgeCheck, CalendarClock, Gift, LockKeyhole, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/components/loyalty/format";
import type { RewardView } from "@/components/loyalty/types";
import { cn } from "@/lib/utils";

const sectionCopy = {
  available: {
    title: "Available",
    description: "Siap dipakai saat kunjungan berikutnya.",
    empty: "Belum ada reward tersedia. Sedikit lagi, teruskan stamp-mu!",
  },
  locked: {
    title: "Locked",
    description: "Selesaikan card berurutan untuk membukanya.",
    empty: "Semua reward sudah pernah kamu buka.",
  },
  expired: {
    title: "Expired",
    description: "Reward yang sudah melewati masa berlaku.",
    empty: "Belum ada reward kedaluwarsa.",
  },
  redeemed: {
    title: "Redeemed",
    description: "Kenangan reward yang sudah kamu nikmati.",
    empty: "Belum ada reward yang digunakan.",
  },
} as const;

function RewardTicket({ reward }: { reward: RewardView }) {
  const locked = reward.status === "locked";
  const redeemed = reward.status === "redeemed";
  const expired = reward.status === "expired";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_10px_30px_rgba(43,39,40,0.05)]",
        reward.status === "available" && "border-accent/60",
        locked && "border-line bg-surface-muted/65",
        redeemed && "border-success/20",
        expired && "border-danger/20 bg-danger-soft/20",
      )}
    >
      <span className="absolute -right-5 -top-5 size-20 rotate-12 rounded-[42%] bg-surface-muted" aria-hidden="true" />
      {reward.status === "available" ? (
        <span className="absolute -right-1 top-4 size-7 rotate-45 rounded-md bg-accent/70" aria-hidden="true" />
      ) : null}

      <div className="relative flex items-start gap-4">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl",
            reward.status === "available" && "bg-accent text-ink shadow-[0_3px_0_#d6aa00]",
            locked && "bg-white text-ink-faint",
            redeemed && "bg-success-soft text-success",
            expired && "bg-danger-soft text-danger",
          )}
        >
          {reward.status === "available" ? (
            <Sparkles className="size-5" aria-hidden="true" />
          ) : locked ? (
            <LockKeyhole className="size-5" aria-hidden="true" />
          ) : expired ? (
            <CalendarClock className="size-5" aria-hidden="true" />
          ) : (
            <BadgeCheck className="size-5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">
              Reward Card {reward.sequenceNo}
            </p>
            <Badge tone={reward.status === "available" ? "warning" : redeemed ? "success" : expired ? "danger" : "neutral"}>
              {reward.status === "available" ? "Tersedia" : redeemed ? "Sudah dipakai" : expired ? "Kedaluwarsa" : "Terkunci"}
            </Badge>
          </div>
          <h3 className={cn("mt-2 text-base font-extrabold leading-6 text-ink", locked && "text-ink-muted")}>
            {reward.title ?? "Detail reward segera hadir"}
          </h3>
          {reward.description ? (
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">{reward.description}</p>
          ) : null}

          {reward.status === "available" ? (
            <div className="mt-4 rounded-xl bg-warning-soft px-3 py-2.5 text-xs font-semibold leading-5 text-warning">
              <p className="flex items-start gap-2">
                <Gift className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Tunjukkan halaman ini ke tim Kira Kira Michi saat ingin memakai reward.
              </p>
              <p className="mt-1 pl-6">
                {reward.expiresAt ? `Berlaku hingga ${formatDate(reward.expiresAt)}.` : "Tidak memiliki batas waktu."}
              </p>
            </div>
          ) : redeemed ? (
            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-success">
              <CalendarClock className="size-4" aria-hidden="true" />
              Digunakan {formatDate(reward.redeemedAt)}
            </p>
          ) : expired ? (
            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-danger">
              <CalendarClock className="size-4" aria-hidden="true" />
              Masa berlaku berakhir {formatDate(reward.expiresAt)}
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold leading-5 text-ink-muted">
              Terbuka setelah Card {reward.sequenceNo} selesai.
            </p>
          )}

          {reward.terms && !locked ? (
            <details className="mt-3 text-xs text-ink-muted">
              <summary className="cursor-pointer font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                Lihat syarat reward
              </summary>
              <p className="mt-2 whitespace-pre-line leading-5">{reward.terms}</p>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function RewardSection({
  status,
  rewards,
}: {
  status: "available" | "locked" | "expired" | "redeemed";
  rewards: RewardView[];
}) {
  const copy = sectionCopy[status];
  return (
    <section aria-labelledby={`${status}-title`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id={`${status}-title`} className="text-lg font-extrabold tracking-tight text-ink">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{copy.description}</p>
        </div>
        <span className="grid min-w-8 place-items-center rounded-full bg-surface-muted px-2 py-1 text-xs font-extrabold text-ink-muted">
          {rewards.length}
        </span>
      </div>

      {rewards.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rewards.map((reward) => (
            <RewardTicket key={`${reward.memberCardId}-${reward.status}`} reward={reward} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-muted/55 px-5 py-7 text-center">
          <p className="text-sm font-semibold leading-6 text-ink-muted">{copy.empty}</p>
        </div>
      )}
    </section>
  );
}
