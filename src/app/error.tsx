"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <section className="max-w-md text-center">
        <p className="text-sm font-bold text-brand">Ada kendala kecil</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Halaman belum bisa dibuka</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Coba muat ulang sebentar lagi. Aktivitas loyalty-mu tetap aman.
        </p>
        <Button className="mt-7" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
        </Button>
      </section>
    </main>
  );
}
