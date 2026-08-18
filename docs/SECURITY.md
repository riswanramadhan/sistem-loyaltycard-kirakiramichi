# Security runbook

Database adalah boundary otorisasi utama. Proxy Next.js hanya melakukan session pre-filter; server layouts memeriksa user/role lagi, dan setiap operasi bisnis privileged divalidasi di RPC PostgreSQL.

## Pemeriksaan wajib di staging

Dengan JWT customer, pastikan request berikut ditolak oleh database:

1. `select` profile/member/card/request/reward user lain.
2. `update member_cards set stamps_count = ...`.
3. `update stamp_requests set status/approved_count = ...`.
4. `insert/delete/update stamp_events` secara langsung.
5. `update profiles set role = 'admin'`.
6. Panggil RPC review/adjust/redeem/program update.
7. Redeem reward sendiri atau reward user lain.
8. Panggil `join_loyalty_program` atau `request_stamps` menggunakan profile ber-role admin.
9. Request stamp ketika program sedang dijeda.

Dengan JWT anonymous, pastikan seluruh data customer/admin tidak dapat dibaca. Dengan JWT admin, validasi operasi RPC yang sah tetap memerlukan row yang sesuai dan tidak dapat melampaui constraint.

## Concurrency checks

- Kirim dua `request_stamps` paralel untuk card yang sama; unique pending index hanya menerima satu.
- Review request yang sama dari dua session admin; row lock/status guard hanya menerima satu.
- Approve stale +2 ketika card tinggal satu slot; transaksi ditolak tanpa partial write.
- Redeem reward yang sama dua kali; hanya transaksi pertama berhasil.
- Jeda program bersamaan dengan request baru; row lock program memastikan request tidak lolos setelah pause.
- Buka ulang completed card hanya ketika reward masih available dan card berikutnya belum pernah memiliki aktivitas.
- Redeem reward setelah `expires_at`; RPC harus menolak dengan `reward_expired`.

## Retensi audit

- Actor review/redemption dan pemilik stamp ledger memakai relasi `ON DELETE RESTRICT`.
- Jangan hard-delete akun yang sudah memiliki jejak bisnis. Nonaktifkan akses di Auth dan pertahankan profile untuk kebutuhan audit.
- Pembalikan completion tidak menghapus stamp ledger; RPC menambah event `revoke` dan hanya menghapus reward available yang dibatalkan oleh koreksi tersebut.

## Secrets

- Browser hanya menerima `NEXT_PUBLIC_SUPABASE_URL` dan publishable/anon key.
- Service-role key tidak digunakan oleh aplikasi Next.js ini.
- Jangan log token, password, SQL detail, atau auth metadata sensitif.
- Rotate key dan session jika secret pernah masuk commit/log.

## Release evidence

Simpan output berikut bersama release notes:

```bash
npm run check
npx supabase test db
```

Tambahkan hasil UAT authorization menggunakan customer/admin staging, serta bukti tidak ada service-role string di output build.
