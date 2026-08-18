import type { ReactNode } from "react";
import { CustomerShell } from "@/components/loyalty/customer-shell";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type MembershipIdRow = { id: string };
type MemberCardIdRow = { id: string };

export default async function LoyaltyLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membershipRows } = await supabase
    .from("member_programs")
    .select("id")
    .eq("user_id", user.id);

  const membershipIds = ((membershipRows ?? []) as MembershipIdRow[]).map((row) => row.id);
  let memberCardIds: string[] = [];

  if (membershipIds.length > 0) {
    const { data: cardRows } = await supabase
      .from("member_cards")
      .select("id")
      .in("member_program_id", membershipIds);
    memberCardIds = ((cardRows ?? []) as MemberCardIdRow[]).map((row) => row.id);
  }

  return (
    <CustomerShell userId={user.id} memberCardIds={memberCardIds}>
      {children}
    </CustomerShell>
  );
}

