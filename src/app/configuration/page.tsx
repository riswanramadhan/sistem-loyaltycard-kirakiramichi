import { Origami } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

export default function ConfigurationPage() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-2xl place-items-center px-5 py-12">
      <section className="w-full">
        <BrandLogo priority />
        <Card className="mt-8 p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-warning-soft text-warning">
            <Origami className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Layanan sedang disiapkan</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Chotto matte, ya. Tim kami sedang menyiapkan loyalty agar bisa dipakai dengan lancar.
          </p>
          <a href="https://wa.me/6289529974959" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white">
            <SiWhatsapp className="size-4" aria-hidden="true" /> Hubungi admin
          </a>
        </Card>
      </section>
    </main>
  );
}
