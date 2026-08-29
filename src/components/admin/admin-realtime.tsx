"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Inbox, XCircle } from "lucide-react";
import { ADMIN_FEEDBACK_EVENT, type AdminFeedbackDetail } from "@/lib/admin-feedback";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type FeedbackState = AdminFeedbackDetail & { sequence: number };

export function AdminRealtime({ adminId }: { adminId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const hideTimer = useRef<number | null>(null);
  const burstTimer = useRef<number | null>(null);
  const trailingTimer = useRef<number | null>(null);
  const sequence = useRef(0);

  const refreshAuthoritativeState = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const reconcile = useCallback(() => {
    // Refresh immediately on the first database event, then once more after a
    // short burst so every row changed by the same transaction is represented.
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
    }, 260);
  }, [refreshAuthoritativeState]);

  const announce = useCallback((detail: AdminFeedbackDetail) => {
    sequence.current += 1;
    setFeedback({ ...detail, sequence: sequence.current });
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      announce((event as CustomEvent<AdminFeedbackDetail>).detail);
    };
    window.addEventListener(ADMIN_FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(ADMIN_FEEDBACK_EVENT, handleFeedback);
  }, [announce]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`admin-live-${adminId}`);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stamp_requests" }, (payload) => {
        const request = payload.new as { requested_count?: number };
        const quantity = Math.max(1, Math.min(6, request.requested_count ?? 1));
        announce({
          kind: "request",
          quantity,
          message: `Request +${quantity} stamp baru masuk dan siap direview.`,
        });
        reconcile();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stamp_requests" }, reconcile)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "stamp_requests" }, reconcile)
      .on("postgres_changes", { event: "*", schema: "public", table: "member_cards" }, reconcile)
      .on("postgres_changes", { event: "*", schema: "public", table: "member_programs" }, reconcile)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, reconcile)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stamp_events" }, reconcile)
      .on("postgres_changes", { event: "*", schema: "public", table: "reward_redemptions" }, reconcile)
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
      void supabase.removeChannel(channel);
    };
  }, [adminId, announce, reconcile, refreshAuthoritativeState]);

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (trailingTimer.current) window.clearTimeout(trailingTimer.current);
  }, []);

  if (!feedback) return null;
  const isRequest = feedback.kind === "request";
  const isRejected = feedback.kind === "rejected";
  const Icon = isRequest ? Inbox : isRejected ? XCircle : CheckCircle2;
  const title = isRequest
    ? `Request +${feedback.quantity ?? 1} stamp masuk!`
    : isRejected
      ? "Request berhasil ditolak"
      : `Berhasil approve +${feedback.quantity ?? 1} stamp`;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-ink/15 px-4 backdrop-blur-[2px] print:hidden" role="status" aria-live="polite" aria-atomic="true">
      <div key={feedback.sequence} className={cn("animate-rise relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border bg-white p-6 text-center shadow-[0_24px_70px_rgba(43,39,40,0.22)]", isRequest ? "border-brand/25" : "border-success/25")}>
        <span className={cn("success-check-loop mx-auto grid size-16 place-items-center rounded-full", isRequest ? "bg-brand-soft text-brand" : "bg-success-soft text-success")}>
          <Icon className="size-9" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{feedback.message}</p>
        <span className={cn("request-popup-progress absolute inset-x-0 bottom-0 h-1.5 origin-left", isRequest ? "bg-brand" : "bg-success")} aria-hidden="true" />
      </div>
    </div>
  );
}
