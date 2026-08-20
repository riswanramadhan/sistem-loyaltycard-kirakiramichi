"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Send, X } from "lucide-react";
import { requestStampAction } from "@/app/loyalty/actions";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";
import { cn } from "@/lib/utils";

export function RequestStampSheet({
  open,
  memberCardId,
  cardNumber,
  remaining,
  hasPendingRequest,
  onClose,
  onSuccess,
}: {
  open: boolean;
  memberCardId: string;
  cardNumber: number;
  remaining: number;
  hasPendingRequest: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const [count, setCount] = useState<1 | 2>(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!dialog.open) dialog.showModal();
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(timer);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (hasPendingRequest) {
      setError("Request sebelumnya masih diperiksa.");
      return;
    }
    if (count > remaining) {
      setError("Jumlah stamp melebihi slot yang tersisa.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await requestStampAction({
        memberCardId,
        requestedCount: count,
        customerNote: note,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onSuccess(result.message);
      onClose();
      router.refresh();
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="request-stamp-title"
      aria-describedby="request-stamp-description"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section className="animate-rise absolute inset-x-0 bottom-0 mx-auto max-h-[92svh] max-w-xl overflow-y-auto rounded-t-[2rem] border border-line bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_70px_rgba(43,39,40,0.2)] sm:bottom-4 sm:rounded-[2rem] sm:px-7">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">Card {cardNumber}</p>
            <h2 id="request-stamp-title" className="mt-1 text-2xl font-extrabold text-ink">
              Request Stamp
            </h2>
            <p
              id="request-stamp-description"
              className="mt-1 text-sm leading-6 text-ink-muted"
            >
              Pilih jumlah sesuai transaksi kamu. Tersisa {remaining} slot.
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tutup"
            onClick={onClose}
            disabled={isPending}
            className="shrink-0"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-bold text-ink">Jumlah stamp</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {([1, 2] as const).map((value) => {
              const disabled = value > remaining || hasPendingRequest;
              const selected = count === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "relative flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-3 font-extrabold transition focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 motion-reduce:transition-none",
                    selected ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-white text-ink",
                    disabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <input
                    type="radio"
                    name="stamp-count"
                    value={value}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => setCount(value)}
                    className="sr-only"
                  />
                  {value === 1 ? <Plus className="size-5" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
                  +{value} {value === 1 ? "Stamp" : "Stamps"}
                </label>
              );
            })}
          </div>
          {remaining === 1 ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
              <Minus className="size-3.5" aria-hidden="true" />
              Pilihan +2 tidak tersedia karena tinggal satu slot.
            </p>
          ) : null}
        </fieldset>

        <div className="mt-5">
          <TextareaField
            label="Catatan untuk tim (opsional)"
            name="customer-note"
            maxLength={280}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Misalnya: transaksi dine-in sore ini"
            hint={`${note.length}/280 karakter`}
            disabled={isPending}
          />
        </div>

        {error ? <StatusMessage className="mt-4">{error}</StatusMessage> : null}
        {hasPendingRequest ? (
          <StatusMessage className="mt-4">
            Request sebelumnya masih diperiksa. Kamu belum bisa mengirim request baru.
          </StatusMessage>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="mt-5 w-full"
          onClick={submit}
          disabled={isPending || hasPendingRequest || count > remaining || remaining < 1}
        >
          {isPending ? "Mengirim request…" : "Request Stamp"}
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-ink-muted">
          Stamp masuk setelah transaksi dikonfirmasi tim Kira Kira Michi.
        </p>
      </section>
    </dialog>
  );
}
