import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <section className="max-w-md text-center">
        <BrandLogo className="mx-auto" priority />
        <p className="mt-8 text-sm font-bold text-brand">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Link ini mungkin sudah berubah. Yuk kembali ke halaman utama.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali
        </Link>
      </section>
    </main>
  );
}
