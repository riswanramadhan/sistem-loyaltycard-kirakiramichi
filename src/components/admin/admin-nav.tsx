"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  ContactRound,
  Kanban,
  LogOut,
  PanelTopDashed,
  PanelsTopLeft,
  QrCode,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { adminSignOutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "Ringkasan", icon: PanelTopDashed, exact: true },
  { href: "/admin/requests", label: "Request", icon: Kanban },
  { href: "/admin/customers", label: "Customer", icon: ContactRound },
  { href: "/admin/program", label: "Program", icon: SlidersHorizontal },
  { href: "/admin/qr", label: "QR", icon: QrCode },
  { href: "/admin/audit", label: "Audit", icon: BookOpenCheck },
  { href: "/admin/admins", label: "Akun admin", icon: UsersRound },
];

const mobileNavigation = [
  { href: "/admin", label: "Home", icon: PanelTopDashed, exact: true },
  { href: "/admin/requests", label: "Request", icon: Kanban },
  { href: "/admin/customers", label: "Customer", icon: ContactRound },
  { href: "/admin/program", label: "Program", icon: SlidersHorizontal },
  { href: "/admin/more", label: "Lainnya", icon: PanelsTopLeft },
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

function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi admin mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/90 bg-white/95 px-2 pt-2 shadow-[0_-10px_30px_rgba(43,39,40,0.08)] backdrop-blur lg:hidden print:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {mobileNavigation.map(({ href, label, icon: Icon, exact }) => {
          const active = href === "/admin/more"
            ? ["/admin/more", "/admin/qr", "/admin/audit", "/admin/admins"].some((path) => isCurrent(pathname, path))
            : isCurrent(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                active
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon className={cn("size-5 shrink-0", active && "stroke-[2.5]")} aria-hidden="true" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
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
      </header>
      <MobileBottomNavigation />
    </>
  );
}
