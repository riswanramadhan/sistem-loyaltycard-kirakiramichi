import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/loyalty/page-heading";
import { RewardSection } from "@/components/loyalty/reward-list";
import type { RewardView } from "@/components/loyalty/types";
import { getMyLoyaltyState } from "@/lib/loyalty/my-loyalty-state";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const state = await getMyLoyaltyState();
  // One timestamp keeps every expiry comparison in this render consistent.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const unlocked: RewardView[] = state.rewards.map((redemption) => {
    const expired = Boolean(
      redemption?.status === "available" &&
      redemption.expires_at &&
      new Date(redemption.expires_at).getTime() <= now,
    );
    const status = expired
      ? "expired"
      : redemption.status === "available" || redemption.status === "redeemed"
        ? redemption.status
        : "expired";

    return {
      id: redemption.id,
      memberCardId: redemption.member_card_id,
      sequenceNo: redemption.card_sequence_no,
      cycleNo: redemption.cycle_no,
      title: redemption.reward_title,
      description: redemption.reward_description,
      terms: redemption.reward_terms,
      status,
      availableAt: redemption.available_at,
      expiresAt: redemption.expires_at,
      redeemedAt: redemption.redeemed_at,
    } satisfies RewardView;
  });
  const currentCycle = (state.member_program?.completed_cycles ?? 0) + 1;
  const locked: RewardView[] = state.cards
    .filter((card) => !card.reward)
    .map((card) => ({
      id: null,
      memberCardId: card.id,
      sequenceNo: card.sequence_no,
      cycleNo: currentCycle,
      title: card.definition.reward_title,
      description: card.definition.reward_description,
      terms: card.definition.reward_terms,
      status: "locked",
      availableAt: null,
      expiresAt: null,
      redeemedAt: null,
    }));
  const rewards = [...unlocked, ...locked];

  const available = rewards.filter((reward) => reward.status === "available");
  const lockedRewards = rewards.filter((reward) => reward.status === "locked");
  const expired = rewards.filter((reward) => reward.status === "expired");
  const redeemed = rewards.filter((reward) => reward.status === "redeemed");

  return (
    <div className="space-y-9">
      <PageHeading
        eyebrow="Koleksi kamu"
        title="Rewards"
        description="Reward terbuka otomatis setiap kali satu loyalty card selesai. Kamu tidak perlu menunggu reward dipakai untuk lanjut ke card berikutnya."
      />

      {rewards.length > 0 ? (
        <>
          <RewardSection status="available" rewards={available} />
          <RewardSection status="locked" rewards={lockedRewards} />
          <RewardSection status="expired" rewards={expired} />
          <RewardSection status="redeemed" rewards={redeemed} />
        </>
      ) : (
        <div className="rounded-[1.75rem] border border-line bg-white px-6 py-10 text-center shadow-[0_10px_30px_rgba(43,39,40,0.05)]">
          <p className="font-extrabold text-ink">Reward pertama akan terbuka setelah card selesai.</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Mulai loyalty journey untuk melihat tujuh reward di sini.</p>
          <Link
            href="/loyalty"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-brand/40 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke Home
          </Link>
        </div>
      )}
    </div>
  );
}
