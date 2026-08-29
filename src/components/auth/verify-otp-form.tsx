"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Clock3, KeyRound, LoaderCircle, RotateCw } from "lucide-react";
import {
  resendEmailOtpAction,
  verifyEmailOtpAction,
  type AuthState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";
import {
  EMAIL_OTP_EXPIRY_SECONDS,
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth/otp";

const initialState: AuthState = { status: "idle" };

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VerifyOtpForm({
  email,
  mode,
  sentAt,
}: {
  email: string;
  mode: "signup" | "admin";
  sentAt: number;
}) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailOtpAction, initialState);
  const [resendState, resendAction, resending] = useActionState(resendEmailOtpAction, initialState);
  const activeSentAt = useMemo(() => {
    const resentAt = Number(resendState.fields?.sentAt);
    return Number.isFinite(resentAt) && resentAt > 0 ? resentAt : sentAt;
  }, [resendState.fields?.sentAt, sentAt]);
  const [timing, setTiming] = useState({
    remaining: EMAIL_OTP_EXPIRY_SECONDS,
    cooldown: EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  });

  useEffect(() => {
    if (activeSentAt <= 0) return;

    function updateTiming() {
      const elapsed = Math.max(0, Math.floor((Date.now() - activeSentAt) / 1000));
      setTiming({
        remaining: Math.max(0, EMAIL_OTP_EXPIRY_SECONDS - elapsed),
        cooldown: Math.max(0, EMAIL_OTP_RESEND_COOLDOWN_SECONDS - elapsed),
      });
    }

    updateTiming();
    const interval = window.setInterval(updateTiming, 1000);
    return () => window.clearInterval(interval);
  }, [activeSentAt]);

  const hasSendTime = activeSentAt > 0;
  const expired = hasSendTime && timing.remaining === 0;

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-line bg-surface-muted p-4 text-sm leading-6 text-ink-muted">
        Kode verifikasi <strong className="text-ink">{EMAIL_OTP_LENGTH} digit</strong> dikirim ke <strong className="break-all text-ink">{email}</strong>. Gunakan seluruh digit persis seperti di email.
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs">
          <Clock3 className="size-4 text-brand" aria-hidden="true" />
          {expired ? (
            <strong className="text-danger">Kode sudah kedaluwarsa. Kirim kode baru.</strong>
          ) : !hasSendTime ? (
            <span>Kode berlaku <strong className="text-ink">5 menit sejak email dikirim</strong>.</span>
          ) : (
            <span>Kode berlaku 5 menit · tersisa <strong className="tabular-nums text-ink">{formatTime(timing.remaining)}</strong></span>
          )}
        </div>
      </div>

      <form action={verifyAction} className="grid gap-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="sentAt" value={activeSentAt > 0 ? activeSentAt : ""} />
        {verifyState.message ? <StatusMessage>{verifyState.message}</StatusMessage> : null}
        <Field
          label={`Kode OTP ${EMAIL_OTP_LENGTH} digit`}
          name="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`[0-9]{${EMAIL_OTP_LENGTH}}`}
          minLength={EMAIL_OTP_LENGTH}
          maxLength={EMAIL_OTP_LENGTH}
          placeholder={"0".repeat(EMAIL_OTP_LENGTH)}
          className="text-center text-xl font-extrabold tracking-[0.22em] sm:text-2xl sm:tracking-[0.35em]"
          onInput={(event) => {
            event.currentTarget.value = event.currentTarget.value
              .replace(/\D/g, "")
              .slice(0, EMAIL_OTP_LENGTH);
          }}
          hint="Jika kode salah, periksa urutan semua digit. Kode baru akan membatalkan kode sebelumnya."
          required
          autoFocus
        />
        <Button type="submit" size="lg" className="w-full" disabled={verifying || expired}>
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
        <Button type="submit" variant="secondary" className="w-full" disabled={resending || (hasSendTime && timing.cooldown > 0)}>
          {resending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <><RotateCw className="size-4" aria-hidden="true" /> {hasSendTime && timing.cooldown > 0 ? `Kirim ulang dalam ${timing.cooldown} detik` : "Kirim ulang OTP"}</>
          )}
        </Button>
      </form>

      <Link href={mode === "admin" ? "/auth/admin-login" : "/auth/register"} className="text-center text-sm font-bold text-ink-muted hover:text-brand">
        Gunakan email lain
      </Link>
    </div>
  );
}
