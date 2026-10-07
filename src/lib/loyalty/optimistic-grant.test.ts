import { describe, expect, it } from "vitest";
import type { LoyaltyCardView } from "@/components/loyalty/types";
import { applyOptimisticGrant, applyOptimisticGrants } from "./optimistic-grant";

function makeCards(overrides: Record<number, Partial<LoyaltyCardView>> = {}): LoyaltyCardView[] {
  return Array.from({ length: 7 }, (_, index) => ({
    id: `card-${index + 1}`,
    sequenceNo: index + 1,
    status: "active" as const,
    stampsCount: 0,
    title: null,
    description: null,
    rewardTitle: null,
    rewardDescription: null,
    rewardTerms: null,
    pendingCount: 0,
    hasPendingRequest: false,
    latestApprovedCount: 0,
    latestEventId: null,
    ...overrides[index + 1],
  }));
}

describe("applyOptimisticGrant", () => {
  it("adds stamps to the granted card and clears only its pending request", () => {
    const cards = makeCards({
      3: { stampsCount: 1, pendingCount: 2, hasPendingRequest: true },
      5: { pendingCount: 1, hasPendingRequest: true },
    });

    const next = applyOptimisticGrant(cards, { eventId: "e1", memberCardId: "card-3", quantity: 2 });

    expect(next[2]).toMatchObject({
      stampsCount: 3,
      status: "active",
      pendingCount: 0,
      hasPendingRequest: false,
      latestApprovedCount: 2,
      latestEventId: "e1",
    });
    expect(next[4]).toMatchObject({ pendingCount: 1, hasPendingRequest: true });
  });

  it("completes a card without opening or changing any other card", () => {
    const cards = makeCards({ 2: { stampsCount: 5, pendingCount: 1, hasPendingRequest: true } });

    const next = applyOptimisticGrant(cards, { eventId: "e1", memberCardId: "card-2", quantity: 1 });

    expect(next[1]).toMatchObject({ status: "completed", stampsCount: 6 });
    expect(next.filter((card) => card.id !== "card-2").every((card) => card.status === "active")).toBe(true);
    expect(next[2].stampsCount).toBe(0);
  });

  it("completing Card 7 first keeps the cards that are still unfinished", () => {
    const cards = makeCards({ 1: { status: "completed", stampsCount: 6 }, 7: { stampsCount: 5 } });

    const next = applyOptimisticGrant(cards, { eventId: "e1", memberCardId: "card-7", quantity: 1 });

    expect(next[6]).toMatchObject({ status: "completed", stampsCount: 6 });
    expect(next[0]).toMatchObject({ status: "completed", stampsCount: 6 });
  });

  it("restarts the cycle when the last unfinished card is completed", () => {
    const cards = makeCards(
      Object.fromEntries(
        [1, 2, 3, 4, 5, 7].map((n) => [n, { status: "completed" as const, stampsCount: 6 }]),
      ),
    );
    cards[5] = { ...cards[5], stampsCount: 4, pendingCount: 2, hasPendingRequest: true };

    const next = applyOptimisticGrant(cards, { eventId: "e9", memberCardId: "card-6", quantity: 2 });

    expect(next.every((card) => card.status === "active" && card.stampsCount === 0)).toBe(true);
    expect(next[5]).toMatchObject({ latestApprovedCount: 2, latestEventId: "e9" });
    expect(next[0]).toMatchObject({ latestApprovedCount: 0, latestEventId: null });
  });

  it("ignores a grant that was already applied", () => {
    const cards = makeCards({ 4: { stampsCount: 2, latestEventId: "e1" } });
    expect(applyOptimisticGrant(cards, { eventId: "e1", memberCardId: "card-4", quantity: 1 })).toBe(cards);
  });

  it("ignores grants for unknown or already completed cards", () => {
    const cards = makeCards({ 1: { status: "completed", stampsCount: 6 } });
    expect(applyOptimisticGrant(cards, { eventId: "e1", memberCardId: "missing", quantity: 1 })).toBe(cards);
    expect(applyOptimisticGrant(cards, { eventId: "e2", memberCardId: "card-1", quantity: 1 })).toBe(cards);
  });

  it("highlights only the newest grant across cards", () => {
    const cards = makeCards({ 1: { stampsCount: 2, latestApprovedCount: 2, latestEventId: "e1" } });

    const next = applyOptimisticGrant(cards, { eventId: "e2", memberCardId: "card-2", quantity: 1 });

    expect(next[0]).toMatchObject({ stampsCount: 2, latestApprovedCount: 0, latestEventId: "e1" });
    expect(next[1]).toMatchObject({ stampsCount: 1, latestApprovedCount: 1, latestEventId: "e2" });
  });
});

describe("applyOptimisticGrants", () => {
  const grants = [
    { eventId: "e1", memberCardId: "card-1", quantity: 2 },
    { eventId: "e2", memberCardId: "card-2", quantity: 3 },
  ];

  it("applies grants the server has not reported yet", () => {
    const next = applyOptimisticGrants(makeCards(), grants);
    expect(next[0].stampsCount).toBe(2);
    expect(next[1].stampsCount).toBe(3);
  });

  it("does not double count a grant on one card once another card has a newer grant", () => {
    // The server already includes both grants, and each card reports its own latest event.
    const server = makeCards({
      1: { stampsCount: 2, latestEventId: "e1" },
      2: { stampsCount: 3, latestEventId: "e2", latestApprovedCount: 3 },
    });

    const next = applyOptimisticGrants(server, grants);

    expect(next[0].stampsCount).toBe(2);
    expect(next[1].stampsCount).toBe(3);
  });

  it("applies only the grants that arrived after the server snapshot", () => {
    const server = makeCards({ 1: { stampsCount: 2, latestEventId: "e1" } });

    const next = applyOptimisticGrants(server, grants);

    expect(next[0].stampsCount).toBe(2);
    expect(next[1].stampsCount).toBe(3);
  });
});
