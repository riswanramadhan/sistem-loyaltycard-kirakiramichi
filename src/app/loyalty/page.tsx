import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, Sparkles } from "lucide-react";
import { SiInstagram, SiWhatsapp } from "react-icons/si";
import { LoyaltyJourney } from "@/components/loyalty/loyalty-journey";
import { firstName } from "@/components/loyalty/format";
import type { LoyaltyCardStatus, LoyaltyCardView } from "@/components/loyalty/types";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Loyalty",
};

type ProgramRow = {
  id: string;
  name: string;
  total_cards: number;
  stamps_per_card: number;
};

type MembershipRow = {
  id: string;
  status: string;
  joined_at: string;
  completed_at: string | null;
};

type DefinitionRow = {
  title: string | null;
  description: string | null;
  reward_title: string | null;
  reward_description: string | null;
  reward_terms: string | null;
};

type MemberCardRow = {
  id: string;
  sequence_no: number;
  status: string;
  stamps_count: number;
  definition: DefinitionRow | DefinitionRow[] | null;
};

type PendingRequestRow = {
  member_card_id: string;
  requested_count: number;
};

type StampEventRow = {
  member_card_id: string;
  quantity: number;
};

function cardStatus(value: string): LoyaltyCardStatus {
  if (value === "active" || value === "completed") return value;
  return "locked";
}

function oneDefinition(value: DefinitionRow | DefinitionRow[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function MembershipEmpty({ name }: { name: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-[2rem] border border-line bg-white p-7 text-center shadow-[0_16px_50px_rgba(43,39,40,0.08)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning">
        <Sparkles className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-ink">Siap mulai, {name}?</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Aktifkan membership sekali saja, lalu enam loyalty card kamu akan siap dikumpulkan.
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
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile, error: profileError }, { data: programData, error: programError }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("loyalty_programs")
        .select("id, name, total_cards, stamps_per_card")
        .eq("slug", "kira-kira-michi-loyalty")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

  if (profileError || programError) throw new Error("LOYALTY_DATA_UNAVAILABLE");

  const name = firstName((profile as { full_name?: string | null } | null)?.full_name);
  const program = programData as ProgramRow | null;

  if (!program) {
    return (
      <section className="py-8 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Program sedang disiapkan</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Loyalty Kira Kira Michi belum aktif. Coba kembali sebentar lagi, ya.
        </p>
      </section>
    );
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("member_programs")
    .select("id, status, joined_at, completed_at")
    .eq("program_id", program.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) throw new Error("LOYALTY_DATA_UNAVAILABLE");
  const membership = membershipData as MembershipRow | null;

  if (!membership) return <MembershipEmpty name={name} />;

  const [cardsResult, requestsResult, latestEventResult] = await Promise.all([
    supabase
      .from("member_cards")
      .select(
        "id, sequence_no, status, stamps_count, definition:loyalty_card_definitions(title, description, reward_title, reward_description, reward_terms)",
      )
      .eq("member_program_id", membership.id)
      .order("sequence_no", { ascending: true }),
    supabase
      .from("stamp_requests")
      .select("member_card_id, requested_count")
      .eq("user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("stamp_events")
      .select("member_card_id, quantity")
      .eq("user_id", user.id)
      .eq("event_type", "grant")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (cardsResult.error || requestsResult.error || latestEventResult.error) {
    throw new Error("LOYALTY_DATA_UNAVAILABLE");
  }

  const pendingByCard = new Map<string, number>();
  for (const request of (requestsResult.data ?? []) as PendingRequestRow[]) {
    pendingByCard.set(
      request.member_card_id,
      (pendingByCard.get(request.member_card_id) ?? 0) + request.requested_count,
    );
  }
  const hasAnyPendingRequest = pendingByCard.size > 0;

  const latestEvent = ((latestEventResult.data ?? []) as StampEventRow[])[0] ?? null;
  const cards: LoyaltyCardView[] = ((cardsResult.data ?? []) as MemberCardRow[]).map((row) => {
    const definition = oneDefinition(row.definition);
    const pendingCount = pendingByCard.get(row.id) ?? 0;
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
  const journeyComplete = membership.status === "completed" || completedCards >= program.total_cards;
  const subcopy = journeyComplete
    ? "Semua card selesai—journey kamu lengkap!"
    : active && remaining <= 2
      ? `Tinggal ${remaining} stamp lagi menuju reward berikutnya.`
      : "Yuk lanjut kumpulkan stamp-mu.";

  return (
    <>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-ink bg-ink p-5 text-white shadow-[0_16px_44px_rgba(43,39,40,0.14)] sm:p-7">
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Kira Kira Michi</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Okaeri, {name}!</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/75">{subcopy}</p>
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

      <aside className="mt-5 flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Kontak Kira Kira Michi">
        <div>
          <p className="font-extrabold text-ink">Mau order atau ada kendala?</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Hub admin aja, santai. Kita bantu sampai beres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://wa.me/6289529974959" target="_blank" rel="noreferrer" aria-label="Hubungi Kira Kira Michi melalui WhatsApp di 089529974959" className="group inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-soft px-3 text-xs font-extrabold text-brand hover:bg-brand hover:text-white">
            <SiWhatsapp className="size-4 text-[#25d366] group-hover:text-white" aria-hidden="true" /> 089529974959
          </a>
          <a href="https://www.instagram.com/kirakiramichi.merchandise" target="_blank" rel="noreferrer" aria-label="Buka Instagram kirakiramichi.merchandise" className="group inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface-muted px-3 text-xs font-extrabold text-ink hover:bg-ink hover:text-white">
            <SiInstagram className="size-4 text-[#e4405f] group-hover:text-white" aria-hidden="true" /> kirakiramichi.merchandise
          </a>
        </div>
      </aside>

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
