import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeJapaneseYen,
  Origami,
  QrCode,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

const steps = [
  { icon: QrCode, title: "Scan & join", copy: "Masuk lewat QR atau link loyalty." },
  { icon: Stamp, title: "Kumpulkan cap", copy: "Request +1 atau +2 setiap transaksi." },
  { icon: BadgeJapaneseYen, title: "Buka reward", copy: "Selesaikan 8 cap untuk lanjut ke card baru." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandLogo priority />
        <Link
          href="/auth/login"
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-brand/40 hover:bg-brand-soft"
        >
          Masuk
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-bold text-warning">
            <Origami className="size-4" aria-hidden="true" /> Digital Loyalty Card
          </span>
          <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.08] sm:text-6xl">
            Cap makin penuh. <span className="text-brand">Reward makin dekat.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-ink-muted sm:text-lg">
            Simpan seluruh loyalty journey Kira Kira Michi langsung di ponselmu—tanpa takut kartunya tertinggal.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/join"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-base font-bold text-white shadow-[0_4px_0_#b9151a] transition hover:bg-brand-strong active:translate-y-0.5 active:shadow-[0_2px_0_#b9151a]"
            >
              Join Loyalty <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-base font-bold text-ink transition hover:border-brand/40"
            >
              Buat akun
            </Link>
          </div>
          <div className="mt-7 flex items-start gap-2 text-xs leading-5 text-ink-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            Aktivitas stamp diverifikasi admin dan tersimpan aman di akunmu.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mr-0">
          <Card className="relative overflow-hidden border-brand/15 p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Loyalty Card 1</p>
                <p className="mt-1 text-2xl font-extrabold">5 of 8 stamps</p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">Active</span>
            </div>
            <div className="mt-8 grid grid-cols-4 gap-3" aria-label="Contoh lima dari delapan stamp">
              {Array.from({ length: 8 }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < 5
                      ? "grid aspect-square place-items-center rounded-2xl border-2 border-brand bg-brand text-white shadow-[0_3px_0_#b9151a]"
                      : "grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-line bg-surface-muted text-ink-faint"
                  }
                >
                  {index < 5 ? <Image src="/kira-kira-michi-stamp-final.png" alt="" width={64} height={64} className="size-full object-contain" /> : <span className="size-2 rounded-full bg-line" />}
                </span>
              ))}
            </div>
            <div className="mt-7 rounded-xl bg-warning-soft p-4">
              <p className="text-sm font-extrabold text-ink">Tinggal 3 stamp lagi</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">Selesaikan card ini untuk membuka reward berikutnya.</p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-12 sm:px-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex gap-4 rounded-2xl p-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-extrabold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
