import type { Metadata } from "next";
import { HistoryTimeline, type HistoryItem } from "@/components/loyalty/history-timeline";
import { PageHeading } from "@/components/loyalty/page-heading";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "History" };

type CardRow = { id: string; sequence_no: number; completed_at: string | null };
type MembershipRow = { id: string };
type RequestRow = {
  id: string;
  member_card_id: string;
  requested_count: number;
  approved_count: number | null;
  status: string;
  admin_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
};
type EventRow = {
  id: string;
  member_card_id: string;
  stamp_request_id: string | null;
  event_type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
};
type RewardRow = {
  id: string;
  member_card_id: string;
  status: string;
  available_at: string;
  redeemed_at: string | null;
  note: string | null;
};

export default async function HistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membershipData, error: membershipError } = await supabase
    .from("member_programs")
    .select("id")
    .eq("user_id", user.id);

  if (membershipError) throw new Error("HISTORY_DATA_UNAVAILABLE");
  const membershipIds = ((membershipData ?? []) as MembershipRow[]).map(
    (membership) => membership.id,
  );
  const cardsQuery = membershipIds.length
    ? supabase
        .from("member_cards")
        .select("id, sequence_no, completed_at")
        .in("member_program_id", membershipIds)
        .order("sequence_no", { ascending: true })
    : Promise.resolve({ data: [] as CardRow[], error: null });

  const [cardsResult, requestsResult, eventsResult, rewardsResult] = await Promise.all([
    cardsQuery,
    supabase
      .from("stamp_requests")
      .select(
        "id, member_card_id, requested_count, approved_count, status, admin_note, requested_at, reviewed_at",
      )
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(150),
    supabase
      .from("stamp_events")
      .select("id, member_card_id, stamp_request_id, event_type, quantity, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("reward_redemptions")
      .select("id, member_card_id, status, available_at, redeemed_at, note")
      .eq("user_id", user.id),
  ]);

  if (cardsResult.error || requestsResult.error || eventsResult.error || rewardsResult.error) {
    throw new Error("HISTORY_DATA_UNAVAILABLE");
  }

  const cards = (cardsResult.data ?? []) as CardRow[];
  const cardNo = new Map(cards.map((card) => [card.id, card.sequence_no]));
  const events = (eventsResult.data ?? []) as EventRow[];
  const eventRequestIds = new Set(events.flatMap((event) => (event.stamp_request_id ? [event.stamp_request_id] : [])));
  const items: HistoryItem[] = [];

  for (const request of (requestsResult.data ?? []) as RequestRow[]) {
    const number = cardNo.get(request.member_card_id) ?? "–";
    if (request.status === "pending") {
      items.push({
        id: `request-${request.id}`,
        occurredAt: request.requested_at,
        title: `+${request.requested_count} Stamp Request — Pending`,
        detail: "Lagi dicek sama tim Kira Kira Michi.",
        meta: `Card ${number}`,
        kind: "pending",
      });
    } else if (request.status === "rejected") {
      items.push({
        id: `request-${request.id}`,
        occurredAt: request.reviewed_at ?? request.requested_at,
        title: `+${request.requested_count} Stamp Request — Rejected`,
        detail: request.admin_note,
        meta: `Card ${number}`,
        kind: "rejected",
      });
    } else if (request.status === "approved" && !eventRequestIds.has(request.id)) {
      const approved = request.approved_count ?? request.requested_count;
      items.push({
        id: `request-${request.id}`,
        occurredAt: request.reviewed_at ?? request.requested_at,
        title: `+${approved} Stamp — Approved`,
        detail: request.admin_note,
        meta: `Card ${number}`,
        kind: "approved",
      });
    }
  }

  for (const event of events) {
    const number = cardNo.get(event.member_card_id) ?? "–";
    const revoked = event.event_type === "revoke";
    items.push({
      id: `event-${event.id}`,
      occurredAt: event.created_at,
      title: `${revoked ? "−" : "+"}${Math.abs(event.quantity)} Stamp — ${revoked ? "Adjusted" : "Approved"}`,
      detail: event.reason,
      meta: `Card ${number}`,
      kind: revoked ? "revoked" : "approved",
    });
  }

  for (const card of cards) {
    if (!card.completed_at) continue;
    items.push({
      id: `completion-${card.id}`,
      occurredAt: card.completed_at,
      title: `Card ${card.sequence_no} — Completed`,
      detail: "Reward terbuka dan card berikutnya siap dilanjutkan.",
      meta: "Loyalty milestone",
      kind: "completed",
    });
  }

  for (const reward of (rewardsResult.data ?? []) as RewardRow[]) {
    const number = cardNo.get(reward.member_card_id) ?? "–";
    items.push({
      id: `reward-available-${reward.id}`,
      occurredAt: reward.available_at,
      title: "Reward — Available",
      detail: "Reward siap digunakan bersama tim Kira Kira Michi.",
      meta: `Card ${number}`,
      kind: "reward",
    });
    if (reward.status === "redeemed" && reward.redeemed_at) {
      items.push({
        id: `reward-redeemed-${reward.id}`,
        occurredAt: reward.redeemed_at,
        title: "Reward — Redeemed",
        detail: reward.note,
        meta: `Card ${number}`,
        kind: "redeemed",
      });
    }
  }

  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Aktivitas kamu"
        title="History"
        description="Semua request, stamp, penyelesaian card, dan reward—terbaru lebih dulu."
      />
      <HistoryTimeline items={items} />
    </div>
  );
}
