"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { BadgeJapaneseYen, CloudRainWind, PartyPopper, Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ToastKind = "approved" | "rejected" | "completed" | "reward";
type ToastState = { kind: ToastKind; sequence: number };

const feedback = {
  approved: { title: "Yatta! Stamp sudah masuk", copy: "Stamp baru berhasil ditambahkan ke card kamu.", priority: 2 },
  rejected: { title: "Request stamp ditolak", copy: "Cek riwayat atau hubungi admin untuk detailnya, ya.", priority: 2 },
  completed: { title: "Sugoi! Card kamu lengkap", copy: "Reward baru terbuka dan card berikutnya siap.", priority: 3 },
  reward: { title: "Reward diperbarui", copy: "Cek detail dan masa berlakunya di halaman Rewards.", priority: 1 },
};

const colors = ["#ed2024", "#ffcc00", "#2b2728", "#ffffff", "#25d366"];

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function launchStampConfetti(quantity = 1) {
  if (reducedMotion()) return;
  const particles = quantity > 1 ? 72 : 52;
  confetti({ particleCount: particles, angle: 76, spread: 54, startVelocity: 48, gravity: 0.9, origin: { x: 0.2, y: 1 }, colors });
  confetti({ particleCount: particles, angle: 104, spread: 54, startVelocity: 48, gravity: 0.9, origin: { x: 0.8, y: 1 }, colors });
}

function launchCompletionConfetti() {
  if (reducedMotion()) return;
  confetti({ particleCount: 120, spread: 86, startVelocity: 48, origin: { y: 0.86 }, colors });
  window.setTimeout(() => {
    confetti({ particleCount: 55, angle: 62, spread: 60, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 55, angle: 118, spread: 60, origin: { x: 1, y: 0.7 }, colors });
  }, 180);
}

export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const activePriority = useRef(0);
  const sequence = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`my-loyalty-${userId}`);

    const refresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        startTransition(() => router.refresh());
      }, 80);
    };

    const announce = (kind: ToastKind) => {
      if (feedback[kind].priority < activePriority.current) {
        refresh();
        return;
      }

      activePriority.current = feedback[kind].priority;
      sequence.current += 1;
      setToast({ kind, sequence: sequence.current });
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        activePriority.current = 0;
        setToast(null);
      }, 5000);
      refresh();
    };

    channel
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stamp_requests", filter: `user_id=eq.${userId}` }, (payload) => {
        const next = payload.new as { status?: string };
        if (next.status === "approved") announce("approved");
        else if (next.status === "rejected") announce("rejected");
        else refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stamp_events", filter: `user_id=eq.${userId}` }, (payload) => {
        const event = payload.new as { event_type?: string; quantity?: number };
        if (event.event_type === "grant") {
          launchStampConfetti(Math.abs(event.quantity ?? 1));
          announce("approved");
        } else {
          refresh();
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reward_redemptions", filter: `user_id=eq.${userId}` }, () => {
        launchCompletionConfetti();
        announce("completed");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reward_redemptions", filter: `user_id=eq.${userId}` }, () => announce("reward"))
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_programs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_card_definitions" }, refresh)
      .subscribe();

    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [router, startTransition, userId]);

  const kind = toast?.kind;
  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex justify-center sm:top-5">
      {kind ? (
        <div key={toast.sequence} role="status" className={cn("animate-rise relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border bg-white px-4 pb-4 pt-3.5 text-sm text-ink shadow-[0_14px_40px_rgba(43,39,40,0.16)]", kind === "rejected" ? "border-danger/25" : "border-success/25")}>
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", kind === "rejected" ? "animate-sad-drift bg-danger-soft text-danger" : "animate-happy-bounce bg-success-soft text-success")}>
            {kind === "rejected" ? <CloudRainWind className="size-5" aria-hidden="true" /> : kind === "completed" ? <PartyPopper className="size-5" aria-hidden="true" /> : kind === "reward" ? <BadgeJapaneseYen className="size-5" aria-hidden="true" /> : <Stamp className="size-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0"><strong className="block font-extrabold">{feedback[kind].title}</strong><span className="mt-0.5 block text-xs leading-5 text-ink-muted">{feedback[kind].copy}</span></span>
          <span className={cn("notification-progress absolute inset-x-0 bottom-0 h-1 origin-left", kind === "rejected" ? "bg-danger" : "bg-success")} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
