"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound, LoaderCircle, RotateCw } from "lucide-react";
import {
  resendEmailOtpAction,
  verifyEmailOtpAction,
  type AuthState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AuthState = { status: "idle" };

export function VerifyOtpForm({ email, mode }: { email: string; mode: "signup" | "admin" }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailOtpAction, initialState);
  const [resendState, resendAction, resending] = useActionState(resendEmailOtpAction, initialState);

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-line bg-surface-muted p-4 text-sm leading-6 text-ink-muted">
        Kode verifikasi dikirim ke <strong className="break-all text-ink">{email}</strong>. Kode hanya dapat dipakai sekali dan akan kedaluwarsa.
      </div>

      <form action={verifyAction} className="grid gap-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="mode" value={mode} />
        {verifyState.message ? <StatusMessage>{verifyState.message}</StatusMessage> : null}
        <Field
          label="Kode OTP"
          name="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          placeholder="000000"
          className="text-center text-2xl font-extrabold tracking-[0.35em]"
          required
          autoFocus
        />
        <Button type="submit" size="lg" className="w-full" disabled={verifying}>
          {verifying ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <><KeyRound className="size-5" aria-hidden="true" /> Verifikasi email</>}
        </Button>
      </form>

      <form action={resendAction} className="grid gap-3 border-t border-line pt-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="mode" value={mode} />
        {resendState.message ? (
          <StatusMessage tone={resendState.status === "success" ? "success" : "error"}>
            {resendState.message}
          </StatusMessage>
        ) : null}
        <Button type="submit" variant="secondary" className="w-full" disabled={resending}>
          {resending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <><RotateCw className="size-4" aria-hidden="true" /> Kirim ulang OTP</>}
        </Button>
      </form>

      <Link href={mode === "admin" ? "/auth/admin-login" : "/auth/register"} className="text-center text-sm font-bold text-ink-muted hover:text-brand">
        Gunakan email lain
      </Link>
    </div>
  );
}
