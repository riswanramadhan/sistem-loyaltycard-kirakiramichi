"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { BadgeJapaneseYen, CloudRainWind, PartyPopper, Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LOYALTY_STAMP_GRANTED_EVENT, type LoyaltyStampGrantedDetail } from "@/lib/loyalty/realtime-events";
import { cn } from "@/lib/utils";

type ToastKind = "approved" | "rejected" | "completed" | "reward";
type ToastState = { kind: ToastKind; sequence: number; quantity?: number };

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
  const burstTimer = useRef<number | null>(null);
  const trailingTimer = useRef<number | null>(null);
  const activePriority = useRef(0);
  const sequence = useRef(0);
  const announcedRequests = useRef(new Set<string>());
  const celebratedRequests = useRef(new Set<string>());

  const refreshAuthoritativeState = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const reconcile = useCallback(() => {
    if (!burstTimer.current) {
      refreshAuthoritativeState();
      burstTimer.current = window.setTimeout(() => {
        burstTimer.current = null;
      }, 120);
    }

    if (trailingTimer.current) window.clearTimeout(trailingTimer.current);
    trailingTimer.current = window.setTimeout(() => {
      refreshAuthoritativeState();
      trailingTimer.current = null;
    }, 100);
  }, [refreshAuthoritativeState]);

  const announce = useCallback((kind: ToastKind, quantity?: number) => {
    if (feedback[kind].priority < activePriority.current) {
      reconcile();
      return;
    }

    activePriority.current = feedback[kind].priority;
    sequence.current += 1;
    setToast({ kind, quantity, sequence: sequence.current });
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      activePriority.current = 0;
      setToast(null);
    }, 5000);
    reconcile();
  }, [reconcile]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`my-loyalty-${userId}`);

    channel
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stamp_requests", filter: `user_id=eq.${userId}` }, (payload) => {
        const next = payload.new as { id?: string; status?: string; approved_count?: number; requested_count?: number };
        const requestKey = next.id ? `request:${next.id}` : null;
        if (next.status === "approved") {
          if (!requestKey || !announcedRequests.current.has(requestKey)) {
            if (requestKey) announcedRequests.current.add(requestKey);
            announce("approved", Math.max(1, next.approved_count ?? 1));
          } else reconcile();
        } else if (next.status === "rejected") {
          if (!requestKey || !announcedRequests.current.has(requestKey)) {
            if (requestKey) announcedRequests.current.add(requestKey);
            announce("rejected", next.requested_count ?? 1);
          } else reconcile();
        } else reconcile();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stamp_events", filter: `user_id=eq.${userId}` }, (payload) => {
        const event = payload.new as { id?: string; member_card_id?: string; stamp_request_id?: string | null; event_type?: string; quantity?: number };
        if (event.event_type === "grant") {
          const quantity = Math.max(1, Math.abs(event.quantity ?? 1));
          if (event.id && event.member_card_id) {
            window.dispatchEvent(new CustomEvent<LoyaltyStampGrantedDetail>(LOYALTY_STAMP_GRANTED_EVENT, {
              detail: { eventId: event.id, memberCardId: event.member_card_id, quantity },
            }));
          }
          const requestKey = event.stamp_request_id
            ? `request:${event.stamp_request_id}`
            : `event:${event.id ?? sequence.current + 1}`;
          if (!celebratedRequests.current.has(requestKey)) {
            celebratedRequests.current.add(requestKey);
            launchStampConfetti(quantity);
          }
          if (!announcedRequests.current.has(requestKey)) {
            announcedRequests.current.add(requestKey);
            announce("approved", quantity);
          } else reconcile();
        } else {
          reconcile();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "member_cards" }, reconcile)
      .on("postgres_changes", { event: "*", schema: "public", table: "member_programs", filter: `user_id=eq.${userId}` }, reconcile)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, reconcile)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reward_redemptions", filter: `user_id=eq.${userId}` }, () => {
        launchCompletionConfetti();
        announce("completed");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reward_redemptions", filter: `user_id=eq.${userId}` }, () => announce("reward"))
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_programs" }, reconcile)
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_card_definitions" }, reconcile)
      .subscribe((status) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          refreshAuthoritativeState();
        }
      });

    const reconcileWhenVisible = () => {
      if (document.visibilityState === "visible") refreshAuthoritativeState();
    };
    window.addEventListener("online", refreshAuthoritativeState);
    window.addEventListener("focus", refreshAuthoritativeState);
    document.addEventListener("visibilitychange", reconcileWhenVisible);

    return () => {
      window.removeEventListener("online", refreshAuthoritativeState);
      window.removeEventListener("focus", refreshAuthoritativeState);
      document.removeEventListener("visibilitychange", reconcileWhenVisible);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (burstTimer.current) window.clearTimeout(burstTimer.current);
      if (trailingTimer.current) window.clearTimeout(trailingTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [announce, reconcile, refreshAuthoritativeState, userId]);

  const kind = toast?.kind;
  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex justify-center sm:top-5">
      {kind ? (
        <div key={toast.sequence} role="status" className={cn("animate-rise relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border bg-white px-4 pb-4 pt-3.5 text-sm text-ink shadow-[0_14px_40px_rgba(43,39,40,0.16)]", kind === "rejected" ? "border-danger/25" : "border-success/25")}>
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", kind === "rejected" ? "animate-sad-drift bg-danger-soft text-danger" : "animate-happy-bounce bg-success-soft text-success")}>
            {kind === "rejected" ? <CloudRainWind className="size-5" aria-hidden="true" /> : kind === "completed" ? <PartyPopper className="size-5" aria-hidden="true" /> : kind === "reward" ? <BadgeJapaneseYen className="size-5" aria-hidden="true" /> : <Stamp className="size-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0"><strong className="block font-extrabold">{kind === "approved" && toast.quantity ? `Yatta! +${toast.quantity} stamp sudah masuk` : feedback[kind].title}</strong><span className="mt-0.5 block text-xs leading-5 text-ink-muted">{kind === "approved" && toast.quantity === 2 ? "Dua stamp baru langsung ditambahkan ke card kamu." : feedback[kind].copy}</span></span>
          <span className={cn("notification-progress absolute inset-x-0 bottom-0 h-1 origin-left", kind === "rejected" ? "bg-danger" : "bg-success")} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
