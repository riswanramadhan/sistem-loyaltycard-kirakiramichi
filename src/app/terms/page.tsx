import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description: "Syarat penggunaan Kira Kira Michi Digital Loyalty Card.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_16px_48px_rgba(43,39,40,0.08)] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">Kira Kira Michi Loyalty</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">Syarat dan ketentuan</h1>
        <p className="mt-2 text-sm text-ink-muted">Berlaku mulai 30 Agustus 2026.</p>
        <div className="mt-7 grid gap-6 text-sm leading-7 text-ink-muted">
          <section><h2 className="font-extrabold text-ink">Keanggotaan</h2><p>Akun loyalty bersifat pribadi. Nama, email, WhatsApp, dan tanggal lahir wajib diisi dengan benar agar transaksi dan benefit dapat diverifikasi.</p></section>
          <section><h2 className="font-extrabold text-ink">Stamp dan putaran</h2><p>Satu kartu berisi 6 stamp dan satu putaran berisi 7 kartu. Stamp baru masuk setelah request disetujui admin. Setelah Card 7 selesai, perjalanan kembali ke Card 1 dan jumlah putaran selesai bertambah.</p></section>
          <section><h2 className="font-extrabold text-ink">Reward dan benefit ulang tahun</h2><p>Reward, merchandise ulang tahun, masa berlaku, ketersediaan stok, serta ketentuan penukaran mengikuti informasi program yang tampil di aplikasi atau disampaikan Kira Kira Michi.</p></section>
          <section><h2 className="font-extrabold text-ink">Penggunaan yang wajar</h2><p>Manipulasi transaksi, stamp, akun, atau benefit dapat menyebabkan request ditolak atau keanggotaan ditinjau. Keputusan dan koreksi selalu dicatat dalam riwayat sistem.</p></section>
          <section><h2 className="font-extrabold text-ink">Perubahan ketentuan</h2><p>Kira Kira Michi dapat memperbarui detail program. Perubahan penting akan ditampilkan melalui aplikasi atau kanal resmi Kira Kira Michi.</p></section>
        </div>
        <Link href="/auth/register" className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-strong">Kembali ke pendaftaran</Link>
      </article>
    </main>
  );
}
