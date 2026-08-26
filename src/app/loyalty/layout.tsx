import type { ReactNode } from "react";
import { CustomerShell } from "@/components/loyalty/customer-shell";
import { requireUser } from "@/lib/auth";

export default async function LoyaltyLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <CustomerShell userId={user.id}>
      {children}
    </CustomerShell>
  );
}
