"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ExternalLink,
  Gauge,
  LogOut,
  QrCode,
  ScrollText,
  Settings2,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { adminSignOutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "Ringkasan", icon: Gauge, exact: true },
  { href: "/admin/requests", label: "Request", icon: ClipboardList },
  { href: "/admin/customers", label: "Customer", icon: Users },
  { href: "/admin/program", label: "Program", icon: Settings2 },
  { href: "/admin/qr", label: "QR", icon: QrCode },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
];

function isCurrent(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return navigation.map(({ href, label, icon: Icon, exact }) => {
    const active = isCurrent(pathname, href, exact);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-xl text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          compact ? "min-h-10 px-3" : "min-h-11 px-3.5",
          active ? "bg-brand text-white shadow-sm" : "text-ink-muted hover:bg-brand-soft hover:text-brand-strong",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  });
}

export function AdminNav({ adminName }: { adminName: string }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white px-4 py-5 lg:flex print:hidden">
        <Link href="/admin" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <BrandLogo priority className="h-11 w-36" />
          <span className="sr-only">Admin Kira Kira Michi</span>
        </Link>

        <div className="mt-6 rounded-xl bg-surface-muted px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">Admin workspace</p>
          <p className="mt-1 truncate text-sm font-bold text-ink" title={adminName}>{adminName}</p>
        </div>

        <nav aria-label="Navigasi admin" className="mt-4 grid gap-1">
          <NavigationLinks />
        </nav>

        <div className="mt-auto grid gap-1 border-t border-line pt-4">
          <Link href="/loyalty" className="flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-bold text-ink-muted hover:bg-surface-muted hover:text-ink">
            <ExternalLink className="size-4" aria-hidden="true" />
            Lihat aplikasi customer
          </Link>
          <form action={adminSignOutAction}>
            <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3.5 text-sm font-bold text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">
              <LogOut className="size-4" aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur lg:hidden print:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/admin" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <BrandLogo priority className="h-9 w-28" />
            <span className="sr-only">Admin Kira Kira Michi</span>
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            <span className="max-w-28 truncate text-xs font-bold text-ink-muted">{adminName}</span>
            <form action={adminSignOutAction}>
              <button type="submit" aria-label="Keluar dari akun admin" className="grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Navigasi admin" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavigationLinks compact />
        </nav>
      </header>
    </>
  );
}
