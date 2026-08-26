import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { BottomNavigation } from "@/components/loyalty/bottom-navigation";
import { RealtimeRefresh } from "@/components/loyalty/realtime-refresh";
import { CustomerSupport } from "@/components/loyalty/customer-support";

export function CustomerShell({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  return (
    <div className="min-h-svh pb-24">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[80] -translate-y-24 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white transition focus:translate-y-0 motion-reduce:transition-none"
      >
        Lewati ke konten
      </a>

      <header className="border-b border-line/80 bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <BrandLogo className="h-10 w-36" priority />
          <span className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">
            Loyalty Club
          </span>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 py-6 outline-none sm:px-6 sm:py-8"
      >
        {children}
      </main>

      <CustomerSupport />

      <BottomNavigation />
      <RealtimeRefresh userId={userId} />
    </div>
  );
}
