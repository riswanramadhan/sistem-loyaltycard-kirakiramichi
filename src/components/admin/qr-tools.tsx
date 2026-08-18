"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Clipboard, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrTools({ joinUrl, qrDataUrl }: { joinUrl: string; qrDataUrl: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)] lg:items-center">
      <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-line bg-white p-5 shadow-[0_16px_40px_rgba(43,39,40,0.08)] print:border-0 print:shadow-none">
        <div className="rounded-2xl border-4 border-brand bg-white p-3">
          <Image src={qrDataUrl} width={800} height={800} unoptimized alt={`QR code menuju ${joinUrl}`} className="aspect-square h-auto w-full" />
        </div>
        <div className="mt-4 text-center">
          <p className="text-lg font-extrabold text-ink">Scan & kumpulkan stamp</p>
          <p className="mt-1 text-sm text-ink-muted">Kira Kira Michi Loyalty</p>
          <p className="mt-3 break-all text-[10px] leading-4 text-ink-faint">{joinUrl}</p>
        </div>
      </div>

      <div className="min-w-0 print:hidden">
        <h2 className="font-extrabold text-ink">Public join link</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">QR hanya memuat URL publik di bawah ini dan tidak menyimpan token atau informasi customer.</p>
        <div className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
          <code className="block break-all text-sm font-medium text-ink">{joinUrl}</code>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyLink}>
            {copyStatus === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
            {copyStatus === "copied" ? "Tersalin" : "Salin link"}
          </Button>
          <a
            href={qrDataUrl}
            download="kira-kira-michi-loyalty-qr.png"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-brand/50 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <Download className="size-4" aria-hidden="true" />
            Download PNG
          </a>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Cetak
          </Button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-ink-muted">
          {copyStatus === "copied" ? "Join link berhasil disalin." : copyStatus === "error" ? "Link belum bisa disalin otomatis. Pilih URL di atas lalu salin manual." : ""}
        </p>
      </div>
    </div>
  );
}
