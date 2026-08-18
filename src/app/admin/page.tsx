import Link from "next/link";
import { CheckCheck, ClipboardClock, Gift, Layers3, Users } from "lucide-react";
import { getAdminMetrics, getAdminRequests } from "@/app/admin/_lib/admin-data";
import { AdminPageHeader, MetricCard } from "@/components/admin/admin-ui";
import { RequestList } from "@/components/admin/request-list";
import { Card } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const [metrics, pendingRequests] = await Promise.all([getAdminMetrics(), getAdminRequests("pending", 8)]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operasional hari ini"
        title="Ringkasan admin"
        description="Review request terbaru, pantau progres member, dan selesaikan pekerjaan utama dari satu tempat."
        actions={
          <Link
            href="/admin/requests"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-[0_4px_0_#b9151a] transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Buka semua request
          </Link>
        }
      />

      <section aria-label="Metrik program" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard label="Total member" value={metrics.totalMembers} hint="Member terdaftar" icon={<Users className="size-5" />} />
        <MetricCard label="Pending request" value={metrics.pendingRequests} hint="Perlu direview" icon={<ClipboardClock className="size-5" />} tone="warning" />
        <MetricCard label="Disetujui hari ini" value={metrics.approvedToday} hint="Jumlah request" icon={<CheckCheck className="size-5" />} tone="brand" />
        <MetricCard label="Card selesai" value={metrics.completedCards} hint="Sepanjang program" icon={<Layers3 className="size-5" />} tone="success" />
        <MetricCard label="Reward ditebus" value={metrics.rewardsRedeemed} hint="Sepanjang program" icon={<Gift className="size-5" />} tone="success" />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-extrabold text-ink">Pending stamp requests</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Request terbaru tampil lebih dulu.</p>
          </div>
          <Link href="/admin/requests?status=pending" className="text-sm font-bold text-brand hover:text-brand-strong hover:underline">
            Lihat inbox lengkap
          </Link>
        </div>
        <RequestList
          requests={pendingRequests}
          emptyTitle="Semua request sudah beres"
          emptyDescription="Tidak ada stamp request yang menunggu review saat ini."
        />
      </Card>
    </div>
  );
}
