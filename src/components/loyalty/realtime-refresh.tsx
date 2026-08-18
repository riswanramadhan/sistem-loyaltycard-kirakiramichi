"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FeedbackKind = "request" | "card" | "reward";

const feedback: Record<FeedbackKind, string> = {
  request: "Status request stamp kamu baru diperbarui.",
  card: "Progress loyalty kamu baru diperbarui.",
  reward: "Ada kabar baru untuk reward kamu.",
};

export function RealtimeRefresh({
  userId,
  memberCardIds,
}: {
  userId: string;
  memberCardIds: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`my-loyalty-${userId}`);

    const announce = (kind: FeedbackKind) => {
      setMessage(feedback[kind]);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setMessage(null), 4500);

      // Realtime is only a nudge. Server Components re-read the RLS-protected rows.
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 120);
    };

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "stamp_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => announce("request"),
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
        () => announce("card"),
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
      {message ? (
        <div
          role="status"
          className="animate-rise flex max-w-sm items-center gap-2 rounded-2xl border border-brand/15 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-[0_14px_40px_rgba(43,39,40,0.16)]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <BellRing className="size-4" aria-hidden="true" />
          </span>
          {message}
        </div>
      ) : null}
    </div>
  );
}

