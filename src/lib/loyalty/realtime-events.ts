export const LOYALTY_STAMP_GRANTED_EVENT = "loyalty:stamp-granted";

export type LoyaltyStampGrantedDetail = {
  eventId: string;
  memberCardId: string;
  quantity: number;
};

