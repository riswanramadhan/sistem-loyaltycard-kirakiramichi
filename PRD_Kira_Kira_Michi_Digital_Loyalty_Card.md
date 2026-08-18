# PRD v1.0 — Kira Kira Michi Digital Loyalty Card

## 1. Product Overview

**Product Name:** Kira Kira Michi Digital Loyalty Card  
**Business:** Kira Kira Michi  
**Product Type:** Customer Loyalty & Digital Stamp System  
**Platform:** Responsive Web Application  
**Primary Device:** Mobile  
**Technology Stack:** Next.js, React, TypeScript, Tailwind CSS, Supabase  
**Design Reference:** https://kirakiramichi.dekatlokal.com  
**Version:** 1.0

---

## 2. Product Vision

Membangun sistem loyalty card digital Kira Kira Michi yang menggantikan kartu stamp fisik menjadi pengalaman digital yang:

- simple untuk customer;
- cepat saat digunakan dalam transaksi;
- tidak membutuhkan aplikasi mobile khusus;
- dapat diakses dari QR Code atau link;
- memiliki approval dari admin;
- memberikan feedback secara realtime;
- menyimpan histori stamp secara transparan;
- membangun database loyal customer;
- dapat digunakan secara berkelanjutan oleh Kira Kira Michi.

### Core Journey

**Scan → Join → Collect → Request → Approve → Complete → Unlock → Repeat**

### Product Principle

> As simple as a physical stamp card, but smarter, traceable, and more personal.

---

## 3. Background & Problem

Sebelumnya loyalty program Kira Kira Michi menggunakan kartu fisik dan stamp.

Pain point utama:

- kartu dapat hilang;
- customer lupa membawa kartu;
- kartu harus dicetak kembali;
- ada biaya cetak berkala;
- tidak ada histori loyalty yang terdokumentasi;
- bisnis tidak memiliki database customer loyalty yang terstruktur;
- customer progress sulit dipantau;
- reward tidak memiliki audit trail;
- loyalty program belum menyatu dengan pengalaman digital brand.

Digital loyalty system harus menyelesaikan masalah tersebut tanpa membuat proses lebih rumit daripada kartu fisik.

---

## 4. Product Goals

### Customer Goals

Customer harus dapat:

1. bergabung melalui QR Code atau link;
2. registrasi satu kali;
3. login kembali tanpa registrasi ulang;
4. melihat seluruh loyalty journey;
5. melihat card aktif dan card terkunci;
6. meminta 1 atau 2 stamp;
7. melihat status request;
8. mendapatkan stamp setelah admin approve;
9. menerima feedback realtime;
10. menyelesaikan card;
11. membuka card berikutnya;
12. melihat reward;
13. melihat histori loyalty;
14. mengelola profil pribadi.

### Admin Goals

Admin harus dapat:

1. melihat seluruh member;
2. melihat pending stamp request;
3. approve / reject request;
4. melakukan partial approval;
5. melihat customer progress;
6. mengatur reward;
7. melakukan controlled adjustment;
8. melihat activity log;
9. melihat dashboard operational;
10. mengelola QR join program.

---

## 5. Non-Goals

Versi MVP tidak mencakup:

- POS;
- payment gateway;
- ecommerce;
- inventory;
- WhatsApp automation;
- advanced CRM;
- referral engine;
- AI recommendation;
- multi-branch support;
- native mobile app.

Fokus produk hanya pada loyalty journey yang sederhana dan reliable.

---

## 6. User Roles

### 6.1 Customer

Customer dapat:

- register;
- login;
- logout;
- melihat loyalty card miliknya;
- request stamp;
- melihat status request;
- melihat reward;
- melihat history;
- mengubah safe profile fields;
- mengubah marketing consent.

Customer tidak dapat:

- memberikan stamp sendiri;
- approve request;
- mengubah jumlah stamp;
- mengakses data customer lain;
- mengubah role;
- membuka card secara manual;
- melakukan reward redemption sebagai admin.

### 6.2 Admin

Admin dapat:

- melihat seluruh member;
- melihat stamp request;
- approve / reject / adjust request;
- melihat detail customer;
- melihat loyalty progression;
- mengatur reward;
- melakukan controlled manual adjustment;
- redeem reward;
- melihat audit log;
- melihat analytics;
- mengakses QR join program.

