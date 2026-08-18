import Link from "next/link";
import { LockKeyhole, Search } from "lucide-react";
import { getAuditEvents } from "@/app/admin/_lib/admin-data";
import { AdminPageHeader, EmptyAdminState, formatAdminDate } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const eventFilters = [
  { value: "all", label: "Semua" },
  { value: "grant", label: "Grant" },
  { value: "revoke", label: "Revoke" },
] as const;

function quantityLabel(type: string, quantity: number) {
  const amount = Math.abs(quantity);
  return type === "revoke" || quantity < 0 ? `−${amount}` : `+${amount}`;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const typeValue = Array.isArray(params.type) ? params.type[0] : params.type;
  const activeType = eventFilters.some((filter) => filter.value === typeValue) ? typeValue! : "all";
  const queryValue = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (queryValue ?? "").trim().slice(0, 100);
  const normalizedQuery = query.toLocaleLowerCase("id-ID");
  const allEvents = await getAuditEvents();
  const events = allEvents.filter((event) => {
    if (activeType !== "all" && event.event_type !== activeType) return false;
    if (!normalizedQuery) return true;
    return [event.customerName, event.actorName, event.reason, event.id, event.stamp_request_id]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase("id-ID").includes(normalizedQuery));
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Immutable records"
        title="Stamp audit ledger"
        description="Setiap stamp yang diberikan atau dicabut tersimpan sebagai event terpisah. Ledger ini hanya dapat dibaca dari admin UI."
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success-soft px-3 py-2.5 text-xs leading-5 text-success">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Event tidak dapat diedit atau dihapus. Koreksi selalu membuat event baru agar jejak perubahan tetap utuh.
          </div>
          <form role="search" className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="type" value={activeType} />
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Cari ledger</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input name="q" type="search" defaultValue={query} maxLength={100} placeholder="Cari customer, admin, alasan, atau ID" className="min-h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm outline-none placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/15" />
            </label>
            <button type="submit" className="min-h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Cari</button>
          </form>
          <nav aria-label="Filter tipe event" className="mt-3 flex flex-wrap gap-1">
            {eventFilters.map((filter) => {
              const active = filter.value === activeType;
              const href = `/admin/audit?type=${filter.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
              return (
                <Link key={filter.value} href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-9 items-center rounded-xl px-3 text-xs font-bold", active ? "bg-ink text-white" : "bg-surface-muted text-ink-muted hover:text-ink")}>
                  {filter.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-3 text-xs text-ink-muted">{events.length} event ditampilkan{allEvents.length >= 250 ? " dari 250 event terbaru" : ""}.</p>
        </div>

        {!events.length ? (
          <EmptyAdminState title="Event tidak ditemukan" description="Ubah filter atau kata pencarian untuk melihat ledger lain." />
        ) : (
          <>
            <ol className="divide-y divide-line md:hidden">
              {events.map((event) => (
                <li key={event.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold", event.event_type === "revoke" || event.quantity < 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>{quantityLabel(event.event_type, event.quantity)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/admin/customers/${event.user_id}`} className="font-extrabold text-ink hover:text-brand hover:underline">{event.customerName}</Link><Badge tone={event.event_type === "revoke" ? "danger" : "success"}>{event.event_type}</Badge></div>
                      <p className="mt-1 text-xs text-ink-muted">Card {event.cardSequence} · {formatAdminDate(event.created_at)}</p>
                      <p className="mt-2 text-xs leading-5 text-ink-muted">oleh {event.actorName}{event.reason ? ` · ${event.reason}` : ""}</p>
                      <p className="mt-1 truncate font-mono text-[10px] text-ink-faint">{event.id}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead><tr className="border-b border-line bg-surface-muted/70 text-xs uppercase tracking-wide text-ink-muted"><th scope="col" className="px-4 py-3 font-extrabold">Waktu</th><th scope="col" className="px-4 py-3 font-extrabold">Customer</th><th scope="col" className="px-4 py-3 font-extrabold">Event</th><th scope="col" className="px-4 py-3 font-extrabold">Kartu</th><th scope="col" className="px-4 py-3 font-extrabold">Pelaksana & alasan</th><th scope="col" className="px-4 py-3 font-extrabold">Reference</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {events.map((event) => (
                    <tr key={event.id} className="align-top hover:bg-surface-muted/40">
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-ink-muted">{formatAdminDate(event.created_at)}</td>
                      <td className="px-4 py-4"><Link href={`/admin/customers/${event.user_id}`} className="font-extrabold text-ink hover:text-brand hover:underline">{event.customerName}</Link></td>
                      <td className="px-4 py-4"><span className={cn("inline-flex min-w-10 justify-center rounded-lg px-2 py-1 font-extrabold", event.event_type === "revoke" || event.quantity < 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>{quantityLabel(event.event_type, event.quantity)}</span><p className="mt-1 text-xs text-ink-muted">{event.event_type}</p></td>
                      <td className="px-4 py-4"><p className="font-bold">Card {event.cardSequence}</p><p className="mt-1 max-w-40 text-xs text-ink-muted">{event.cardTitle}</p></td>
                      <td className="px-4 py-4"><p className="font-bold">{event.actorName}</p><p className="mt-1 max-w-64 text-xs leading-5 text-ink-muted">{event.reason || "Tanpa catatan"}</p></td>
                      <td className="px-4 py-4"><p className="max-w-44 truncate font-mono text-[10px] text-ink-faint" title={event.id}>{event.id}</p>{event.stamp_request_id ? <p className="mt-1 max-w-44 truncate font-mono text-[10px] text-ink-faint" title={event.stamp_request_id}>Req {event.stamp_request_id}</p> : null}</td>
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
