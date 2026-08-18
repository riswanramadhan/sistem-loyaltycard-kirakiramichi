import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl items-center px-5 py-8 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
      <section className="hidden lg:block">
        <BrandLogo className="h-16 w-52" priority />
        <p className="mt-8 max-w-md text-4xl font-extrabold leading-tight tracking-[-0.04em]">
          Satu akun untuk semua <span className="text-brand">stamp dan reward</span> kamu.
        </p>
        <p className="mt-4 max-w-md leading-7 text-ink-muted">Cepat dipakai, mudah dicek, dan tidak akan tertinggal di rumah.</p>
      </section>
      <section className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-ink-muted hover:text-brand">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali
        </Link>
        <Card className="p-5 sm:p-7">
          <BrandLogo className="mb-7 lg:hidden" priority />
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
          <div className="mt-7">{children}</div>
        </Card>
      </section>
    </main>
  );
}
