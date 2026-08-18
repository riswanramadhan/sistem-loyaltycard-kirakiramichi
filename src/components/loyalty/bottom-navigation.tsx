"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Gift, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/loyalty", label: "Home", icon: Home },
  { href: "/loyalty/rewards", label: "Rewards", icon: Gift },
  { href: "/loyalty/history", label: "History", icon: Clock3 },
  { href: "/loyalty/profile", label: "Profile", icon: UserRound },
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/loyalty" ? pathname === href : pathname.startsWith(href);
}

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi loyalty"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/90 bg-white/95 px-3 pt-2 shadow-[0_-10px_30px_rgba(43,39,40,0.08)] backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isCurrent(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none",
                active
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform motion-reduce:transform-none motion-reduce:transition-none",
                  active ? "stroke-[2.5]" : "group-hover:-translate-y-0.5",
                )}
                aria-hidden="true"
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

