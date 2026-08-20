"use client";

import { useActionState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { forgotPasswordAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AuthState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      {state.message && <StatusMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</StatusMessage>}
      <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <><ShieldCheck className="size-5" aria-hidden="true" /> Kirim link reset</>}
      </Button>
    </form>
  );
}
