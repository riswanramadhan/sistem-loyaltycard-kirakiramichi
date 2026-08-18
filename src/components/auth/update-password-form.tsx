"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { updatePasswordAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AuthState = { status: "idle" };

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      {state.message && <StatusMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</StatusMessage>}
      <Field label="Password baru" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Konfirmasi password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <><KeyRound className="size-5" aria-hidden="true" /> Simpan password</>}
      </Button>
    </form>
  );
}
