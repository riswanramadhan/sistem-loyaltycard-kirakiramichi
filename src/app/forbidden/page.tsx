import Link from "next/link";
import { ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <section className="max-w-md text-center">
        <BrandLogo className="mx-auto" priority />
        <ShieldX className="mx-auto mt-8 size-10 text-brand" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-extrabold">Akses tidak tersedia</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Halaman ini hanya dapat dibuka oleh admin Kira Kira Michi.
        </p>
        <Link
          href="/loyalty"
          className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white"
        >
          Kembali ke loyalty
        </Link>
      </section>
    </main>
  );
}
