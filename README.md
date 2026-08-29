# Kira Kira Michi Digital Loyalty Card

Aplikasi loyalty mobile-first untuk alur lengkap **scan -> join -> request stamp -> review admin -> reward -> card berikutnya**. Dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Realtime, dan database RPC transaksional.

## Fitur MVP

- Registrasi, login, verifikasi email dengan OTP delapan digit, reset password lewat link, dan sesi server-side.
- Join via `/join` yang idempotent.
- Tujuh loyalty card berurutan, enam stamp per card, lalu berulang ke Card 1 dengan badge jumlah putaran.
- Request +1 sampai +6, status pending, approval parsial, rejection, dan sinkronisasi realtime.
- Reward tersedia/kedaluwarsa/ditebus per putaran, history, profile, tanggal lahir, dan persetujuan syarat.
- Dashboard admin, request inbox, customer directory/detail, controlled adjustments termasuk pembalikan completion yang aman, program editor, audit ledger, dan QR join.
- Login admin via OTP email, pembuatan admin dari workspace, dan penghapusan customer beserta seluruh data akun.
- Toast approval/rejection 5 detik dengan progress bar, confetti setiap stamp, popup request 4 detik, kontak WA/IG, dan UI anti-auto-zoom di mobile.
- RLS di seluruh tabel bisnis; mutation privileged hanya lewat RPC `security definer` yang memeriksa role.
- Ledger stamp immutable dan approval memakai row lock dalam satu transaksi PostgreSQL.

## Stack

- Next.js 16.3.1 / React 19.2.8
- TypeScript 6 / Tailwind CSS 4
- `@supabase/ssr` + `@supabase/supabase-js`
- Vitest

## Production Di Vercel

Set environment variable berikut di Vercel Project Settings > Environment Variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://kirakiraloyaltycard.web.id
```

Gunakan domain HTTPS asli untuk `NEXT_PUBLIC_SITE_URL`. Jangan memakai `localhost` di production. Aplikasi Next.js tidak membutuhkan service-role key; undangan admin memakai RPC database yang memeriksa role, lalu Supabase Auth mengirim OTP.

Hubungkan Supabase CLI lalu push migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Setup OTP Auth Supabase

Di Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://kirakiraloyaltycard.web.id`
- **Redirect URLs**: tambahkan `https://kirakiraloyaltycard.web.id/auth/callback**`
- Tambahkan `https://kirakiraloyaltycard.web.id/auth/confirm**` untuk reset password dan fallback link server-side.
- Pertahankan **Confirm email** aktif agar signup mengirim OTP.
- Atur **Email OTP length** ke `8` dan **Email OTP expiration** ke `300` detik (5 menit). Nilai yang sama sudah ditetapkan di `supabase/config.toml` untuk local development.

Di Supabase Dashboard > Authentication > Email Templates:

- **Confirm signup**: salin source `supabase/templates/confirmation.html` agar menampilkan `{{ .Token }}`.
- **Magic Link**: salin `supabase/templates/magic-link.html`; template ini dipakai untuk OTP login admin.
- **Reset password**: salin `supabase/templates/recovery.html`.
- **Invite user** dan **Change email** tersedia di folder yang sama.

Halaman `/auth/verify-otp` memverifikasi pasangan email + OTP di server. Setelah berhasil, customer langsung dibuatkan membership secara idempotent; akun admin masih wajib lolos pengecekan role database sebelum masuk workspace. `/auth/confirm` dipertahankan untuk reset password dan fallback link berbasis `TokenHash`.

### SMTP Production

Di Supabase Dashboard > Authentication > Emails > SMTP Settings, aktifkan **Custom SMTP** dan gunakan sender `dekatlokal@kirakiraloyaltycard.web.id`. SMTP bawaan hanya untuk percobaan dan tidak cocok untuk pengiriman email autentikasi production.

Setelah SMTP aktif:

1. Gunakan domain pengirim yang sudah memiliki SPF, DKIM, dan DMARC.
2. Matikan link tracking di penyedia SMTP agar URL autentikasi tidak ditulis ulang dan menjadi rusak.
3. Di Authentication > Sign In / Providers > Email, pertahankan **Confirm email** aktif.
4. Gunakan masa berlaku OTP 300 detik dan pertahankan jeda pengiriman minimal 60 detik untuk mengurangi abuse.
5. Kirim email percobaan untuk signup, reset password, dan login admin dari domain production sebelum go-live.