**Important:** tidak boleh ada public registration untuk admin.

---

## 7. Core Loyalty Rules

### 7.1 Loyalty Structure

Default program:

- **6 Loyalty Cards**
- **8 Stamps per Card**
- **48 approved stamps total** untuk full journey

Angka 6 dan 8 dibuat fixed untuk MVP agar progression customer tidak berubah secara tidak konsisten.

### 7.2 Sequential Progression

Saat customer pertama bergabung:

- Card 1 = **Active**
- Card 2 = **Locked**
- Card 3 = **Locked**
- Card 4 = **Locked**
- Card 5 = **Locked**
- Card 6 = **Locked**

Card berikutnya hanya terbuka setelah card sebelumnya memiliki **8 approved stamps**.

Contoh:

Card 1 → 8/8 → Completed → Card 2 unlocked  
Card 2 → 8/8 → Completed → Card 3 unlocked  
dan seterusnya.

Setelah Card 6 selesai:

**Loyalty Journey Completed**

---

## 8. Stamp Request Model

Customer tidak memperoleh stamp hanya dengan menekan card.

Customer hanya melakukan **request**.

Pilihan request:

- +1 Stamp
- +2 Stamps

Request masuk ke admin.

Status:

- Pending
- Approved
- Rejected

Pending stamp **tidak dihitung sebagai approved progress**.

---

## 9. Stamp Request UX

Active loyalty card memiliki 8 stamp slots.

Contoh:

`○ ○ ○ ○`  
`○ ○ ○ ○`

Approved:

`● ● ● ○`  
`○ ○ ○ ○`

Customer tap empty stamp.

Bottom sheet / dialog muncul:

### Request Stamp

**+1 Stamp**  
**+2 Stamps**

CTA:

**Request Stamp**

Jika hanya tersisa 1 slot:

- hanya +1 yang dapat dipilih;
- +2 harus disabled atau tidak ditampilkan.

---

## 10. Pending State

Setelah request berhasil:

> **Stamp request sent!**

Supporting text:

> Lagi dicek sama Kira Kira Michi. Stamp kamu akan masuk setelah dikonfirmasi.

Visual state stamp:

- Approved
- Pending
- Empty

Customer tidak boleh membuat duplicate unresolved request untuk card yang sama.

---

## 11. Admin Approval

Admin melihat:

- customer name;
- WhatsApp;
- active card;
- current approved progress;
- requested quantity;
- timestamp;
- optional note.

Actions:

- **Approve**
- **Adjust & Approve**
- **Reject**

Jika customer meminta +2, admin boleh:

- approve 2;
- approve 1;
- reject.

Admin tidak boleh approve lebih dari requested count.

---

## 12. Realtime Customer Experience

Ketika admin approve:

1. database di-update;
2. customer UI menerima realtime update;
3. data authoritative di-fetch ulang;
4. stamp berubah dari pending menjadi approved;
5. latest stamp mendapatkan subtle animation;
6. progress card ikut berubah.

Copy examples:

> Yay, [First Name]! Stamp baru kamu sudah masuk.

> Nice! Tinggal 2 stamp lagi menuju reward berikutnya.

Tone:

- friendly;
- short;
- playful;
- personal;
- tidak terlalu childish.

---

## 13. Card Completion Experience

Saat stamp ke-8 diapprove:

1. stamp terakhir animate;
2. card berubah menjadi completed;
3. subtle celebration;
4. reward unlocked;
5. next card menjadi active;
6. customer mendapat contextual feedback.

Copy:

> **Loyalty Card Complete!**

> Delapan stamp sudah terkumpul. Reward kamu sudah terbuka dan card berikutnya siap dimulai.

CTA:

- **Lihat Reward**
- **Lanjut ke Card Berikutnya**

Animation harus menghormati `prefers-reduced-motion`.

---

## 14. Rewards

Reward tidak di-hardcode di source code.

Setiap card memiliki:

- reward title;
- reward description;
- reward terms;
- optional expiry;
- active/inactive state.

Admin dapat mengatur reward.

Reward state:

- Locked
- Available
- Redeemed

Reward menjadi **Available** saat card mencapai 8 approved stamps.

