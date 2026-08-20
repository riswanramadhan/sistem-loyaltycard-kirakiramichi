"use client";

import { useActionState } from "react";
import { AtSign, LoaderCircle, Origami, UserRoundPlus } from "lucide-react";
import { createAdminAccountAction, type AdminActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AdminActionState = { status: "idle", message: "" };

export function AdminAccountForm() {
  const [state, action, pending] = useActionState(createAdminAccountAction, initialState);

  return (
    <form action={action} className="grid gap-4">
      {state.message ? <StatusMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</StatusMessage> : null}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-muted p-3.5">
        <Origami className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-sm leading-6 text-ink-muted">
          Akun baru masuk lewat link pribadi di email. Tidak ada password bersama yang perlu dibagikan.
        </p>
      </div>
      <Field label="Nama admin" name="fullName" autoComplete="name" maxLength={100} placeholder="Nama panggilan admin" required />
      <Field label="Email admin" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="nama@gmail.com" required />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserRoundPlus className="size-4" aria-hidden="true" />}
        {pending ? "Menyiapkan akun..." : "Tambah admin & kirim link"}
      </Button>
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <AtSign className="size-3.5" aria-hidden="true" /> Gmail maupun email bisnis bisa dipakai.
      </p>
    </form>
  );
}
