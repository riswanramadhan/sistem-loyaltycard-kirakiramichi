import Link from "next/link";
import { SiWhatsapp } from "react-icons/si";
import type { AdminRequestView } from "@/app/admin/_lib/admin-data";
import { Card } from "@/components/ui/card";
import { ReviewStampRequestActions } from "@/components/admin/action-controls";
import { EmptyAdminState, RequestStatusBadge, displayText, formatAdminDate } from "@/components/admin/admin-ui";

function whatsappLink(value: string | null) {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : null;
}

function CustomerIdentity({ request }: { request: AdminRequestView }) {
  const waLink = whatsappLink(request.whatsapp);
  return (
    <div className="min-w-0">
      <Link href={`/admin/customers/${request.userId}`} className="font-extrabold text-ink hover:text-brand hover:underline">
        {request.customerName}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        {waLink ? (
          <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand hover:underline">
            <SiWhatsapp className="size-3.5 text-[#25d366]" aria-hidden="true" />
            {request.whatsapp}
          </a>
        ) : (
          <span>WhatsApp belum diisi</span>
        )}
        {request.email ? <span className="truncate">{request.email}</span> : null}
      </div>
    </div>
  );
}

export function RequestList({
  requests,
  emptyTitle = "Semua request sudah beres",
  emptyDescription = "Belum ada request stamp untuk status ini.",
}: {
  requests: AdminRequestView[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!requests.length) {
    return <EmptyAdminState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {requests.map((request) => (
          <Card key={request.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <CustomerIdentity request={request} />
              <RequestStatusBadge status={request.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-3 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Request</dt>
                <dd className="mt-1 font-extrabold text-brand">+{request.requestedCount} stamp</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Kartu & progres</dt>
                <dd className="mt-1 font-bold">Card {request.cardSequence} · {request.stampsCount}/8</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-ink-muted">Dikirim</dt>
                <dd className="mt-1 font-medium">{formatAdminDate(request.requestedAt)}</dd>
              </div>
            </dl>
            {request.customerNote ? (
              <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs leading-5 text-ink-muted">
                Catatan customer: {request.customerNote}
              </p>
            ) : null}
            {request.status === "pending" ? (
              <div className="mt-4"><ReviewStampRequestActions requestId={request.id} customerId={request.userId} requestedCount={request.requestedCount} /></div>
            ) : (
              <div className="mt-3 text-xs leading-5 text-ink-muted">
                {request.status === "approved" ? `${request.approvedCount ?? 0} stamp disetujui` : "Tidak ada stamp ditambahkan"}
                {request.reviewerName ? ` oleh ${request.reviewerName}` : ""}
                {request.adminNote ? ` · ${request.adminNote}` : ""}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted/70 text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-extrabold">Customer</th>
              <th scope="col" className="px-4 py-3 font-extrabold">Request</th>
              <th scope="col" className="px-4 py-3 font-extrabold">Kartu</th>
              <th scope="col" className="px-4 py-3 font-extrabold">Waktu</th>
              <th scope="col" className="px-4 py-3 font-extrabold">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-extrabold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {requests.map((request) => (
              <tr key={request.id} className="align-top hover:bg-surface-muted/40">
                <td className="px-4 py-4"><CustomerIdentity request={request} /></td>
                <td className="px-4 py-4">
                  <strong className="text-base text-brand">+{request.requestedCount}</strong>
                  {request.customerNote ? <p className="mt-1 max-w-52 text-xs leading-5 text-ink-muted" title={request.customerNote}>{request.customerNote}</p> : null}
                </td>
                <td className="px-4 py-4">
                  <p className="font-bold">Card {request.cardSequence}</p>
                  <p className="mt-1 text-xs text-ink-muted">{request.stampsCount}/8 stamp</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-ink-muted">
                  {formatAdminDate(request.requestedAt)}
                  {request.reviewedAt ? <p className="mt-1">Review: {formatAdminDate(request.reviewedAt)}</p> : null}
                </td>
                <td className="px-4 py-4">
                  <RequestStatusBadge status={request.status} />
                  {request.adminNote ? <p className="mt-2 max-w-48 text-xs leading-5 text-ink-muted">{displayText(request.adminNote)}</p> : null}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    {request.status === "pending" ? (
                      <ReviewStampRequestActions requestId={request.id} customerId={request.userId} requestedCount={request.requestedCount} />
                    ) : (
                      <span className="text-xs text-ink-muted">{request.reviewerName ? `oleh ${request.reviewerName}` : "Sudah direview"}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