Card berikutnya tetap dapat unlock walaupun reward sebelumnya belum diredeem.

---

## 15. Reward Redemption

Untuk MVP, reward digunakan ketika customer melakukan transaksi dengan Kira Kira Michi.

Admin membuka customer profile lalu:

**Mark as Redeemed**

System menyimpan:

- customer;
- reward;
- card;
- redeemed_at;
- redeemed_by;
- optional note.

Reward tidak boleh diredeem dua kali.

---

## 16. Customer Entry Flow

Primary entry:

**QR Code**

QR menuju:

`/join`

Flow:

**Scan QR → Session Check**

Jika belum login:

→ Register / Login

Jika sudah login:

→ ensure membership exists  
→ `/loyalty`

Scanning QR berkali-kali tidak boleh menciptakan duplicate membership.

---

## 17. Registration

Form harus pendek.

Fields:

- Full Name
- Email
- WhatsApp Number
- Password
- Confirm Password
- Optional Marketing Consent

Marketing consent:

> Saya bersedia menerima informasi promo dan program Kira Kira Michi.

Consent:

- optional;
- tidak pre-checked;
- memiliki timestamp.

---

## 18. Login

Fields:

- Email
- Password

Actions:

- Masuk
- Lupa Password
- Belum punya akun? Daftar

Jika user scan QR ketika sudah authenticated:

langsung arahkan ke loyalty dashboard.

---

## 19. Customer Dashboard

### Header

Logo Kira Kira Michi

Greeting:

> Hai, [First Name]!

Contextual subtext:

> Yuk lanjut kumpulkan stamp-mu.

atau:

> Tinggal 2 stamp lagi menuju reward berikutnya.

### Loyalty Journey Indicator

Display:

**Card 2 of 6**

Visual progression:

`1 ✓ — 2 ● — 3 🔒 — 4 🔒 — 5 🔒 — 6 🔒`

Harus playful dan tidak terlihat seperti enterprise stepper.

---

## 20. Six Loyalty Cards UI

Customer tetap dapat melihat semua enam card.

Recommended mobile UX:

- horizontal swipeable card deck;
- active card prominent;
- completed card memiliki success state;
- locked card muted.

Locked copy:

> Selesaikan Card sebelumnya untuk membuka card ini.

Locked card boleh dilihat tetapi tidak dapat digunakan.

---

## 21. Stamp Card UI

Active card menampilkan:

- card number;
- progress;
- 8 stamp slots;
- reward preview;
- request instruction.

Contoh:

### Loyalty Card 2

**5 of 8 stamps**

`● ● ● ●`  
`● ○ ○ ○`

> 3 more to unlock your next reward.

---

## 22. Customer Navigation

Mobile bottom navigation:

1. Home
2. Rewards
3. History
4. Profile

Maksimal 4 primary tabs.

---

## 23. History

Customer dapat melihat:

- Approved stamp
- Pending stamp request
- Rejected request
- Completed card
- Reward available
- Reward redeemed

Setiap item memiliki:

- date;
- card;
- quantity;
- status;
- admin note jika ada.

---

## 24. Customer Profile

Fields:

- Full Name
- Email
- WhatsApp
- Member Since
- Marketing Preference

Actions:

- Edit Profile
- Change Password
- Logout

Perubahan identity email harus mengikuti Supabase Auth flow.

---

## 25. Admin Dashboard

Admin UI bersifat operational.

Top metrics:

- Total Members
- Pending Requests
- Approved Today
- Completed Cards
- Rewards Redeemed

Primary content:

**Pending Stamp Requests**

Hindari decorative analytics yang tidak membantu operational workflow.

---

## 26. Admin Request Inbox

Setiap request menampilkan:

- Customer
- WhatsApp
- Requested Stamps
- Current Card
- Current Progress
- Request Time

Actions:

- Approve
- Adjust
- Reject

Approval idealnya melalui dialog atau side panel agar admin tidak perlu pindah banyak halaman.

---

## 27. Admin Customer Directory

Search by:

- name;
- email;
- WhatsApp.

Customer summary:

- name;
- active card;
- stamps;
- available rewards;
- last activity.

---

## 28. Admin Customer Detail

Sections:

- Customer Information
- Loyalty Journey
- Current Card
- Stamp History
- Request History
- Rewards
- Admin Actions

