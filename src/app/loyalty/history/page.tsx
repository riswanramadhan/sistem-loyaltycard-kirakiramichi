import type { Metadata } from "next";
import { HistoryTimeline, type HistoryItem } from "@/components/loyalty/history-timeline";
import { PageHeading } from "@/components/loyalty/page-heading";
import { getMyLoyaltyState } from "@/lib/loyalty/my-loyalty-state";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const state = await getMyLoyaltyState();
  const cards = state.cards;
  const cardNo = new Map(cards.map((card) => [card.id, card.sequence_no]));
  const events = state.stamp_events;
  const eventRequestIds = new Set(events.flatMap((event) => (event.stamp_request_id ? [event.stamp_request_id] : [])));
  const items: HistoryItem[] = [];

  for (const request of state.requests) {
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

  for (const reward of state.rewards) {
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
