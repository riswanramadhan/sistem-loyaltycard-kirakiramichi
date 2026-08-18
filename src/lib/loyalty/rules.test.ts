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
  it("creates exactly six cards with only Card 1 active", () => {
    const cards = createInitialJourney();
    expect(cards).toHaveLength(6);
    expect(cards[0]).toEqual({ sequenceNo: 1, status: "active", stampsCount: 0 });
    expect(cards.slice(1).every((card) => card.status === "locked")).toBe(true);
  });

  it("is deterministic when initialization is requested repeatedly", () => {
    expect(createInitialJourney()).toEqual(createInitialJourney());
  });
});

describe("stamp requests", () => {
  it.each([1, 2])("allows a +%i request on an active card", (requestedCount) => {
    expect(
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 4,
        requestedCount,
        hasPendingRequest: false,
      }),
    ).toBe(true);
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 0,
        requestedCount: 3,
        hasPendingRequest: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_COUNT" }));
  });

  it("blocks +2 when only one slot remains", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 7,
        requestedCount: 2,
        hasPendingRequest: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "CAPACITY_EXCEEDED" }));
  });

  it("blocks a second unresolved request", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "active",
        stampsCount: 2,
        requestedCount: 1,
        hasPendingRequest: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "PENDING_EXISTS" }));
  });

  it("blocks requests against locked cards", () => {
    expect(() =>
      assertValidStampRequest({
        cardStatus: "locked",
        stampsCount: 0,
        requestedCount: 1,
        hasPendingRequest: false,
      }),
    ).toThrowError(LoyaltyRuleError);
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
        sequenceNo: 1,
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
        sequenceNo: 1,
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
        sequenceNo: 1,
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
        sequenceNo: 1,
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
  it("completes a card exactly at stamp 8 and unlocks the next card", () => {
    const result = reviewRequest({
      requestStatus: "pending",
      requestedCount: 1,
      approvedCount: 1,
      cardStatus: "active",
      stampsCount: 7,
      sequenceNo: 1,
    });
    expect(result).toMatchObject({
      nextStampsCount: 8,
      cardStatus: "completed",
      rewardAvailable: true,
      unlockNextCard: true,
      programCompleted: false,
    });
  });

  it("completes the full journey after Card 6", () => {
    const result = reviewRequest({
      requestStatus: "pending",
      requestedCount: 1,
      approvedCount: 1,
      cardStatus: "active",
      stampsCount: 7,
      sequenceNo: 6,
    });
    expect(result.unlockNextCard).toBe(false);
    expect(result.programCompleted).toBe(true);
  });

  it("never permits progress over eight", () => {
    expect(() =>
      reviewRequest({
        requestStatus: "pending",
        requestedCount: 2,
        approvedCount: 2,
        cardStatus: "active",
        stampsCount: 7,
        sequenceNo: 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "CAPACITY_EXCEEDED" }));
  });
});

describe("controlled adjustments", () => {
  it("supports a grant and revoke inside bounds", () => {
    expect(applyAdjustment(3, 1)).toBe(4);
    expect(applyAdjustment(3, -1)).toBe(2);
  });

  it("blocks invalid or out-of-bounds adjustments", () => {
    expect(() => applyAdjustment(8, 1)).toThrow(LoyaltyRuleError);
    expect(() => applyAdjustment(0, -1)).toThrow(LoyaltyRuleError);
    expect(() => applyAdjustment(4, 0)).toThrow(LoyaltyRuleError);
  });
});
