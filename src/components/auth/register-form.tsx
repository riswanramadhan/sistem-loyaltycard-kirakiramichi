"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ArrowRight, Check, Circle, LoaderCircle } from "lucide-react";
import { registerAction, type AuthState } from "@/app/auth/actions";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";
import { cn } from "@/lib/utils";

const initialState: AuthState = { status: "idle" };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const passwordChecks = useMemo(() => [
    { label: "Minimal 8 karakter", met: password.length >= 8 },
    { label: "Huruf besar dan kecil", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Minimal satu angka", met: /\d/.test(password) },
    { label: "Minimal satu simbol", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const strength = passwordChecks.filter((item) => item.met).length;
  const strengthLabel = !password
    ? "Belum diisi"
    : (["Lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"] as const)[strength];
  const confirmationError = confirmation && confirmation !== password
    ? "Konfirmasi belum sama dengan password."
    : undefined;

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
      <Field label="Tanggal lahir" name="dateOfBirth" type="date" autoComplete="bday" required defaultValue={state.fields?.dateOfBirth} hint="Wajib diisi untuk benefit ulang tahun, termasuk program merchandise gratis yang berlaku." />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        placeholder="Minimal 8 karakter"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        visible={showPassword}
        onToggleVisibility={() => setShowPassword((value) => !value)}
        hint="Gunakan password unik yang tidak dipakai di akun lain."
      />
      <div className="-mt-2 rounded-xl border border-line bg-surface-muted p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-ink">Kekuatan password</span>
          <span className={cn("font-extrabold", strength >= 3 ? "text-success" : strength >= 2 ? "text-amber-700" : "text-danger")}>
            {strengthLabel}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn(
                "h-1.5 rounded-full bg-line transition-colors",
                strength >= level && (strength >= 3 ? "bg-success" : strength >= 2 ? "bg-amber-500" : "bg-danger"),
              )}
            />
          ))}
        </div>
        <ul className="mt-3 grid gap-1.5 text-xs text-ink-muted sm:grid-cols-2">
          {passwordChecks.map((item) => (
            <li key={item.label} className={cn("flex items-center gap-1.5", item.met && "font-semibold text-success")}>
              {item.met ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <PasswordField
        label="Konfirmasi password"
        name="confirmPassword"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        placeholder="Ulangi password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        visible={showConfirmation}
        onToggleVisibility={() => setShowConfirmation((value) => !value)}
        error={confirmationError}
        hint={confirmation && confirmation === password ? "Password sudah sama." : "Ketik ulang password untuk memastikan tidak ada salah tulis."}
      />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-muted p-3 text-xs leading-5 text-ink-muted">
        <input name="termsAccepted" type="checkbox" required className="mt-1 size-4 rounded border-line accent-brand" />
        <span>Saya sudah membaca dan menyetujui <Link href="/terms" target="_blank" className="font-extrabold text-brand hover:underline">syarat dan ketentuan Kira Kira Michi</Link>. <strong className="text-ink">Wajib.</strong></span>
      </label>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <>Buat akun <ArrowRight className="size-5" aria-hidden="true" /></>}
      </Button>
      <p className="text-center text-sm text-ink-muted">Sudah punya akun? <Link href="/auth/login" className="font-bold text-brand hover:underline">Masuk</Link></p>
    </form>
  );
}
