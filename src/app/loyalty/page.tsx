import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, Sparkles, Trophy } from "lucide-react";
import { LoyaltyJourney } from "@/components/loyalty/loyalty-journey";
import { firstName } from "@/components/loyalty/format";
import type { LoyaltyCardStatus, LoyaltyCardView } from "@/components/loyalty/types";
import { getMyLoyaltyState } from "@/lib/loyalty/my-loyalty-state";

export const metadata: Metadata = {
  title: "Loyalty",
};

function cardStatus(value: string): LoyaltyCardStatus {
  if (value === "active" || value === "completed") return value;
  return "locked";
}

function MembershipEmpty({ name }: { name: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-[2rem] border border-line bg-white p-7 text-center shadow-[0_16px_50px_rgba(43,39,40,0.08)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning">
        <Sparkles className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-ink">Siap mulai, {name}?</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Aktifkan membership sekali saja, lalu tujuh loyalty card kamu akan siap dikumpulkan.
      </p>
      <Link
        href="/join"
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#b9151a] transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        Aktifkan loyalty <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default async function LoyaltyPage() {
  const state = await getMyLoyaltyState();
  const name = firstName(state.profile?.full_name);
  const program = state.program;

  if (!program || !program.is_active) {
    return (
      <section className="py-8 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Program sedang disiapkan</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Loyalty Kira Kira Michi belum aktif. Coba kembali sebentar lagi, ya.
        </p>
      </section>
    );
  }

  const membership = state.member_program;

  if (!membership) return <MembershipEmpty name={name} />;

  const hasAnyPendingRequest = state.requests.some((request) => request.status === "pending");
  const latestEvent = state.stamp_events.find((event) => event.event_type === "grant") ?? null;
  const cards: LoyaltyCardView[] = state.cards.map((row) => {
    const definition = row.definition;
    const pendingCount = row.pending_request?.requested_count ?? 0;
    return {
      id: row.id,
      sequenceNo: row.sequence_no,
      status: cardStatus(row.status),
      stampsCount: Math.max(0, Math.min(program.stamps_per_card, row.stamps_count)),
      title: definition?.title ?? null,
      description: definition?.description ?? null,
      rewardTitle: definition?.reward_title ?? null,
      rewardDescription: definition?.reward_description ?? null,
      rewardTerms: definition?.reward_terms ?? null,
      pendingCount,
      hasPendingRequest:
        pendingCount > 0 || (row.status === "active" && hasAnyPendingRequest),
      latestApprovedCount:
        latestEvent?.member_card_id === row.id ? Math.max(0, latestEvent.quantity) : 0,
    };
  });

  const active = cards.find((card) => card.status === "active") ?? null;
  const completedCards = cards.filter((card) => card.status === "completed").length;
  const remaining = active ? Math.max(0, program.stamps_per_card - active.stampsCount) : 0;
  const completedCycles = Math.max(0, membership.completed_cycles ?? 0);
  const subcopy = active && remaining <= 2
      ? `Tinggal ${remaining} stamp lagi menuju reward berikutnya.`
      : "Yuk lanjut kumpulkan stamp-mu.";

  return (
    <>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-ink bg-ink p-5 text-white shadow-[0_16px_44px_rgba(43,39,40,0.14)] sm:p-7">
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">{program.name}</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Okaeri, {name}!</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/75">{subcopy}</p>
            {program.description ? <p className="mt-1 max-w-md text-xs leading-5 text-white/55">{program.description}</p> : null}
            {completedCycles > 0 ? (
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-ink shadow-[0_3px_0_#d6aa00]">
                <Trophy className="size-4" aria-hidden="true" />
                {completedCycles} putaran loyalty selesai
              </span>
            ) : null}
          </div>
          <Link
            href="/loyalty/rewards"
            aria-label="Lihat reward"
            className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-ink shadow-[0_4px_0_#d6aa00] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink motion-reduce:transform-none motion-reduce:transition-none"
          >
            <Gift className="size-5" aria-hidden="true" />
          </Link>
        </div>
        <div className="relative mt-5 flex items-center gap-3 border-t border-white/15 pt-4 text-xs font-semibold text-white/70">
          <span className="text-white">{completedCards} dari {program.total_cards} card selesai</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (completedCards / Math.max(1, program.total_cards)) * 100)}%` }}
            />
          </span>
        </div>
      </section>

      {cards.length > 0 ? (
        <LoyaltyJourney cards={cards} />
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 text-center">
          <p className="font-bold text-ink">Card kamu sedang disiapkan.</p>
          <p className="mt-1 text-sm text-ink-muted">Muat ulang sebentar lagi, ya.</p>
        </div>
      )}
    </>
  );
}
