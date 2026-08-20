import type { Metadata } from "next";
import { Fingerprint, KeyRound, Origami } from "lucide-react";
import { AdminAccountForm } from "@/components/admin/admin-account-form";
import { AdminPageHeader, formatAdminDate } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Akun Admin" };

type AdminAccount = {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export default async function AdminAccountsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_accounts");
  if (error) throw new Error("ADMIN_ACCOUNTS_UNAVAILABLE");
  const admins = (data ?? []) as AdminAccount[];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Access control"
        title="Akun admin"
        description="Tambah pengelola terpercaya. Link login email menjaga akses tetap personal dan mudah diaudit."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-line p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Fingerprint className="size-5 text-brand" aria-hidden="true" />
              <h2 className="font-extrabold text-ink">Admin aktif</h2>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{admins.length} akun memiliki akses workspace.</p>
          </div>
          <div className="divide-y divide-line">
            {admins.map((admin) => (
              <article key={admin.user_id} className="flex items-start gap-3 p-4 sm:p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Origami className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{admin.full_name}</p>
                  <p className="mt-1 break-all text-xs text-ink-muted">{admin.email}</p>
                  <p className="mt-2 text-xs text-ink-faint">Login terakhir: {formatAdminDate(admin.last_sign_in_at)}</p>
                </div>
                <KeyRound className="mt-1 size-4 shrink-0 text-success" aria-label="Akses admin aktif" />
              </article>
            ))}
          </div>
        </Card>
        <Card className="self-start p-4 sm:p-5">
          <h2 className="font-extrabold text-ink">Tambah admin</h2>
          <p className="mt-1 text-sm leading-6 text-ink-muted">Invite orang yang benar-benar mengelola loyalty ini.</p>
          <div className="mt-5"><AdminAccountForm /></div>
        </Card>
      </div>
    </div>
  );
}
