# Manual UAT

Jalankan pada project Supabase staging yang sudah menerima seluruh migration. Gunakan dua browser profile terpisah agar customer dan admin dapat aktif bersamaan.

## Customer flow

- [ ] Buka `/join` saat logged out; CTA menuju register/login dan return path aman.
- [ ] Register dengan consent tidak dicentang; profile terbentuk sebagai `customer`.
- [ ] Card 1 aktif; Card 2–6 locked; scan `/join` ulang tidak membuat duplikasi.
- [ ] Request +1; satu pending state muncul dan double tap tidak membuat request kedua.
- [ ] Request +2 pada card yang cukup kapasitas; +2 disabled saat tersisa satu slot.
- [ ] Admin approve; customer menerima refresh realtime dan stamp approved bertambah.
- [ ] Admin partial approve +2 menjadi +1; progress hanya bertambah satu.
- [ ] Admin reject; progress customer tidak berubah dan note tampil di history.
- [ ] Approval stamp ke-8 menyelesaikan card, membuka reward, dan mengaktifkan card berikutnya.
- [ ] Card berikutnya aktif walaupun reward sebelumnya belum redeemed.
- [ ] Rewards tersedia/locked/kedaluwarsa/redeemed berada di section yang benar; reward kedaluwarsa tidak dapat ditebus.
- [ ] Profile hanya dapat mengubah nama, WhatsApp, dan marketing preference.
- [ ] Reset/change password dan logout bekerja.

## Admin flow

- [ ] Customer yang membuka `/admin` diarahkan ke halaman forbidden.
- [ ] Metrics dashboard sesuai data dan pending queue menampilkan request terbaru lebih dahulu.
- [ ] Filter Pending/Approved/Rejected dan search customer bekerja.
- [ ] Approve, partial approve, reject menampilkan loading/feedback dan tidak bisa disubmit ganda.
- [ ] Dua admin mencoba approve request yang sama; hanya satu transaksi berhasil.
- [ ] Grant/revoke membutuhkan reason, membuat event immutable, dan tidak bisa melewati 0/8.
- [ ] Revoke pada completion terakhir membuka ulang kartu secara atomik hanya bila reward belum ditebus dan kartu berikutnya belum memiliki aktivitas.
- [ ] Reward hanya dapat redeemed sekali dan menyimpan admin/timestamp/note.
- [ ] Program editor mengubah nama/deskripsi/status program dan copy/reward, tetapi tidak menawarkan perubahan 6 cards/8 stamps atau menonaktifkan satu definisi kartu.
- [ ] Saat program dijeda, join/request/journey customer berhenti dengan aman; aktifkan kembali dan pastikan progres lama tetap utuh.
- [ ] QR mengarah tepat ke `/join`, dapat disalin, diunduh, dan dicetak.
- [ ] Audit menampilkan event beserta actor/reason.

## Responsive & accessibility

- [ ] Customer: 320, 375, 390, 430, 768, dan 1024px; tanpa overflow horizontal tak disengaja.
- [ ] Admin: 375, 768, 1024, dan 1440px.
- [ ] Semua form dapat diselesaikan dengan keyboard; focus ring terlihat.
- [ ] Dialog/bottom sheet memiliki label, close action, Escape, dan focus handling.
- [ ] Status tidak bergantung pada warna saja.
- [ ] `prefers-reduced-motion: reduce` menonaktifkan animasi non-esensial.
- [ ] Console browser bersih dari runtime error dan asset 404.

Catat project ref, browser/device, tanggal, tester, dan bukti hasil untuk setiap release candidate.
