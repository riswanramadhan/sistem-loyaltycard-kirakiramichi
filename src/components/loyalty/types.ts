export type LoyaltyCardStatus = "locked" | "active" | "completed";

export type LoyaltyCardView = {
  id: string;
  sequenceNo: number;
  status: LoyaltyCardStatus;
  stampsCount: number;
  title: string | null;
  description: string | null;
  rewardTitle: string | null;
  rewardDescription: string | null;
  rewardTerms: string | null;
  pendingCount: number;
  hasPendingRequest: boolean;
  latestApprovedCount: number;
};

export type RewardStatus = "available" | "redeemed" | "expired";

export type RewardView = {
  id: string | null;
  memberCardId: string;
  sequenceNo: number;
  title: string | null;
  description: string | null;
  terms: string | null;
  status: RewardStatus | "locked";
  availableAt: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
};
