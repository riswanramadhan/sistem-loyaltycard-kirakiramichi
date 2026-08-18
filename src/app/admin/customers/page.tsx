import Link from "next/link";
import { ArrowRight, Gift, Search, UserRound } from "lucide-react";
import { getAdminCustomers } from "@/app/admin/_lib/admin-data";
import { AdminPageHeader, EmptyAdminState, formatAdminDate } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function ProgramBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge tone="success">Program selesai</Badge>;
  if (status === "active") return <Badge tone="brand">Aktif</Badge>;
  return <Badge tone="neutral">Belum bergabung</Badge>;
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const queryValue = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (queryValue ?? "").trim().slice(0, 100);
  const customers = await getAdminCustomers(query);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Member directory"
        title="Customer"
        description="Cari member, periksa kartu aktif, reward tersedia, dan aktivitas terakhir."
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line p-4 sm:p-5">
          <form role="search" className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Cari customer</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input
                name="q"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder="Cari nama, email, atau WhatsApp"
                className="min-h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15"
              />
            </label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              Cari
            </button>
            {query ? (
              <Link href="/admin/customers" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-ink-muted hover:bg-surface-muted hover:text-ink">
                Reset
              </Link>
            ) : null}
          </form>
          <p className="mt-3 text-xs text-ink-muted">
            {query ? `${customers.length} hasil untuk “${query}”` : `${customers.length} customer ditampilkan`}
          </p>
        </div>

        {!customers.length ? (
          <EmptyAdminState
            title={query ? "Customer tidak ditemukan" : "Belum ada customer"}
            description={query ? "Periksa ejaan nama, email, atau nomor WhatsApp lalu coba lagi." : "Customer muncul setelah bergabung ke program loyalty."}
            action={query ? <Link href="/admin/customers" className="text-sm font-bold text-brand hover:underline">Lihat semua customer</Link> : undefined}
          />
        ) : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {customers.map((customer) => (
                <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="rounded-2xl border border-line bg-white p-4 transition hover:border-brand/40 hover:bg-brand-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted"><UserRound className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-ink">{customer.fullName}</p>
                        <p className="mt-1 truncate text-xs text-ink-muted">{customer.whatsapp ?? customer.email ?? "Kontak belum diisi"}</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                    <div><p className="text-xs text-ink-muted">Kartu</p><p className="mt-1 font-bold">{customer.activeCardSequence ? `Card ${customer.activeCardSequence} · ${customer.activeStamps}/8` : customer.programStatus === "completed" ? "Journey selesai" : "Belum bergabung"}</p></div>
                    <div><p className="text-xs text-ink-muted">Reward tersedia</p><p className="mt-1 inline-flex items-center gap-1 font-bold"><Gift className="size-3.5 text-accent-strong" />{customer.availableRewards}</p></div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-muted/70 text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-extrabold" scope="col">Customer</th>
                    <th className="px-4 py-3 font-extrabold" scope="col">Status</th>
                    <th className="px-4 py-3 font-extrabold" scope="col">Kartu aktif</th>
                    <th className="px-4 py-3 font-extrabold" scope="col">Reward</th>
                    <th className="px-4 py-3 font-extrabold" scope="col">Aktivitas terakhir</th>
                    <th className="px-4 py-3 text-right font-extrabold" scope="col"><span className="sr-only">Buka</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-4">
                        <Link href={`/admin/customers/${customer.id}`} className="font-extrabold text-ink hover:text-brand hover:underline">{customer.fullName}</Link>
                        <p className="mt-1 text-xs text-ink-muted">{customer.whatsapp ?? "WhatsApp belum diisi"}</p>
                        {customer.email ? <p className="mt-0.5 text-xs text-ink-muted">{customer.email}</p> : null}
                      </td>
                      <td className="px-4 py-4"><ProgramBadge status={customer.programStatus} /></td>
                      <td className="px-4 py-4">
                        {customer.activeCardSequence ? (
                          <><p className="font-bold">Card {customer.activeCardSequence}</p><p className="mt-1 text-xs text-ink-muted">{customer.activeStamps}/8 stamp</p></>
                        ) : <span className="text-ink-muted">{customer.programStatus === "completed" ? "Journey selesai" : "–"}</span>}
                      </td>
                      <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 font-bold"><Gift className="size-4 text-accent-strong" aria-hidden="true" />{customer.availableRewards} tersedia</span></td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-ink-muted">{formatAdminDate(customer.lastActivityAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/admin/customers/${customer.id}`} aria-label={`Buka profil ${customer.fullName}`} className="inline-grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><ArrowRight className="size-4" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
