import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MyLoyaltyState = {
  profile: {
    id: string;
    full_name: string;
    email: string | null;
    whatsapp: string | null;
    role: string;
    marketing_consent: boolean;
    marketing_consent_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  program: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    total_cards: number;
    stamps_per_card: number;
    is_active: boolean;
  } | null;
  member_program: {
    id: string;
    program_id: string;
    user_id: string;
    status: string;
    joined_at: string;
    completed_at: string | null;
  } | null;
  cards: Array<{
    id: string;
    member_program_id: string;
    card_definition_id: string;
    sequence_no: number;
    status: string;
    stamps_count: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    definition: {
      id: string;
      title: string | null;
      description: string | null;
      reward_title: string | null;
      reward_description: string | null;
      reward_terms: string | null;
      reward_expiry_days: number | null;
      is_active: boolean;
    };
    pending_request: {
      id: string;
      requested_count: number;
      customer_note: string | null;
      requested_at: string;
    } | null;
    reward: {
      id: string;
      status: string;
      available_at: string | null;
      expires_at: string | null;
      redeemed_at: string | null;
      note: string | null;
    } | null;
  }>;
  requests: Array<{
    id: string;
    member_card_id: string;
    requested_count: number;
    approved_count: number | null;
    status: string;
    customer_note: string | null;
    admin_note: string | null;
    requested_at: string;
    reviewed_at: string | null;
    card_sequence_no: number;
  }>;
  stamp_events: Array<{
    id: string;
    member_card_id: string;
    stamp_request_id: string | null;
    event_type: string;
    quantity: number;
    reason: string | null;
    created_at: string;
    card_sequence_no: number;
  }>;
  rewards: Array<{
    id: string;
    member_card_id: string;
    status: string;
    available_at: string;
    expires_at: string | null;
    redeemed_at: string | null;
    note: string | null;
    card_sequence_no: number;
    reward_title: string | null;
    reward_description: string | null;
    reward_terms: string | null;
    reward_expiry_days: number | null;
  }>;
};

export const getMyLoyaltyState = cache(async (): Promise<MyLoyaltyState> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_loyalty_state", {
    p_program_slug: "kira-kira-michi-loyalty",
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[loyalty:state]", error?.message ?? "invalid aggregate response");
    throw new Error("LOYALTY_DATA_UNAVAILABLE");
  }

  return data as unknown as MyLoyaltyState;
});
