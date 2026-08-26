"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Fingerprint, LoaderCircle } from "lucide-react";
import { loginAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AuthState = { status: "idle" };

export function LoginForm({ next = "/loyalty" }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next} />
      {state.message && <StatusMessage>{state.message}</StatusMessage>}
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} placeholder="nama@email.com" />
      <div>
        <Field label="Password" name="password" type="password" autoComplete="current-password" required placeholder="Minimal 8 karakter" />
        <div className="mt-2 text-right">
          <Link href="/auth/forgot-password" className="text-xs font-bold text-brand hover:underline">Lupa password?</Link>
        </div>
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <>Masuk <ArrowRight className="size-5" aria-hidden="true" /></>}
      </Button>
      {next.startsWith("/admin") ? (
        <Link
          href="/auth/admin-login"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink hover:border-brand/40 hover:bg-brand-soft"
        >
          <Fingerprint className="size-4" aria-hidden="true" /> Masuk admin dengan OTP email
        </Link>
      ) : null}
      <p className="text-center text-sm text-ink-muted">Belum punya akun? <Link href="/auth/register" className="font-bold text-brand hover:underline">Daftar</Link></p>
    </form>
  );
}
