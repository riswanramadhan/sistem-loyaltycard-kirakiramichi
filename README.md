# Kira Kira Michi Digital Loyalty Card

Aplikasi loyalty mobile-first untuk alur lengkap **scan -> join -> request stamp -> review admin -> reward -> card berikutnya**. Dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Realtime, dan database RPC transaksional.

## Fitur MVP

- Registrasi, login, verifikasi email lewat link, reset password lewat link, dan sesi server-side.
- Join via `/join` yang idempotent.
- Enam loyalty card berurutan, delapan stamp per card.
- Request +1/+2, status pending, approval parsial, rejection, dan realtime refresh.
- Reward available/expired/redeemed dengan snapshot masa berlaku, history, profile, dan marketing preference.
- Dashboard admin, request inbox, customer directory/detail, controlled adjustments termasuk pembalikan completion yang aman, program editor, audit ledger, dan QR join.
- Login admin via link email, pembuatan admin dari workspace, dan penghapusan customer beserta seluruh data akun.
- Toast approval/rejection 5 detik, confetti saat card penuh, cap logo Kira Kira Michi, kontak WA/IG, dan UI anti-auto-zoom di mobile.
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
NEXT_PUBLIC_SITE_URL=https://domain-produksi-anda.com
SUPABASE_SERVICE_ROLE_KEY=...
```

Gunakan domain HTTPS asli untuk `NEXT_PUBLIC_SITE_URL`. Jangan memakai `localhost` di production. `SUPABASE_SERVICE_ROLE_KEY` wajib server-only: jangan pernah memakai prefix `NEXT_PUBLIC_` dan jangan menaruh nilainya di source code.

Hubungkan Supabase CLI lalu push migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Setup Link Auth Supabase

Di Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://domain-produksi-anda.com`
- **Redirect URLs**: tambahkan `https://domain-produksi-anda.com/auth/callback**`
- Tambahkan juga `https://domain-produksi-anda.com/auth/confirm**` untuk endpoint konfirmasi server-side.
- Hapus URL `localhost` dan `/auth/verify-otp` dari konfigurasi production bila sudah tidak digunakan.

Di Supabase Dashboard > Authentication > Email Templates:

- **Confirm signup**: tombol harus menuju link konfirmasi akun di bawah.
- **Reset password**: tombol harus menuju link reset password di bawah.
- **Magic Link**: tombol harus menuju link login admin di bawah.
- Jangan tampilkan `{{ .Token }}` karena aplikasi tidak lagi meminta pengguna memasukkan kode.

Link tombol untuk masing-masing template:

```html
<!-- Confirm signup -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/loyalty">
  Verifikasi email
</a>

<!-- Reset password -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/auth/update-password">
  Reset password
</a>

<!-- Magic Link untuk admin -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/admin">
  Masuk ke admin
</a>
```

Gunakan hanya satu link yang sesuai pada setiap template, bukan ketiganya sekaligus. Endpoint `/auth/confirm` memverifikasi token dari link di server, membuat sesi cookie, lalu mengarahkan customer ke loyalty, admin ke workspace admin, atau pengguna reset password ke halaman password baru. Role admin tetap diperiksa di server sebelum akses `/admin` diberikan.

### SMTP Production

Di Supabase Dashboard > Authentication > Emails > SMTP Settings, aktifkan **Custom SMTP** dan isi host, port, username, password, sender email, serta sender name dari penyedia email transaksi Anda. SMTP bawaan hanya untuk percobaan dan tidak cocok untuk pengiriman email autentikasi production.

Setelah SMTP aktif:

1. Gunakan domain pengirim yang sudah memiliki SPF, DKIM, dan DMARC.
2. Matikan link tracking di penyedia SMTP agar URL autentikasi tidak ditulis ulang dan menjadi rusak.
3. Di Authentication > Sign In / Providers > Email, pertahankan **Confirm email** aktif.
4. Gunakan masa berlaku link yang singkat dan pertahankan jeda pengiriman minimal 60 detik untuk mengurangi abuse.
5. Kirim email percobaan untuk signup, reset password, dan login admin dari domain production sebelum go-live.

## Admin Production

Setelah migration terbaru berhasil dipush, siapkan admin awal yang diminta:

```text
Email: kirakiramichi@admin.com
Password awal: kirakiramichi0110
```

Jalankan bootstrap satu kali terhadap project production. Contoh PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY_PRODUCTION"
npm run admin:bootstrap
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

Skrip bersifat idempotent: akun dibuat bila belum ada, password disetel sesuai nilai bootstrap, lalu profil dipromosikan ke role admin. Setelah login pertama, segera ganti password melalui alur **Lupa password** memakai link email.

Admin tambahan dibuat hanya dari `/admin/admins`:

1. Admin aktif membuka menu **Akun admin**.
2. Isi nama dan email baru, termasuk Gmail.
3. Sistem membuat akun tanpa password bersama dan mengirim link login pertama.
4. Admin baru masuk dari `/auth/admin-login`, lalu klik link yang diterima lewat email.

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
  select id from auth.users where email = 'kirakiramichi@admin.com'
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
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/confirm`, `/auth/callback`, `/auth/update-password`
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
- Ubah tiga template email Supabase agar tombol memakai `{{ .TokenHash }}` menuju `/auth/confirm`; jangan tampilkan kode OTP.
- Tambahkan `SUPABASE_SERVICE_ROLE_KEY` hanya di environment server Vercel.
- Jalankan `npm run admin:bootstrap`, login, lalu ganti password awal.
- Aktifkan Realtime untuk tabel yang disertakan migration.
- Ubah judul/deskripsi reward netral dari `/admin/program` sebelum go-live.
- Jalankan [UAT](docs/UAT.md) dan [security runbook](docs/SECURITY.md) terhadap project staging.
