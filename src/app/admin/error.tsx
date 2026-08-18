"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <Card className="grid min-h-[24rem] place-items-center p-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <CircleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold text-ink">Data admin belum bisa dimuat</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Koneksi atau sesi mungkin terputus. Coba muat ulang tanpa mengulangi aksi yang sudah berhasil.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Coba lagi
        </Button>
      </div>
    </Card>
  );
}
