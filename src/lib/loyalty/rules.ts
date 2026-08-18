export const TOTAL_CARDS = 6;
export const STAMPS_PER_CARD = 8;
export const REQUEST_COUNTS = [1, 2] as const;

export type CardStatus = "locked" | "active" | "completed";
export type RequestStatus = "pending" | "approved" | "rejected";

export class LoyaltyRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "LoyaltyRuleError";
  }
}

export function createInitialJourney() {
  return Array.from({ length: TOTAL_CARDS }, (_, index) => ({
    sequenceNo: index + 1,
    status: (index === 0 ? "active" : "locked") as CardStatus,
    stampsCount: 0,
  }));
}

export function remainingStamps(stampsCount: number) {
  return Math.max(0, STAMPS_PER_CARD - stampsCount);
}

export function assertValidStampRequest(input: {
  cardStatus: CardStatus;
  stampsCount: number;
  requestedCount: number;
  hasPendingRequest: boolean;
}) {
  if (input.cardStatus !== "active") {
    throw new LoyaltyRuleError("CARD_NOT_ACTIVE", "Card ini belum aktif.");
  }
  if (!REQUEST_COUNTS.includes(input.requestedCount as 1 | 2)) {
    throw new LoyaltyRuleError("INVALID_COUNT", "Jumlah request harus 1 atau 2 stamp.");
  }
  if (input.hasPendingRequest) {
    throw new LoyaltyRuleError("PENDING_EXISTS", "Masih ada request yang sedang diperiksa.");
  }
  if (input.requestedCount > remainingStamps(input.stampsCount)) {
    throw new LoyaltyRuleError("CAPACITY_EXCEEDED", "Jumlah stamp melebihi slot yang tersisa.");
  }

  return true;
}

export function reviewRequest(input: {
  requestStatus: RequestStatus;
  requestedCount: number;
  approvedCount: number;
  cardStatus: CardStatus;
  stampsCount: number;
  sequenceNo: number;
}) {
  if (input.requestStatus !== "pending") {
    throw new LoyaltyRuleError("ALREADY_REVIEWED", "Request ini sudah ditinjau.");
  }
  if (input.cardStatus !== "active") {
    throw new LoyaltyRuleError("CARD_NOT_ACTIVE", "Card ini sudah tidak aktif.");
  }
  if (input.approvedCount < 1 || input.approvedCount > input.requestedCount) {
    throw new LoyaltyRuleError(
      "INVALID_APPROVAL",
      "Jumlah approval harus di antara 1 dan jumlah yang diminta.",
    );
  }
  const nextStampsCount = input.stampsCount + input.approvedCount;
  if (nextStampsCount > STAMPS_PER_CARD) {
    throw new LoyaltyRuleError("CAPACITY_EXCEEDED", "Approval melebihi kapasitas card.");
  }

  const completed = nextStampsCount === STAMPS_PER_CARD;
  return {
    nextStampsCount,
    cardStatus: (completed ? "completed" : "active") as CardStatus,
    rewardAvailable: completed,
    unlockNextCard: completed && input.sequenceNo < TOTAL_CARDS,
    programCompleted: completed && input.sequenceNo === TOTAL_CARDS,
  };
}

export function rejectRequest(requestStatus: RequestStatus) {
  if (requestStatus !== "pending") {
    throw new LoyaltyRuleError("ALREADY_REVIEWED", "Request ini sudah ditinjau.");
  }
  return { requestStatus: "rejected" as const, stampDelta: 0 };
}

export function applyAdjustment(stampsCount: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new LoyaltyRuleError("INVALID_ADJUSTMENT", "Adjustment harus berupa bilangan non-nol.");
  }
  const next = stampsCount + quantity;
  if (next < 0 || next > STAMPS_PER_CARD) {
    throw new LoyaltyRuleError("CAPACITY_EXCEEDED", "Adjustment membuat jumlah stamp tidak valid.");
  }
  return next;
}
