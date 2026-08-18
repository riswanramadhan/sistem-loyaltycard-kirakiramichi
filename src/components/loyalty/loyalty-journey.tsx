"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Gift, LockKeyhole, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { RequestStampSheet } from "@/components/loyalty/request-stamp-sheet";
import { StampGrid } from "@/components/loyalty/stamp-grid";
import type { LoyaltyCardView } from "@/components/loyalty/types";
import { cn } from "@/lib/utils";

const stateCopy = {
  active: { label: "Aktif", tone: "brand" as const },
  completed: { label: "Selesai", tone: "success" as const },
  locked: { label: "Terkunci", tone: "neutral" as const },
};

function JourneyIndicator({
  cards,
  onSelect,
}: {
  cards: LoyaltyCardView[];
  onSelect: (card: LoyaltyCardView) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ol className="flex min-w-max items-center" aria-label="Perjalanan enam loyalty card">
        {cards.map((card, index) => (
          <li key={card.id} className="flex items-center">
            {index > 0 ? (
              <span
                className={cn(
                  "h-0.5 w-5 sm:w-8",
                  card.status === "locked" ? "bg-line" : "bg-brand/35",
                )}
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(card)}
              aria-label={`Lihat Card ${card.sequenceNo}, ${stateCopy[card.status].label}`}
              className={cn(
                "grid size-10 place-items-center rounded-full border-2 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none",
                card.status === "active" && "border-brand bg-brand text-white shadow-[0_3px_0_#b9151a]",
                card.status === "completed" && "border-success bg-success-soft text-success",
                card.status === "locked" && "border-line bg-surface-muted text-ink-faint",
              )}
            >
              {card.status === "completed" ? (
                <Check className="size-4" aria-hidden="true" />
              ) : card.status === "locked" ? (
                <LockKeyhole className="size-3.5" aria-hidden="true" />
              ) : (
                card.sequenceNo
              )}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RewardPreview({ card }: { card: LoyaltyCardView }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/35 bg-warning-soft/70 p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-ink shadow-[0_3px_0_#d6aa00]">
        <Gift className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-warning">Reward card ini</p>
        <p className="mt-1 text-sm font-extrabold leading-5 text-ink">
          {card.rewardTitle ?? "Detail reward segera hadir"}
        </p>
        {card.rewardDescription ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{card.rewardDescription}</p>
        ) : null}
      </div>
    </div>
  );
}

function LoyaltyCard({
  card,
  cardRef,
  onRequest,
}: {
  card: LoyaltyCardView;
  cardRef: (element: HTMLElement | null) => void;
  onRequest: (card: LoyaltyCardView) => void;
}) {
  const remaining = Math.max(0, 8 - card.stampsCount);
  const isActive = card.status === "active";
  const isLocked = card.status === "locked";
  const copy = stateCopy[card.status];

  return (
    <article
      ref={cardRef}
      data-card-id={card.id}
      className={cn(
        "relative flex w-[calc(100vw-2.5rem)] max-w-[390px] shrink-0 snap-center flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_16px_45px_rgba(43,39,40,0.09)] sm:w-[390px]",
        isActive ? "border-brand/30" : "border-line",
        isLocked && "bg-surface-muted/75",
      )}
      aria-labelledby={`card-${card.id}-title`}
    >
      <div
        className={cn(
          "relative h-3 overflow-hidden",
          card.status === "completed" ? "bg-success" : isActive ? "bg-brand" : "bg-line",
        )}
        aria-hidden="true"
      >
        {isActive ? (
          <div className="absolute inset-0 opacity-80 [background-image:repeating-linear-gradient(135deg,transparent_0,transparent_12px,rgba(255,204,0,.9)_12px,rgba(255,204,0,.9)_17px)]" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">
              Card {card.sequenceNo} of 6
            </p>
            <h2 id={`card-${card.id}-title`} className="mt-1.5 text-xl font-extrabold tracking-tight text-ink">
              {card.title ?? `Loyalty Card ${card.sequenceNo}`}
            </h2>
          </div>
          <Badge tone={copy.tone} className="shrink-0">
            {copy.label}
          </Badge>
        </div>

        {card.description ? (
          <p className="mt-2 text-sm leading-5 text-ink-muted">{card.description}</p>
        ) : null}

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black tracking-[-0.05em] text-ink">
              {card.stampsCount}<span className="text-lg text-ink-faint">/8</span>
            </p>
            <p className="text-xs font-semibold text-ink-muted">stamp sudah masuk</p>
          </div>
          {card.pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1.5 text-xs font-bold text-warning">
              <Clock3 className="size-3.5" aria-hidden="true" />
              +{card.pendingCount} diperiksa
            </span>
          ) : null}
        </div>

        <div className="mt-5">
          <StampGrid
            stampsCount={card.stampsCount}
            pendingCount={card.pendingCount}
            latestApprovedCount={card.latestApprovedCount}
            isActive={isActive}
            isLocked={isLocked}
            requestDisabled={card.hasPendingRequest || remaining === 0}
            onRequest={() => onRequest(card)}
          />
        </div>

        <div className="mt-5">
          <RewardPreview card={card} />
        </div>

        <div className="mt-auto pt-5">
          {isLocked ? (
            <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs font-semibold leading-5 text-ink-muted">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Selesaikan Card {Math.max(1, card.sequenceNo - 1)} untuk membuka card ini.
            </p>
          ) : card.status === "completed" ? (
            <Link
              href="/loyalty/rewards"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-success px-4 text-sm font-extrabold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Lihat reward <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : card.hasPendingRequest ? (
            <div className="rounded-xl border border-warning/20 bg-warning-soft px-3 py-2.5 text-center text-xs font-semibold leading-5 text-warning">
              Request kamu sedang dicek. Progress tetap {card.stampsCount}/8 sampai disetujui.
            </div>
          ) : remaining > 0 ? (
            <Button type="button" className="w-full" onClick={() => onRequest(card)}>
              <Sparkles className="size-4" aria-hidden="true" />
              Request stamp
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function LoyaltyJourney({ cards }: { cards: LoyaltyCardView[] }) {
  const elements = useRef(new Map<string, HTMLElement>());
  const [sheetCardId, setSheetCardId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeCard = useMemo(
    () => cards.find((card) => card.id === sheetCardId) ?? null,
    [cards, sheetCardId],
  );

  const scrollToCard = useCallback((card: LoyaltyCardView) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elements.current.get(card.id)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, []);

  useEffect(() => {
    const active = cards.find((card) => card.status === "active");
    if (!active || active.sequenceNo === 1) return;
    const timer = window.setTimeout(() => scrollToCard(active), 80);
    return () => window.clearTimeout(timer);
  }, [cards, scrollToCard]);

  const openRequest = (card: LoyaltyCardView) => {
    if (card.status !== "active" || card.hasPendingRequest || card.stampsCount >= 8) return;
    setNotice(null);
    setSheetCardId(card.id);
  };

  if (cards.length === 0) return null;

  return (
    <section className="mt-6" aria-labelledby="journey-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">Loyalty journey</p>
          <h2 id="journey-heading" className="mt-1 text-xl font-extrabold tracking-tight text-ink">
            Enam card, satu perjalanan seru
          </h2>
        </div>
        <JourneyIndicator cards={cards} onSelect={scrollToCard} />
      </div>

      {notice ? (
        <StatusMessage tone="success" className="mt-5">
          {notice}
        </StatusMessage>
      ) : null}

      <div
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]"
        aria-label="Daftar loyalty card"
      >
        {cards.map((card) => (
          <LoyaltyCard
            key={card.id}
            card={card}
            cardRef={(element) => {
              if (element) elements.current.set(card.id, element);
              else elements.current.delete(card.id);
            }}
            onRequest={openRequest}
          />
        ))}
        <div className="w-px shrink-0" aria-hidden="true" />
      </div>

      {activeCard ? (
        <RequestStampSheet
          open
          memberCardId={activeCard.id}
          cardNumber={activeCard.sequenceNo}
          remaining={Math.max(0, 8 - activeCard.stampsCount)}
          hasPendingRequest={activeCard.hasPendingRequest}
          onClose={() => setSheetCardId(null)}
          onSuccess={setNotice}
        />
      ) : null}
    </section>
  );
}
