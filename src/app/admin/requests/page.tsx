import Link from "next/link";
import { getAdminRequests } from "@/app/admin/_lib/admin-data";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { RequestList } from "@/components/admin/request-list";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
] as const;

type RequestStatus = (typeof statuses)[number]["value"];

function normalizeStatus(value: string | string[] | undefined): RequestStatus {
  const candidate = Array.isArray(value) ? value[0] : value;
  return statuses.some((status) => status.value === candidate) ? (candidate as RequestStatus) : "pending";
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const activeStatus = normalizeStatus(params.status);
  const requests = await getAdminRequests(activeStatus);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Stamp operations"
        title="Request stamp"
        description="Setujui penuh, setujui sebagian, atau tolak request. Setiap hasil diproses atomik dan tetap dapat diaudit."
      />

      <Card className="overflow-hidden">
        <nav aria-label="Filter status request" className="flex gap-1 overflow-x-auto border-b border-line bg-surface-muted/60 p-2">
          {statuses.map((status) => {
            const active = status.value === activeStatus;
            return (
              <Link
                key={status.value}
                href={`/admin/requests?status=${status.value}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  active ? "bg-white text-brand shadow-sm" : "text-ink-muted hover:bg-white/70 hover:text-ink",
                )}
              >
                {status.label}
              </Link>
            );
          })}
        </nav>
        <RequestList
          requests={requests}
          emptyTitle={activeStatus === "pending" ? "Semua request sudah beres" : `Belum ada request ${activeStatus === "approved" ? "disetujui" : "ditolak"}`}
          emptyDescription={activeStatus === "pending" ? "Request baru akan muncul otomatis setelah halaman dimuat ulang." : "Riwayat dengan status ini akan muncul di sini."}
        />
      </Card>
      {requests.length >= 50 ? (
        <p className="text-center text-xs text-ink-muted">Menampilkan 50 request terbaru pada status ini.</p>
      ) : null}
    </div>
  );
}