## Admin Production

Setelah migration terbaru berhasil dipush, siapkan admin awal yang diminta dengan menjalankan seluruh isi `supabase/sql/create-primary-admin.sql` di Supabase Dashboard > SQL Editor:

```text
Email: kirakiramichi@dekatlokal.com
Password awal: `Kirakiramichi0110!`
```

SQL tersebut idempotent: akun dibuat bila belum ada, atau password dan role diperbarui bila sudah ada. Ganti password awal setelah login pertama. Jangan membagikan atau menyimpan salinan SQL berpassword di tempat publik.

Admin tambahan dibuat hanya dari `/admin/admins`:

1. Admin aktif membuka menu **Akun admin**.
2. Isi nama dan email baru, termasuk Gmail.
3. RPC database menyimpan undangan setelah memverifikasi role admin.
4. Supabase Auth membuat akun undangan dan mengirim OTP bermerek; saat akun dibuat, trigger memberi role admin berdasarkan undangan aktif.
5. Admin baru membuka tombol di email, memasukkan OTP delapan digit, lalu langsung masuk workspace.

Tidak ada registrasi admin publik. Customer biasa tidak dapat mempromosikan diri sendiri; role selalu diperiksa lagi di database.

## Penghapusan Customer

Tombol **Hapus user** berada di `/admin/customers/[id]`. Admin harus mengetik `HAPUS` sebelum aksi dijalankan. Database menghapus dalam satu transaksi:

- reward dan redemption;
- stamp ledger dan request;
- seluruh member card dan membership;
- profil, sesi, identity, dan akun login.

RPC hanya menerima target dengan role `customer`, menolak self-delete admin, dan tetap dilindungi pemeriksaan admin di database. Penghapusan final memakai Admin API server-only; trigger database membersihkan data loyalty dalam transaksi penghapusan akun yang sama, lalu sesi dan refresh token ikut dicabut.

## Alternatif Setup Admin Manual

Jika bootstrap script tidak dapat dijalankan, buat user melalui Supabase Dashboard > Authentication, lalu jalankan sebagai pemilik project:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users where email = 'kirakiramichi@dekatlokal.com'
);
```

## Commands

```bash
npm run dev        # development server
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # unit tests
npm run build      # production build
npm run check      # seluruh quality gates
```

Database test yang membutuhkan local Supabase dijalankan dengan:

```bash
npx supabase test db
```

## Struktur Penting

```text
src/app/                 Next.js routes dan server actions
src/components/          UI customer, admin, auth, dan primitives
src/lib/supabase/        Browser/server/proxy Supabase clients
src/lib/loyalty/         Aturan domain dan unit tests
supabase/migrations/     Schema, constraints, RLS, policies, RPC, seed
supabase/tests/          Database/security tests
docs/                    UAT dan security runbook
```

## Route Map

Public dan auth:

- `/`, `/join`
- `/auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/forgot-password`, `/auth/confirm`, `/auth/callback`, `/auth/update-password`
- `/auth/admin-login`

Customer:

- `/loyalty`
- `/loyalty/rewards`
- `/loyalty/history`
- `/loyalty/profile`

Admin:

- `/admin`
- `/admin/requests`
- `/admin/customers`
- `/admin/customers/[id]`
- `/admin/program`
- `/admin/qr`
- `/admin/audit`
- `/admin/admins`
- `/admin/more`

## Production Checklist

- Jalankan seluruh migration dan seed card definition.
- Set Site URL Auth ke domain Vercel/production.
- Salin template HTML bermerek dari `supabase/templates` ke Email Templates Supabase dan pastikan kode `{{ .Token }}` tampil pada signup serta Magic Link/OTP.
- Pastikan migration `20260830000400_passwordless_admin_invitations.sql` sudah diterapkan; undangan admin tidak memakai Edge Function maupun secret key Vercel.
- Jalankan `supabase/sql/create-primary-admin.sql`, login, lalu ganti password awal.
- Aktifkan Realtime untuk tabel yang disertakan migration.
- Ubah judul/deskripsi reward netral dari `/admin/program` sebelum go-live.
- Jalankan [UAT](docs/UAT.md) dan [security runbook](docs/SECURITY.md) terhadap project staging.