Manual correction:

- Add Stamp
- Revoke Stamp

Setiap correction:

- membutuhkan reason;
- tersimpan dalam audit log;
- tidak boleh mengedit count secara direct tanpa event.

---

## 29. Program Management

Admin dapat mengubah:

- program display name;
- card label;
- reward title;
- reward description;
- reward terms;
- reward expiry;
- active state.

Admin tidak dapat mengubah 6 cards / 8 stamps dari UI MVP.

---

## 30. QR Management

Admin page:

`/admin/qr`

Features:

- QR preview;
- copy join link;
- download QR;
- print-friendly layout.

QR hanya berisi public join URL.

Tidak ada sensitive token.

---

## 31. Recommended Database Model

### 31.1 profiles

```sql
id uuid primary key references auth.users(id)
full_name text not null
whatsapp text
role text not null default 'customer'
marketing_consent boolean not null default false
marketing_consent_at timestamptz
created_at timestamptz
updated_at timestamptz
```

Role values:

- customer
- admin

Customer tidak boleh mengubah role miliknya.

### 31.2 loyalty_programs

```sql
id uuid primary key
slug text unique not null
name text not null
description text
total_cards int not null default 6
stamps_per_card int not null default 8
is_active boolean not null default true
created_at timestamptz
updated_at timestamptz
```

### 31.3 loyalty_card_definitions

```sql
id uuid primary key
program_id uuid references loyalty_programs(id)
sequence_no int not null
title text
description text
reward_title text
reward_description text
reward_terms text
reward_expiry_days int
is_active boolean not null default true
created_at timestamptz
updated_at timestamptz
```

Unique: `program_id + sequence_no`

Sequence: 1–6

### 31.4 member_programs

```sql
id uuid primary key
program_id uuid references loyalty_programs(id)
user_id uuid references auth.users(id)
status text not null
joined_at timestamptz
completed_at timestamptz
```

Unique: `program_id + user_id`

### 31.5 member_cards

```sql
id uuid primary key
member_program_id uuid references member_programs(id)
card_definition_id uuid references loyalty_card_definitions(id)
sequence_no int not null
status text not null
stamps_count int not null default 0
completed_at timestamptz
created_at timestamptz
updated_at timestamptz
```

Status:

- locked
- active
- completed

Constraints:

- stamps_count >= 0
- stamps_count <= 8

Only one active card per member program.

### 31.6 stamp_requests

```sql
id uuid primary key
member_card_id uuid references member_cards(id)
user_id uuid references auth.users(id)
requested_count smallint not null
approved_count smallint
status text not null default 'pending'
customer_note text
admin_note text
reviewed_by uuid references auth.users(id)
requested_at timestamptz
reviewed_at timestamptz
```

Constraints:

- requested_count IN (1, 2)
- approved_count <= requested_count

Status:

- pending
- approved
- rejected

### 31.7 stamp_events

Immutable ledger.

```sql
id uuid primary key
member_card_id uuid references member_cards(id)
user_id uuid references auth.users(id)
stamp_request_id uuid references stamp_requests(id)
event_type text not null
quantity smallint not null
created_by uuid references auth.users(id)
reason text
created_at timestamptz
```

Event types:

- grant
- revoke

Normal UI tidak boleh menghapus ledger rows.

### 31.8 reward_redemptions

```sql
id uuid primary key
member_card_id uuid references member_cards(id)
user_id uuid references auth.users(id)
status text not null
available_at timestamptz
redeemed_at timestamptz
redeemed_by uuid references auth.users(id)
note text
```

Status:

- available
- redeemed

Satu reward redemption per member card.

---

## 32. Program Initialization

Saat customer join, buat secara transactional:

- member_program;
- 6 member_cards.

Status:

- Card 1 active
- Card 2–6 locked

Operation harus idempotent.

Recommended RPC:

`join_loyalty_program(...)`

---

## 33. Stamp Request Transaction

Server/database wajib memvalidasi:

1. authenticated user;
2. membership exists;
3. card belongs to user;
4. card status active;
5. requested quantity 1 atau 2;
6. enough remaining slots;
7. no unresolved pending request.

Recommended RPC:

`request_stamps(...)`

