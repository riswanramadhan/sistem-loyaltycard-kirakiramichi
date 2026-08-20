import Link from "next/link";
import { ArrowRight, BookOpenCheck, QrCode, SlidersHorizontal, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";

const links = [
  { href: "/admin/program", label: "Program & reward", copy: "Atur copy kartu, reward, dan status program.", icon: SlidersHorizontal },
  { href: "/admin/qr", label: "QR loyalty", copy: "Tampilkan atau unduh QR untuk customer.", icon: QrCode },
  { href: "/admin/audit", label: "Audit stamp", copy: "Lihat ledger perubahan stamp.", icon: BookOpenCheck },
  { href: "/admin/admins", label: "Akun admin", copy: "Tambah admin baru dengan link login email.", icon: UsersRound },
];

export default function AdminMorePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Workspace" title="Menu lainnya" description="Tools operasional Kira Kira Michi dalam satu tempat." />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(({ href, label, copy, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex h-full items-start gap-3 p-4 transition hover:border-brand/35 hover:bg-brand-soft/20">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-brand"><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1"><h2 className="font-extrabold text-ink">{label}</h2><p className="mt-1 text-sm leading-6 text-ink-muted">{copy}</p></div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-ink-faint" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
