"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle, MailCheck, Origami } from "lucide-react";
import { requestAdminLoginOtpAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AuthState = { status: "idle" };

export function AdminLinkLoginForm() {
  const [state, action, pending] = useActionState(requestAdminLoginOtpAction, initialState);

  return (
    <form action={action} className="grid gap-5">
      {state.message ? (
        <StatusMessage tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </StatusMessage>
      ) : null}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-muted p-3.5">
        <Origami className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-sm leading-6 text-ink-muted">
          Masukkan email admin. Kode OTP enam digit akan dikirim ke inbox kamu.
        </p>
      </div>
      <Field
        label="Email admin"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="admin@gmail.com"
        required
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <>
            <MailCheck className="size-5" aria-hidden="true" /> Kirim kode OTP
          </>
        )}
      </Button>
      <Link href="/auth/login?next=/admin" className="text-center text-sm font-bold text-ink-muted hover:text-brand">
        Masuk pakai password
      </Link>
    </form>
  );
}
