"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { registerAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AuthState = { status: "idle" };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      {state.message && (
        <StatusMessage tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </StatusMessage>
      )}
      <Field label="Nama lengkap" name="fullName" autoComplete="name" required defaultValue={state.fields?.fullName} placeholder="Nama kamu" />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} placeholder="nama@email.com" />
      <Field label="WhatsApp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required defaultValue={state.fields?.whatsapp} placeholder="08xxxxxxxxxx" hint="Dipakai admin untuk mencocokkan transaksi." />
      <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter" />
      <Field label="Konfirmasi password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required placeholder="Ulangi password" />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-muted p-3 text-xs leading-5 text-ink-muted">
        <input name="marketingConsent" type="checkbox" className="mt-1 size-4 rounded border-line accent-brand" />
        <span>Saya bersedia menerima informasi promo dan program Kira Kira Michi. <strong className="text-ink">Opsional.</strong></span>
      </label>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <>Buat akun <ArrowRight className="size-5" aria-hidden="true" /></>}
      </Button>
      <p className="text-center text-sm text-ink-muted">Sudah punya akun? <Link href="/auth/login" className="font-bold text-brand hover:underline">Masuk</Link></p>
    </form>
  );
}
