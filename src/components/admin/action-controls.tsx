"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Gift, Minus, PencilLine, Plus, Save, X } from "lucide-react";
import {
  adjustMemberStampsAction,
  redeemRewardAction,
  reviewStampRequestAction,
  updateCardDefinitionAction,
  updateLoyaltyProgramAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AdminActionState = { status: "idle", message: "" };

function DialogSubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

function DialogCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tutup dialog"
      className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

function useActionDialog(state: AdminActionState) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [router, state.status]);

  return {
    dialogRef,
    open: () => dialogRef.current?.showModal(),
    close: () => dialogRef.current?.close(),
  };
}

function ReviewDialog({
  requestId,
  customerId,
  requestedCount,
  mode,
}: {
  requestId: string;
  customerId: string;
  requestedCount: number;
  mode: "approve" | "partial" | "reject";
}) {
  const [state, formAction] = useActionState(reviewStampRequestAction, initialState);
  const { dialogRef, open, close } = useActionDialog(state);
  const titleId = useId();
  const isReject = mode === "reject";
  const isPartial = mode === "partial";
  const approvedCount = isReject ? 0 : isPartial ? 1 : requestedCount;

  const trigger = isReject ? (
    <Button size="sm" variant="ghost" onClick={open}>Tolak</Button>
  ) : isPartial ? (
    <Button size="sm" variant="outline" onClick={open}>Setujui +1</Button>
  ) : (
    <Button size="sm" onClick={open}>Setujui +{requestedCount}</Button>
  );

  return (
    <>
      {trigger}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 open:animate-rise"
      >
        <form action={formAction} className="grid gap-5 p-5 sm:p-6">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="action" value={isReject ? "reject" : "approve"} />
          <input type="hidden" name="approvedCount" value={approvedCount} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-extrabold">
                {isReject ? "Tolak request stamp?" : isPartial ? "Setujui sebagian?" : "Setujui request stamp?"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {isReject
                  ? "Request akan ditutup tanpa menambah stamp. Tindakan ini tidak bisa diulang."
                  : `${approvedCount} stamp akan masuk secara atomik ke kartu aktif customer.`}
              </p>
            </div>
            <DialogCloseButton onClick={close} />
          </div>

          <TextareaField
            name="adminNote"
            label={isReject ? "Alasan penolakan" : "Catatan admin (opsional)"}
            placeholder={isReject ? "Contoh: transaksi belum dapat diverifikasi" : "Catatan singkat untuk customer"}
            required={isReject}
            minLength={isReject ? 3 : undefined}
            maxLength={500}
          />

          {state.status === "error" ? <StatusMessage>{state.message}</StatusMessage> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={close}>Batal</Button>
            <DialogSubmitButton variant={isReject ? "danger" : "primary"} pendingLabel="Memproses…">
              {isReject ? "Tolak request" : `Setujui +${approvedCount}`}
            </DialogSubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ReviewStampRequestActions({
  requestId,
  customerId,
  requestedCount,
}: {
  requestId: string;
  customerId: string;
  requestedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Aksi request stamp">
      <ReviewDialog requestId={requestId} customerId={customerId} requestedCount={requestedCount} mode="approve" />
      {requestedCount > 1 ? (
        <ReviewDialog requestId={requestId} customerId={customerId} requestedCount={requestedCount} mode="partial" />
      ) : null}
      <ReviewDialog requestId={requestId} customerId={customerId} requestedCount={requestedCount} mode="reject" />
    </div>
  );
}

function AdjustmentDialog({
  customerId,
  cards,
  quantity,
}: {
  customerId: string;
  cards: Array<{
    id: string;
    sequence: number;
    title: string;
    status: string;
    stamps: number;
    canReverseCompletion?: boolean;
  }>;
  quantity: 1 | -1;
}) {
  const [state, formAction] = useActionState(adjustMemberStampsAction, initialState);
  const { dialogRef, open, close } = useActionDialog(state);
  const titleId = useId();
  const granting = quantity > 0;
  const eligibleCards = granting
    ? cards.filter((card) => card.status === "active" && card.stamps < 8)
    : cards.filter(
        (card) =>
          (card.status === "active" && card.stamps > 0) ||
          (card.status === "completed" && card.canReverseCompletion),
      );
  const defaultCard =
    eligibleCards.find((card) => card.status === "active") ??
    [...eligibleCards].sort((left, right) => right.sequence - left.sequence)[0];
  const completionReversalCard = !granting
    ? eligibleCards.find((card) => card.status === "completed")
    : undefined;
  const reversesCompletion = Boolean(completionReversalCard);

  return (
    <>
      <Button size="sm" variant={granting ? "primary" : "outline"} onClick={open} disabled={!eligibleCards.length}>
        {granting ? <Plus className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
        {granting ? "Berikan stamp" : "Cabut stamp"}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => event.target === event.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 open:animate-rise"
      >
        <form action={formAction} className="grid gap-5 p-5 sm:p-6">
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="quantity" value={quantity} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-extrabold">
                {granting ? "Berikan 1 stamp" : reversesCompletion ? "Buka ulang completion?" : "Cabut 1 stamp"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {granting
                  ? "Penyesuaian tercatat permanen di stamp ledger beserta alasan dan admin pelaksana."
                  : reversesCompletion
                    ? completionReversalCard?.sequence === 6
                      ? "1 stamp akan dicabut, reward dibatalkan, dan program customer kembali aktif. Semua perubahan tercatat di ledger."
                      : "1 stamp akan dicabut, reward dibatalkan, dan kartu berikutnya dikunci kembali. Semua perubahan tercatat di ledger."
                    : "Penyesuaian tercatat permanen di stamp ledger beserta alasan dan admin pelaksana."}
              </p>
            </div>
            <DialogCloseButton onClick={close} />
          </div>

          <label className="grid gap-2 text-sm font-bold text-ink">
            Kartu yang dikoreksi
            <select
              name="memberCardId"
              required
              defaultValue={defaultCard?.id}
              className="min-h-12 w-full rounded-xl border border-line bg-white px-3.5 font-normal outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
            >
              {eligibleCards.map((card) => (
                <option key={card.id} value={card.id}>
                  Card {card.sequence} · {card.title} · {card.stamps}/8
                  {card.status === "completed" ? " · buka ulang kartu" : ""}
                </option>
              ))}
            </select>
          </label>
          <TextareaField
            name="reason"
            label="Alasan penyesuaian"
            placeholder="Contoh: koreksi transaksi toko 14 Agustus"
            minLength={5}
            maxLength={500}
            required
          />
          {state.status === "error" ? <StatusMessage>{state.message}</StatusMessage> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={close}>Batal</Button>
            <DialogSubmitButton variant={granting ? "primary" : "danger"}>
              {granting ? "Berikan 1 stamp" : reversesCompletion ? "Buka ulang & cabut 1 stamp" : "Cabut 1 stamp"}
            </DialogSubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function CustomerAdjustmentActions({
  customerId,
  cards,
}: {
  customerId: string;
  cards: Array<{
    id: string;
    sequence: number;
    title: string;
    status: string;
    stamps: number;
    canReverseCompletion?: boolean;
  }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <AdjustmentDialog customerId={customerId} cards={cards} quantity={1} />
      <AdjustmentDialog customerId={customerId} cards={cards} quantity={-1} />
    </div>
  );
}

export function RedeemRewardAction({
  rewardId,
  customerId,
  rewardTitle,
}: {
  rewardId: string;
  customerId: string;
  rewardTitle: string;
}) {
  const [state, formAction] = useActionState(redeemRewardAction, initialState);
  const { dialogRef, open, close } = useActionDialog(state);
  const titleId = useId();
  return (
    <>
      <Button size="sm" variant="secondary" onClick={open}>
        <Gift className="size-4" aria-hidden="true" />
        Tandai ditebus
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => event.target === event.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 open:animate-rise"
      >
        <form action={formAction} className="grid gap-5 p-5 sm:p-6">
          <input type="hidden" name="rewardId" value={rewardId} />
          <input type="hidden" name="customerId" value={customerId} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-extrabold">Konfirmasi penukaran reward</h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Pastikan customer menerima “{rewardTitle}”. Reward hanya dapat ditebus satu kali.
              </p>
            </div>
            <DialogCloseButton onClick={close} />
          </div>
          <TextareaField name="note" label="Catatan penukaran (opsional)" placeholder="Contoh: ditukarkan di toko utama" maxLength={500} />
          {state.status === "error" ? <StatusMessage>{state.message}</StatusMessage> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={close}>Batal</Button>
            <DialogSubmitButton variant="secondary" pendingLabel="Memproses…">Konfirmasi ditebus</DialogSubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

export type ProgramDefinitionFormData = {
  id: string;
  sequenceNo: number;
  title: string;
  description: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardTerms: string;
  rewardExpiryDays: number | null;
};

export function ProgramDefinitionForm({ definition }: { definition: ProgramDefinitionFormData }) {
  const [state, formAction] = useActionState(updateCardDefinitionAction, initialState);
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_8px_24px_rgba(43,39,40,0.04)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-extrabold text-brand">{definition.sequenceNo}</span>
          <span className="min-w-0">
            <span className="block truncate font-extrabold text-ink">{definition.title}</span>
            <span className="mt-0.5 block truncate text-xs text-ink-muted">
              {definition.rewardTitle || "Reward belum diatur"}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-ink-muted">
          Aktif
          <PencilLine className="size-4" aria-hidden="true" />
        </span>
      </button>

      {expanded ? (
        <form action={formAction} className="grid gap-5 border-t border-line p-4 sm:grid-cols-2 sm:p-5">
          <input type="hidden" name="cardDefinitionId" value={definition.id} />
          <Field name="title" label="Judul kartu" defaultValue={definition.title} required maxLength={120} />
          <Field name="rewardTitle" label="Judul reward (opsional)" defaultValue={definition.rewardTitle} maxLength={160} />
          <TextareaField name="description" label="Deskripsi kartu" defaultValue={definition.description} maxLength={2000} />
          <TextareaField name="rewardDescription" label="Deskripsi reward" defaultValue={definition.rewardDescription} maxLength={2000} />
          <TextareaField name="rewardTerms" label="Syarat reward" defaultValue={definition.rewardTerms} maxLength={4000} className="sm:min-h-28" />
          <div className="grid content-start gap-4">
            <Field
              name="rewardExpiryDays"
              label="Masa berlaku (hari)"
              type="number"
              min={1}
              max={3650}
              defaultValue={definition.rewardExpiryDays ?? ""}
              hint="Kosongkan jika reward tidak memiliki masa berlaku."
            />
            <p className="rounded-xl border border-line bg-surface-muted px-3.5 py-3 text-xs leading-5 text-ink-muted">
              Definisi tetap aktif agar progres enam kartu konsisten. Jeda seluruh program melalui pengaturan program.
            </p>
          </div>
          <div className="sm:col-span-2">
            {state.status !== "idle" ? (
              <StatusMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</StatusMessage>
            ) : null}
          </div>
          <div className="flex justify-end sm:col-span-2">
            <DialogSubmitButton>
              <Save className="size-4" aria-hidden="true" />
              Simpan card {definition.sequenceNo}
            </DialogSubmitButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export type ProgramSettingsFormData = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export function ProgramSettingsForm({ program }: { program: ProgramSettingsFormData }) {
  const [state, formAction] = useActionState(updateLoyaltyProgramAction, initialState);

  return (
    <form action={formAction} className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
      <input type="hidden" name="programId" value={program.id} />
      <Field
        name="name"
        label="Nama program"
        defaultValue={program.name}
        required
        maxLength={120}
      />
      <label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-line px-3.5 text-sm font-bold text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={program.isActive}
          className="size-4 accent-brand"
        />
        <span>
          <span className="block">Program aktif dan tampil ke customer</span>
          <span className="mt-0.5 block text-xs font-normal leading-5 text-ink-muted">
            Matikan untuk menjeda join, request, dan tampilan journey sampai program diaktifkan lagi.
          </span>
        </span>
      </label>
      <TextareaField
        name="description"
        label="Deskripsi program"
        defaultValue={program.description}
        maxLength={2000}
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        {state.status !== "idle" ? (
          <StatusMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</StatusMessage>
        ) : null}
      </div>
      <div className="flex justify-end sm:col-span-2">
        <DialogSubmitButton>
          <Save className="size-4" aria-hidden="true" />
          Simpan program
        </DialogSubmitButton>
      </div>
    </form>
  );
}
