# Kira Kira Michi Digital Loyalty Card

Aplikasi loyalty mobile-first untuk alur lengkap **scan → join → request stamp → review admin → reward → card berikutnya**. Dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Realtime, dan database RPC transaksional.

## Fitur MVP

- Registrasi, login, reset password, callback PKCE, dan sesi server-side.
- Join via `/join` yang idempotent.
- Enam loyalty card berurutan, delapan stamp per card.
- Request +1/+2, status pending, approval parsial, rejection, dan realtime refresh.
- Reward available/expired/redeemed dengan snapshot masa berlaku, history, profile, dan marketing preference.
- Dashboard admin, request inbox, customer directory/detail, controlled adjustments termasuk pembalikan completion yang aman, program editor, audit ledger, dan QR join.
- RLS di seluruh tabel bisnis; mutation privileged hanya lewat RPC `security definer` yang memeriksa role.
- Ledger stamp immutable dan approval memakai row lock dalam satu transaksi PostgreSQL.

## Stack

- Next.js 16.3.1 / React 19.2.8
- TypeScript 6 / Tailwind CSS 4
- `@supabase/ssr` + `@supabase/supabase-js`
- Vitest

## Menjalankan secara lokal

Prasyarat: Node.js 20.9+, npm, Docker Desktop, dan Supabase CLI.

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Isi `.env.local` memakai URL dan publishable/anon key dari output `supabase status`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Untuk project hosted, hubungkan CLI lalu push migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Di Supabase Auth URL Configuration, set Site URL ke origin aplikasi dan tambahkan redirect URL:

```text
http://localhost:3000/auth/callback
https://domain-produksi.example/auth/callback
```

## Membuat akun uji dengan aman

Tidak ada kredensial default yang ditanam di repository atau seed. Untuk customer uji, daftar lewat `/auth/register` menggunakan alamat email staging yang dapat menerima link konfirmasi.

Tidak ada registrasi admin publik. Untuk admin uji, buat user melalui Supabase Dashboard > Authentication, konfirmasi emailnya, lalu **sebelum login pertama kali ke aplikasi** promote profile secara terkontrol lewat SQL Editor sebagai pemilik project:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

Gunakan email test yang tidak dipakai di produksi dan password unik dari password manager. Membuat admin sebelum login pertama mencegah inisialisasi membership customer. Customer tambahan dapat dibuat lewat form registrasi biasa. Jangan pernah menaruh service-role key di `.env.local` frontend atau bundle browser.

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

## Struktur penting

```text
src/app/                 Next.js routes dan server actions
src/components/          UI customer, admin, auth, dan primitives
src/lib/supabase/        Browser/server/proxy Supabase clients
src/lib/loyalty/         Aturan domain dan unit tests
supabase/migrations/     Schema, constraints, RLS, policies, RPC, seed
supabase/tests/          Database/security tests
docs/                    UAT dan security runbook
```

## Route map

Public dan auth:

- `/`, `/join`
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/update-password`, `/auth/callback`

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

## Production checklist

- Jalankan seluruh migration dan seed card definition.
- Set Site URL/redirect URL Auth.
- Promote admin secara terkontrol.
- Aktifkan Realtime untuk tabel yang disertakan migration.
- Ubah judul/deskripsi reward netral dari `/admin/program` sebelum go-live.
- Jalankan [UAT](docs/UAT.md) dan [security runbook](docs/SECURITY.md) terhadap project staging.
