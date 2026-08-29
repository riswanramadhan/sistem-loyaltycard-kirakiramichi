"use client";

import Image from "next/image";
import { Clock3, LockKeyhole, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAMPS_PER_CARD } from "@/lib/loyalty/rules";

type StampState = "empty" | "pending" | "approved" | "latest" | "locked";

function StampSeal({ latest }: { latest: boolean }) {
  return (
    <span
      className={cn(
        "relative grid size-14 place-items-center sm:size-16",
        latest && "animate-stamp-pop",
      )}
      aria-hidden="true"
    >
      <Image
        src="/kira-kira-michi-stamp-red.png"
        alt=""
        width={64}
        height={64}
        sizes="(max-width: 640px) 56px, 64px"
        className="size-full object-contain drop-shadow-[0_3px_3px_rgba(185,21,26,.18)]"
      />
    </span>
  );
}

function labelFor(state: StampState, position: number) {
  const prefix = `Slot ${position}`;
  if (state === "approved") return `${prefix}, stamp sudah masuk`;
  if (state === "latest") return `${prefix}, stamp terbaru sudah masuk`;
  if (state === "pending") return `${prefix}, sedang diperiksa`;
  if (state === "locked") return `${prefix}, terkunci`;
  return `${prefix}, kosong. Request stamp`;
}

export function StampGrid({
  stampsCount,
  pendingCount,
  latestApprovedCount,
  isActive,
  isLocked,
  requestDisabled,
  onRequest,
}: {
  stampsCount: number;
  pendingCount: number;
  latestApprovedCount: number;
  isActive: boolean;
  isLocked: boolean;
  requestDisabled: boolean;
  onRequest: () => void;
}) {
  const approved = Math.max(0, Math.min(STAMPS_PER_CARD, stampsCount));
  const pending = Math.max(0, Math.min(STAMPS_PER_CARD - approved, pendingCount));
  const latestStart = Math.max(0, approved - Math.max(0, latestApprovedCount));

  const states: StampState[] = Array.from({ length: STAMPS_PER_CARD }, (_, index) => {
    if (isLocked) return "locked";
    if (index < approved) return index >= latestStart && latestApprovedCount > 0 ? "latest" : "approved";
    if (index < approved + pending) return "pending";
    return "empty";
  });

  return (
    <ol className="grid grid-cols-3 gap-3" aria-label="Enam slot stamp">
      {states.map((state, index) => (
        <li key={index} className="grid min-w-0 place-items-center">
          {state === "empty" && isActive ? (
            <button
              type="button"
              onClick={onRequest}
              disabled={requestDisabled}
              aria-label={labelFor(state, index + 1)}
              className="group grid size-14 place-items-center rounded-[38%] border-2 border-dashed border-line bg-surface text-ink-faint transition hover:border-brand/50 hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none sm:size-16"
            >
              <Plus className="size-5 transition-transform group-hover:rotate-90 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
            </button>
          ) : (
            <div
              aria-label={labelFor(state, index + 1)}
              className={cn(
                "grid size-14 place-items-center rounded-[38%] sm:size-16",
                state === "pending" && "border-2 border-dashed border-warning/45 bg-warning-soft text-warning",
                state === "locked" && "border border-line bg-surface-muted text-ink-faint",
                state === "empty" && "border-2 border-dashed border-line bg-surface text-ink-faint",
              )}
            >
              {state === "approved" || state === "latest" ? (
                <StampSeal latest={state === "latest"} />
              ) : state === "pending" ? (
                <Clock3 className="size-5" aria-hidden="true" />
              ) : state === "locked" ? (
                <LockKeyhole className="size-4" aria-hidden="true" />
              ) : (
                <span className="size-1.5 rounded-full bg-line" aria-hidden="true" />
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
