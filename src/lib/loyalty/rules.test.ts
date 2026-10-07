import { describe, expect, it } from "vitest";
import {
  LoyaltyRuleError,
  applyAdjustment,
  assertValidStampRequest,
  createInitialJourney,
  rejectRequest,
  reviewRequest,
} from "./rules";

describe("loyalty membership initialization", () => {
  it("creates exactly seven cards and opens every one of them", () => {
    const cards = createInitialJourney();
    expect(cards).toHaveLength(7);
    expect(cards.every((card) => card.status === "active" && card.stampsCount === 0)).toBe(true);
    expect(cards.map((card) => card.sequenceNo)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("is deterministic when initialization is requested repeatedly", () => {
    expect(createInitialJourney()).toEqual(createInitialJourney());
  });
});

describe("stamp requests", () => {
  it.each([1, 2, 3, 4, 5, 6])("allows a +%i request on an active card", (requestedCount) => {
    expect(
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 0,
        requestedCount,
        hasPendingRequest: false,
      }),
    ).toBe(true);
  });

  it("lets the highest card be requested without any other card being completed", () => {
    const cards = createInitialJourney();
    const card7 = cards[6];
    expect(
      assertValidStampRequest({
        cardStatus: card7.status,
        stampsCount: card7.stampsCount,
        requestedCount: 3,
        hasPendingRequest: false,
      }),
    ).toBe(true);
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 0,
        requestedCount: 7,
        hasPendingRequest: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_COUNT" }));
  });

  it("blocks +2 when only one slot remains", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 5,
        requestedCount: 2,
        hasPendingRequest: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "CAPACITY_EXCEEDED" }));
  });

  it("blocks a second unresolved request on the same card", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 2,
        requestedCount: 1,
        hasPendingRequest: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "PENDING_EXISTS" }));
  });

  it("blocks requests against completed cards", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "completed",
        stampsCount: 6,
        requestedCount: 1,
        hasPendingRequest: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "CARD_NOT_ACTIVE" }));
  });
});

describe("admin review", () => {
  it("approves the requested quantity", () => {
    expect(
      reviewRequest({
        requestStatus: "pending",
        requestedCount: 2,
        approvedCount: 2,
        cardStatus: "active",
        stampsCount: 4,
        allOtherCardsCompleted: false,
      }).nextStampsCount,
    ).toBe(6);
  });

  it("supports partial approval", () => {
    expect(
      reviewRequest({
        requestStatus: "pending",
        requestedCount: 2,
        approvedCount: 1,
        cardStatus: "active",
        stampsCount: 4,
        allOtherCardsCompleted: false,
      }).nextStampsCount,
    ).toBe(5);
  });

  it("rejects approval larger than requested", () => {
    expect(() =>
      reviewRequest({
        requestStatus: "pending",
        requestedCount: 1,
        approvedCount: 2,
        cardStatus: "active",
        stampsCount: 2,
        allOtherCardsCompleted: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_APPROVAL" }));
  });

  it("prevents approval twice", () => {
    expect(() =>
      reviewRequest({
        requestStatus: "approved",
        requestedCount: 1,
        approvedCount: 1,
        cardStatus: "active",
        stampsCount: 2,
        allOtherCardsCompleted: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "ALREADY_REVIEWED" }));
  });

  it("rejects a pending request without changing stamps", () => {
    expect(rejectRequest("pending")).toEqual({ requestStatus: "rejected", stampDelta: 0 });
  });

  it("prevents rejecting an already-reviewed request", () => {
    expect(() => rejectRequest("rejected")).toThrowError(
      expect.objectContaining({ code: "ALREADY_REVIEWED" }),
    );
  });
});

describe("progression", () => {
  it("completes a card exactly at stamp 6 and issues its reward without touching other cards", () => {
    const result = reviewRequest({
      requestStatus: "pending",
      requestedCount: 1,
      approvedCount: 1,
      cardStatus: "active",
      stampsCount: 5,
      allOtherCardsCompleted: false,
    });
    expect(result).toMatchObject({
      nextStampsCount: 6,
      cardStatus: "completed",
      rewardAvailable: true,
      cycleCompleted: false,
      programCompleted: false,
    });
    expect(result).not.toHaveProperty("unlockNextCard");
  });

  it("completing Card 7 first does not end the cycle while other cards are unfinished", () => {
    const result = reviewRequest({
      requestStatus: "pending",
      requestedCount: 1,
      approvedCount: 1,
      cardStatus: "active",
      stampsCount: 5,
      allOtherCardsCompleted: false,
    });
    expect(result.cardStatus).toBe("completed");
    expect(result.rewardAvailable).toBe(true);
    expect(result.cycleCompleted).toBe(false);
  });

  it("completes the cycle with whichever card is finished last", () => {
    const result = reviewRequest({
      requestStatus: "pending",
      requestedCount: 1,
      approvedCount: 1,
      cardStatus: "active",
      stampsCount: 5,
      allOtherCardsCompleted: true,
    });
    expect(result.cycleCompleted).toBe(true);
    expect(result.programCompleted).toBe(false);
  });

  it("does not complete the cycle on a partial approval even if other cards are complete", () => {
    const result = reviewRequest({
      requestStatus: "pending",
      requestedCount: 2,
      approvedCount: 1,
      cardStatus: "active",
      stampsCount: 3,
      allOtherCardsCompleted: true,
    });
    expect(result.cardStatus).toBe("active");
    expect(result.cycleCompleted).toBe(false);
  });

  it("never permits progress over six", () => {
    expect(() =>
      reviewRequest({
        requestStatus: "pending",
        requestedCount: 2,
        approvedCount: 2,
        cardStatus: "active",
        stampsCount: 5,
        allOtherCardsCompleted: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "CAPACITY_EXCEEDED" }));
  });

  it("refuses to approve stamps on a card that is already completed", () => {
    expect(() =>
      reviewRequest({
        requestStatus: "pending",
        requestedCount: 1,
        approvedCount: 1,
        cardStatus: "completed",
        stampsCount: 6,
        allOtherCardsCompleted: false,
      }),
    ).toThrowError(LoyaltyRuleError);
  });
});

describe("controlled adjustments", () => {
  it("supports a grant and revoke inside bounds", () => {
    expect(applyAdjustment(3, 1)).toBe(4);
    expect(applyAdjustment(3, -1)).toBe(2);
  });

  it("blocks invalid or out-of-bounds adjustments", () => {
    expect(() => applyAdjustment(6, 1)).toThrow(LoyaltyRuleError);
    expect(() => applyAdjustment(0, -1)).toThrow(LoyaltyRuleError);
    expect(() => applyAdjustment(4, 0)).toThrow(LoyaltyRuleError);
  });
});
