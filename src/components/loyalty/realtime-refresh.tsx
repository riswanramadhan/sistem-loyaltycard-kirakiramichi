"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { BadgeJapaneseYen, CloudRainWind, PartyPopper, Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ToastKind = "approved" | "rejected" | "completed" | "reward";

const feedback = {
  approved: { title: "Yatta! Stamp disetujui", copy: "Cap barumu sudah masuk. Ii kanji!", priority: 2 },
  rejected: { title: "Zannen... stamp ditolak", copy: "Belum lolos kali ini. Cek riwayat atau hubungi admin, ya.", priority: 2 },
  completed: { title: "Sugoi! Card kamu full", copy: "Reward baru terbuka. Omedetou!", priority: 3 },
  reward: { title: "Reward baru terbuka", copy: "Cek detailnya sebelum masa berlaku habis.", priority: 1 },
};

function launchCelebration() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ed2024", "#ffcc00", "#2b2728", "#ffffff"];
  confetti({ particleCount: 90, spread: 72, startVelocity: 40, origin: { y: 0.7 }, colors });
  window.setTimeout(() => {
    confetti({ particleCount: 45, angle: 60, spread: 55, origin: { x: 0, y: 0.58 }, colors });
    confetti({ particleCount: 45, angle: 120, spread: 55, origin: { x: 1, y: 0.58 }, colors });
  }, 180);
}

export function RealtimeRefresh({
  userId,
  memberCardIds,
}: {
  userId: string;
  memberCardIds: string[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastKind | null>(null);
  const hideTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const activePriority = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`my-loyalty-${userId}`);

    const refresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 120);
    };

    const announce = (kind: ToastKind) => {
      if (feedback[kind].priority < activePriority.current) {
        refresh();
        return;
      }

      activePriority.current = feedback[kind].priority;
      setToast(kind);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        activePriority.current = 0;
        setToast(null);
      }, 5000);

      // Realtime is only a nudge. Server Components re-read the RLS-protected rows.
      refresh();
    };

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "stamp_requests",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const next = payload.new as { status?: string };
        if (next.status === "approved") announce("approved");
        else if (next.status === "rejected") announce("rejected");
        else refresh();
      },
    );

    if (memberCardIds.length > 0) {
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "member_cards",
          filter: `id=in.(${memberCardIds.join(",")})`,
        },
        (payload) => {
          const previous = payload.old as { status?: string; stamps_count?: number };
          const next = payload.new as { status?: string; stamps_count?: number };
          const justCompleted =
            (previous.status !== "completed" && next.status === "completed") ||
            ((previous.stamps_count ?? 0) < 8 && (next.stamps_count ?? 0) >= 8);

          if (justCompleted) {
            launchCelebration();
            announce("completed");
          } else {
            refresh();
          }
        },
      );
    }

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reward_redemptions",
          filter: `user_id=eq.${userId}`,
        },
        () => announce("reward"),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reward_redemptions",
          filter: `user_id=eq.${userId}`,
        },
        () => announce("reward"),
      )
      .subscribe();

    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [memberCardIds, router, userId]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex justify-center sm:top-5"
    >
      {toast ? (
        <div
          role="status"
          className={cn(
            "animate-rise flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-sm text-ink shadow-[0_14px_40px_rgba(43,39,40,0.16)]",
            toast === "rejected" ? "border-danger/25" : "border-success/25",
          )}
        >
          <span className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            toast === "rejected" ? "animate-sad-drift bg-danger-soft text-danger" : "animate-happy-bounce bg-warning-soft text-warning",
          )}>
            {toast === "rejected" ? <CloudRainWind className="size-5" aria-hidden="true" /> : toast === "completed" ? <PartyPopper className="size-5" aria-hidden="true" /> : toast === "reward" ? <BadgeJapaneseYen className="size-5" aria-hidden="true" /> : <Stamp className="size-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0"><strong className="block font-extrabold">{feedback[toast].title}</strong><span className="mt-0.5 block text-xs leading-5 text-ink-muted">{feedback[toast].copy}</span></span>
        </div>
      ) : null}
    </div>
  );
}