Browser tidak boleh menentukan privileged fields seperti:

- status;
- approved_count;
- reviewed_by.

---

## 34. Approval Transaction

Approval harus atomic.

Recommended RPC:

`review_stamp_request(...)`

Logic:

1. verify admin;
2. lock request;
3. require pending state;
4. lock current member card;
5. validate approved_count;
6. ensure stamp total does not exceed 8;
7. create immutable stamp_event;
8. increment approved stamp count;
9. update request;
10. if card reaches 8:
    - mark completed;
    - unlock reward;
    - activate next card;
11. if Card 6 completes:
    - complete member_program.

Database harus menjadi source of truth.

---

## 35. Concurrency & Integrity

System harus mencegah:

- double approval;
- duplicate request;
- overshooting 8 stamps;
- two active cards;
- duplicate membership;
- duplicate reward redemption;
- stale admin approval.

Gunakan transaction dan row locking jika diperlukan.

---

## 36. Supabase Auth

Gunakan Supabase Auth.

Protected routes:

- `/loyalty/*`
- `/admin/*`

Admin route membutuhkan:

- authenticated session;
- admin role.

Jika customer mencoba membuka `/admin`:

redirect atau 403.

---

## 37. Row Level Security

Enable RLS pada seluruh customer/business tables.

Customer hanya dapat:

- membaca profile sendiri;
- update safe profile fields sendiri;
- membaca membership sendiri;
- membaca cards sendiri;
- membuat valid stamp request sendiri;
- membaca own requests;
- membaca own stamp events;
- membaca own rewards.

Customer tidak boleh:

- update member_cards.stamps_count;
- update request status;
- update approved_count;
- insert privileged stamp_events;
- change role;
- redeem reward as admin.

Admin dapat mengakses operational data yang dibutuhkan.

Authorization tidak boleh hanya bergantung pada frontend check.

---

## 38. Realtime

Supabase Realtime digunakan untuk:

- stamp request status changed;
- member card update;
- reward unlocked.

Realtime hanya membantu update UX.

Setelah event realtime:

**re-fetch authoritative state**.

---

## 39. Recommended Routes

```text
/
├── join
├── auth
│   ├── login
│   ├── register
│   ├── forgot-password
│   └── callback
│
├── loyalty
│   ├── page
│   ├── rewards
│   ├── history
│   └── profile
│
└── admin
    ├── page
    ├── requests
    ├── customers
    │   └── [id]
    ├── program
    ├── qr
    └── audit
```

Adapt jika repository memiliki convention lain.

---

## 40. UI Design Direction

Reference:

https://kirakiramichi.dekatlokal.com

Sebelum implementasi:

- inspect logo;
- inspect palette;
- inspect typography;
- inspect radius;
- inspect imagery;
- inspect tone;
- inspect existing assets.

Customer loyalty UI harus tetap terasa seperti Kira Kira Michi.

Desired:

**playful + kawaii-inspired + modern + clean + premium merchandise feel**

Avoid:

- childish game UI;
- generic SaaS dashboard;
- excessive glassmorphism;
- gradient overload;
- random emoji;
- generic AI illustrations;
- huge cards;
- over-animation.

---

## 41. Stamp Visual Language

Empat states:

- Empty
- Pending
- Approved
- Latest Approved

Jika brand symbol Kira Kira Michi cocok digunakan sebagai stamp visual, boleh digunakan secara konsisten.

Jangan memodifikasi brand logo secara sembarangan.

---

## 42. Locked Card UX

Locked card tetap visible.

Display:

- card sequence;
- lock state;
- reward teaser jika diizinkan;
- unlock requirement.

Example:

> Complete Card 2 to unlock.

---

## 43. Accessibility

Requirements:

- semantic buttons;
- labels;
- visible focus;
- keyboard navigation;
- accessible dialog/bottom sheet;
- adequate contrast;
- errors tidak bergantung pada color only;
- reduced-motion support.

---

## 44. Performance

Customer dashboard harus cepat di mobile.

Requirements:

- minimize client JavaScript;
- Server Components jika cocok;
- client components hanya untuk interactivity;
- optimize images;
- lazy-load secondary content;
- no admin data fetch di customer route;
- efficient realtime subscriptions.

---

## 45. Empty States

