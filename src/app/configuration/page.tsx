import { Terminal } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

export default function ConfigurationPage() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-2xl place-items-center px-5 py-12">
      <section className="w-full">
        <BrandLogo priority />
        <Card className="mt-8 p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-warning-soft text-warning">
            <Terminal className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Hubungkan Supabase dahulu</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Salin <code className="rounded bg-surface-muted px-1.5 py-0.5">.env.example</code> menjadi
            <code className="ml-1 rounded bg-surface-muted px-1.5 py-0.5">.env.local</code>, lalu isi URL dan publishable key project Supabase.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-6 text-white">
            <code>NEXT_PUBLIC_SUPABASE_URL=...{"\n"}NEXT_PUBLIC_SUPABASE_ANON_KEY=...{"\n"}NEXT_PUBLIC_SITE_URL=http://localhost:3000</code>
          </pre>
          <p className="mt-5 text-xs leading-5 text-ink-muted">
            Jalankan migration di folder <code>supabase/migrations</code> sebelum membuka flow customer atau admin.
          </p>
        </Card>
      </section>
    </main>
  );
}
