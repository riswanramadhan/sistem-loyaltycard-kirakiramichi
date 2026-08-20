"use client";

import { RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoyaltyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-[1.75rem] border border-line bg-white px-6 py-10 text-center shadow-[0_12px_36px_rgba(43,39,40,0.07)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <WifiOff className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-ink">Loyalty belum bisa dimuat</h1>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Koneksi atau data kamu sedang diperbarui. Tidak ada progress yang hilang—coba muat lagi.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        <RotateCw className="size-4" aria-hidden="true" /> Coba lagi
      </Button>
    </section>
  );
}
