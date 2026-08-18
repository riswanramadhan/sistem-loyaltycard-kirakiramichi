import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/loyalty/page-heading";
import { RewardSection } from "@/components/loyalty/reward-list";
import type { RewardView } from "@/components/loyalty/types";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rewards" };

type ProgramRow = { id: string };
type MembershipRow = { id: string };
type DefinitionRow = {
  reward_title: string | null;
  reward_description: string | null;
  reward_terms: string | null;
};
type CardRow = {
  id: string;
  sequence_no: number;
  status: string;
  definition: DefinitionRow | DefinitionRow[] | null;
};
type RedemptionRow = {
  id: string;
  member_card_id: string;
  status: string;
  available_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
};

function oneDefinition(value: DefinitionRow | DefinitionRow[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function RewardsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: programData, error: programError } = await supabase
    .from("loyalty_programs")
    .select("id")
    .eq("slug", "kira-kira-michi-loyalty")
    .maybeSingle();

  if (programError) throw new Error("REWARDS_DATA_UNAVAILABLE");
  const program = programData as ProgramRow | null;
  let rewards: RewardView[] = [];

  if (program) {
    const { data: membershipData, error: membershipError } = await supabase
      .from("member_programs")
      .select("id")
      .eq("program_id", program.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) throw new Error("REWARDS_DATA_UNAVAILABLE");

    const membership = membershipData as MembershipRow | null;
    if (membership) {
      // This async Server Component is request-bound; one timestamp keeps all rows consistent.
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const [cardsResult, redemptionsResult] = await Promise.all([
        supabase
          .from("member_cards")
          .select(
            "id, sequence_no, status, definition:loyalty_card_definitions(reward_title, reward_description, reward_terms)",
          )
          .eq("member_program_id", membership.id)
          .order("sequence_no", { ascending: true }),
        supabase
          .from("reward_redemptions")
          .select("id, member_card_id, status, available_at, expires_at, redeemed_at")
          .eq("user_id", user.id),
      ]);

      if (cardsResult.error || redemptionsResult.error) {
        throw new Error("REWARDS_DATA_UNAVAILABLE");
      }

      const redemptionByCard = new Map(
        ((redemptionsResult.data ?? []) as RedemptionRow[]).map((row) => [row.member_card_id, row]),
      );

      rewards = ((cardsResult.data ?? []) as CardRow[]).map((card) => {
        const definition = oneDefinition(card.definition);
        const redemption = redemptionByCard.get(card.id);
        const expired = Boolean(
          redemption?.status === "available" &&
          redemption.expires_at &&
          new Date(redemption.expires_at).getTime() <= now,
        );
        const status = expired
          ? "expired"
          : redemption?.status === "available" || redemption?.status === "redeemed"
            ? redemption.status
            : "locked";

        return {
          id: redemption?.id ?? null,
          memberCardId: card.id,
          sequenceNo: card.sequence_no,
          title: definition?.reward_title ?? null,
          description: definition?.reward_description ?? null,
          terms: definition?.reward_terms ?? null,
          status,
          availableAt: redemption?.available_at ?? null,
          expiresAt: redemption?.expires_at ?? null,
          redeemedAt: redemption?.redeemed_at ?? null,
        } satisfies RewardView;
      });
    }
  }

  const available = rewards.filter((reward) => reward.status === "available");
  const locked = rewards.filter((reward) => reward.status === "locked");
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
          <RewardSection status="locked" rewards={locked} />
          <RewardSection status="expired" rewards={expired} />
          <RewardSection status="redeemed" rewards={redeemed} />
        </>
      ) : (
        <div className="rounded-[1.75rem] border border-line bg-white px-6 py-10 text-center shadow-[0_10px_30px_rgba(43,39,40,0.05)]">
          <p className="font-extrabold text-ink">Reward pertama akan terbuka setelah card selesai.</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Mulai loyalty journey untuk melihat keenam reward di sini.</p>
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