### No History

> Belum ada aktivitas stamp. Yuk mulai loyalty journey kamu!

### No Admin Requests

> Semua request sudah beres.

### No Reward

> Reward pertama akan terbuka setelah card selesai.

---

## 46. Error Handling

User-facing message harus friendly.

Jangan expose database/internal error.

Bad:

`PGRST116`

Good:

> Request belum bisa dikirim. Coba lagi sebentar ya.

Technical error boleh dilog server-side.

---

## 47. MVP Analytics

Admin metrics:

- total members;
- active members;
- pending requests;
- approved stamps;
- completed cards;
- rewards redeemed;
- recent activity.

Future metrics:

- average stamps per member;
- card completion rate;
- reward redemption rate;
- repeat engagement;
- active member rate.

---

## 48. Privacy

Collect hanya data yang dibutuhkan:

- name;
- email;
- WhatsApp;
- marketing preference;
- loyalty activity.

Marketing consent harus optional.

Customer list tidak boleh public.

---

## 49. MVP Scope

MVP wajib memiliki:

- Supabase Auth;
- customer register/login;
- loyalty membership;
- 6 cards;
- 8 stamps/card;
- sequential unlock;
- +1/+2 request;
- admin approval/rejection;
- partial approval;
- realtime customer update;
- completion animation;
- reward unlock;
- reward redemption;
- history;
- customer directory;
- admin dashboard;
- QR join;
- RLS;
- audit trail;
- responsive UI.

---

## 50. Phase 2

Future only:

- WhatsApp notification;
- birthday reward;
- referral;
- PWA;
- bonus stamp campaigns;
- customer segmentation;
- multi-location;
- wallet pass;
- advanced analytics.

Tidak boleh menghambat MVP.

---

## 51. User Acceptance Criteria

### Registration

Given new customer  
when registration success  
then:

- authenticated;
- membership created once;
- Card 1 active;
- Cards 2–6 locked.

### Request

Given Card 1 has 4/8  
when customer requests +2  
then one pending request is created.

### Approval

Given pending +2  
when admin approves 2  
then:

- request approved;
- progress becomes 6/8;
- immutable history recorded;
- customer UI updates.

### Partial Approval

Given +2 request  
when admin approves 1  
then progress increases by 1 only.

### Rejection

Given pending request  
when admin rejects  
then approved stamps do not change.

### Completion

Given card has 7 stamps  
when +1 approved  
then:

- card completed;
- reward available;
- next card active;
- celebration shown.

### Final Completion

Given Card 6 reaches 8/8  
then full loyalty journey becomes completed.

---

## 52. Core Edge Cases

System harus menangani:

- user scan QR saat logged out;
- user scan QR saat logged in;
- repeated QR scan;
- duplicate registration attempt;
- double tap Request;
- +2 request ketika hanya 1 slot tersisa;
- multiple pending requests;
- admin double approve;
- dua admin membuka request yang sama;
- stale approval;
- card completion exactly once;
- Card 6 completion;
- realtime disconnect;
- duplicate reward redemption;
- unauthorized access ke admin route;
- direct Supabase API manipulation dari browser.

---

## 53. Security Requirements

Customer tidak boleh berhasil melakukan hal berikut bahkan melalui DevTools/client API:

```text
UPDATE member_cards.stamps_count
UPDATE stamp_requests.status
UPDATE stamp_requests.approved_count
INSERT privileged stamp_events
UPDATE profiles.role
VIEW another customer's private data
REDEEM own reward as admin
```

Admin mutations membutuhkan server/database authorization.

Service-role key tidak boleh masuk browser bundle.

---

## 54. Success Definition

Customer dapat menyelesaikan:

**Scan → Register → Request → Admin Approve → Realtime Stamp → Complete Card → Unlock Reward → Unlock Next Card**

tanpa manual database intervention.

Admin dapat menyelesaikan seluruh operational flow dari admin UI.

---

## 55. Product Philosophy

Customer should feel:

> **Gampang banget dipakai.**

Admin should feel:

> **Cepat banget approve-nya.**

Business should gain:

> **Customer loyalty sekarang bisa dilihat dan dikelola secara digital.**

Final principle:

> **One tap for the customer. One decision for the admin. One reliable history for the business.**
