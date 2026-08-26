import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Gift, QrCode, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Join Loyalty",
  description: "Gabung Kira Kira Michi Digital Loyalty Card dan mulai kumpulkan stamp.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage() {
  const user = await getCurrentUser();
  if (user) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("join_loyalty_program", {
      p_program_slug: "kira-kira-michi-loyalty",
    });
    if (!error) redirect("/loyalty");
    console.error("Join loyalty failed", error.message);
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-lg place-items-center px-5 py-10">
      <section className="w-full">
        <BrandLogo className="mx-auto" priority />
        <Card className="mt-8 overflow-hidden p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <QrCode className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold">Join Kira Kira Michi Loyalty</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">Kumpulkan 8 stamp di setiap card, buka reward, dan lanjutkan sampai Card 6.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-left text-xs">
            <div className="rounded-xl bg-warning-soft p-3"><Sparkles className="size-5 text-warning" aria-hidden="true" /><p className="mt-2 font-bold text-ink">Request +1 / +2</p></div>
            <div className="rounded-xl bg-brand-soft p-3"><Gift className="size-5 text-brand" aria-hidden="true" /><p className="mt-2 font-bold text-ink">6 reward stages</p></div>
          </div>
          {user ? (
            <div role="alert" className="mt-6 rounded-xl bg-danger-soft p-3 text-sm text-danger">Loyalty belum bisa diaktifkan. Coba lagi sebentar ya.</div>
          ) : (
            <div className="mt-7 grid gap-3">
              <Link href="/auth/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-bold text-white shadow-[0_4px_0_#b9151a]">Join Loyalty <ArrowRight className="size-5" aria-hidden="true" /></Link>
              <Link href="/auth/login?next=/join" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink">Sudah punya akun? Masuk</Link>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
