"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, UserRoundX, X } from "lucide-react";
import { deleteCustomerAction, type AdminActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

const initialState: AdminActionState = { status: "idle", message: "" };

export function DeleteCustomerControl({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteCustomerAction, initialState);

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        <UserRoundX className="size-4" aria-hidden="true" /> Hapus user
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-ink/55 p-0 sm:place-items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-danger">Tindakan permanen</p>
                <h2 id="delete-customer-title" className="mt-1 text-xl font-extrabold text-ink">Hapus {customerName}?</h2>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setOpen(false)} disabled={pending} className="grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-surface-muted"><X className="size-4" /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              Profil, akun login, seluruh kartu, stamp, request, reward, riwayat, dan sesi user akan dihapus. Data tidak bisa dipulihkan.
            </p>
            <form action={action} className="mt-5 grid gap-4">
              <input type="hidden" name="customerId" value={customerId} />
              {state.message ? <StatusMessage>{state.message}</StatusMessage> : null}
              <Field label="Ketik HAPUS untuk lanjut" name="confirmation" autoComplete="off" placeholder="HAPUS" required />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
                <Button type="submit" variant="danger" disabled={pending}>
                  {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserRoundX className="size-4" aria-hidden="true" />}
                  Hapus permanen
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
