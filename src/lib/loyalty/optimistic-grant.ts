import type { LoyaltyCardView } from "@/components/loyalty/types";
import type { LoyaltyStampGrantedDetail } from "@/lib/loyalty/realtime-events";
import { STAMPS_PER_CARD } from "@/lib/loyalty/rules";

/**
 * Mirrors the database result of an approved stamp grant so the customer sees it
 * before the next server refresh. Cards are independent: a full card only becomes
 * completed, and the cycle restarts once every card is completed.
 *
 * `latestEventId` is the card's own most recent grant, so grants on different cards
 * are acknowledged independently. `latestApprovedCount` marks only the newest grant
 * across all cards, which is what the stamp animation highlights.
 */
export function applyOptimisticGrant(
  currentCards: LoyaltyCardView[],
  detail: LoyaltyStampGrantedDetail,
): LoyaltyCardView[] {
  const target = currentCards.find((card) => card.id === detail.memberCardId);
  if (!target || target.latestEventId === detail.eventId || target.status !== "active") {
    return currentCards;
  }

  const nextStampCount = Math.min(STAMPS_PER_CARD, target.stampsCount + detail.quantity);
  const completed = nextStampCount === STAMPS_PER_CARD;
  const cycleCompleted =
    completed && currentCards.every((card) => card.id === target.id || card.status === "completed");

  if (cycleCompleted) {
    return currentCards.map((card) => ({
      ...card,
      status: "active" as const,
      stampsCount: 0,
      pendingCount: 0,
      hasPendingRequest: false,
      latestApprovedCount: card.id === target.id ? detail.quantity : 0,
      latestEventId: card.id === target.id ? detail.eventId : card.latestEventId,
    }));
  }

  return currentCards.map((card) =>
    card.id === target.id
      ? {
          ...card,
          status: completed ? ("completed" as const) : ("active" as const),
          stampsCount: nextStampCount,
          pendingCount: 0,
          hasPendingRequest: false,
          latestApprovedCount: detail.quantity,
          latestEventId: detail.eventId,
        }
      : { ...card, latestApprovedCount: 0 },
  );
}

/**
 * Layers not-yet-refreshed grants over the server cards. A grant the server already
 * reports as a card's latest event, and every earlier grant for that card, is skipped
 * so it is never counted twice.
 */
export function applyOptimisticGrants(
  incomingCards: LoyaltyCardView[],
  grants: LoyaltyStampGrantedDetail[],
): LoyaltyCardView[] {
  const acknowledgedGrantIndex = new Map<string, number>();
  grants.forEach((grant, index) => {
    const currentCard = incomingCards.find((card) => card.id === grant.memberCardId);
    if (currentCard?.latestEventId === grant.eventId) {
      acknowledgedGrantIndex.set(grant.memberCardId, index);
    }
  });

  return grants.reduce<LoyaltyCardView[]>((currentCards, grant, index) => {
    const acknowledgedAt = acknowledgedGrantIndex.get(grant.memberCardId) ?? -1;
    return index <= acknowledgedAt ? currentCards : applyOptimisticGrant(currentCards, grant);
  }, incomingCards);
}
