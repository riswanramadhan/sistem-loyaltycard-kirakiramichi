# Master Codex Prompt — Kira Kira Michi Digital Loyalty Card

Implement a **production-ready digital loyalty card web application for Kira Kira Michi**.

This is not a mockup task. Build the working system end-to-end.

---

# 0. Read Before Coding

Before making changes:

1. Audit the existing repository.
2. Inspect:
   - `package.json`
   - Next.js version
   - React version
   - TypeScript config
   - Tailwind config
   - existing UI components
   - existing `/public` or asset folders
   - existing Supabase configuration
   - existing environment variable conventions
   - lint/test tooling
3. Do not replace a working architecture unnecessarily.
4. Reuse components where appropriate.
5. Do not redesign the whole project unless necessary.
6. Run the existing project first and understand its current structure.

---

# 1. Product

Build:

# **Kira Kira Michi Digital Loyalty Card**

Technology:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Realtime

Primary device:

**Mobile**

Admin must also be responsive and desktop-friendly.

---

# 2. Design Reference

Inspect:

https://kirakiramichi.dekatlokal.com

Study:

- branding;
- logo;
- palette;
- typography;
- border radius;
- visual personality;
- product imagery;
- spacing;
- tone.

The loyalty app must feel like part of Kira Kira Michi's existing brand.

Do not clone the marketing website directly.

Translate the identity into a polished consumer loyalty product.

Desired visual character:

**playful + kawaii-inspired + modern + clean + premium merchandise feel**

Avoid:

- generic SaaS dashboard;
- AI slop;
- excessive gradients;
- heavy glassmorphism;
- random emoji;
- giant cards;
- childish game UI;
- unrelated color palette.

---

# 3. Core Product Flow

```text
QR / Join Link
      ↓
Session Check
      ↓
Authenticated?
 ┌────┴────┐
 No        Yes
 ↓          ↓
Login /     Ensure Membership
Register        ↓
   ↓         Loyalty Dashboard
   └─────────────┘
                  ↓
             Active Card
                  ↓
             Request Stamp
                +1 / +2
                  ↓
             Admin Pending
                  ↓
        Approve / Adjust / Reject
                  ↓
          Supabase Realtime Update
                  ↓
             Stamp Added
                  ↓
               8 / 8
                  ↓
            Card Completed
                  ↓
           Reward Unlocked
                  ↓
          Next Card Unlocked
```

---

# 4. Loyalty Rules

Fixed MVP rules:

```text
Total Loyalty Cards = 6
Stamps per Card = 8
```

Initial state:

```text
Card 1 = active
Card 2 = locked
Card 3 = locked
Card 4 = locked
Card 5 = locked
Card 6 = locked
```

When Card N reaches 8 approved stamps:

```text
Card N = completed
Reward N = available
Card N+1 = active
```

When Card 6 reaches 8:

```text
member program = completed
```

Only one card can be active at a time.

---

# 5. Customer Roles & Permissions

Customer can:

- register;
- login;
- logout;
- join loyalty program;
- see own cards;
- request stamp;
- see own requests;
- see own rewards;
- see own history;
- edit safe profile fields.

Customer must NOT be able to:

- modify stamp count;
- approve own request;
- change request status;
- change `approved_count`;
- create privileged stamp events;
- modify own role;
- view another customer's data;
- redeem own rewards through admin action.

---

# 6. Admin Roles & Permissions

Admin can:

- view dashboard;
- see all members;
- see pending stamp requests;
- approve;
- adjust and approve;
- reject;
- view customer detail;
- make controlled stamp adjustments;
- manage reward data;
- redeem reward;
- view audit history;
- manage QR join link.

Never build public admin registration.

---

# 7. Customer Registration

Fields:

```text
Full Name
Email
WhatsApp
Password
Confirm Password
Marketing Consent (optional)
```

Marketing consent:

- optional;
- never pre-checked;
- stored with timestamp.

After successful registration:

1. authenticate;
2. create profile;
3. create/ensure loyalty membership;
4. redirect to `/loyalty`.

---

# 8. Customer Login

Fields:

```text
Email
Password
```

Support:

- forgot password;
- auth callback;
- safe return URL.

If already logged in and scanning QR:

do not show login again.

---

# 9. Join Route

Create:

```text
/join
```

Behavior:

### Unauthenticated

Show concise loyalty intro and CTA:

**Join Loyalty**

→ register/login.

### Authenticated

Call idempotent membership initialization.

Then redirect:

```text
/loyalty
```

Scanning QR multiple times must never create duplicate memberships or duplicate card rows.

---

# 10. Loyalty Dashboard

Route:

```text
/loyalty
```

Customer dashboard must be mobile-first.

Header:

```text
Hai, {firstName}!
```

Dynamic subcopy based on progress.

Examples:

```text
Yuk lanjut kumpulkan stamp-mu.
```

```text
Tinggal 2 stamp lagi menuju reward berikutnya.
```

---

# 11. Six Card Journey

Display all 6 cards.

Recommended mobile pattern:

**horizontal swipeable card deck**

Card states:

- locked;
- active;
- completed.

Display:

```text
Card 2 of 6
```

Locked cards are visible but not interactive.

---

# 12. Stamp Grid

Each active card has 8 visual stamp slots.

Recommended:

```text
4 × 2
```

States:

- empty;
- pending;
- approved;
- latest-approved.

Do not use generic check circles as the entire brand expression.

If existing Kira Kira Michi brand assets contain a suitable symbol, consider using it for the stamp.

---

# 13. Request Stamp Interaction

Tap an empty stamp.

Open bottom sheet / dialog:

```text
Request Stamp

+1 Stamp
+2 Stamps

[Request Stamp]
```

If remaining slots = 1:

+2 must not be selectable.

Customer cannot submit duplicate unresolved requests.

---

# 14. Request Server Validation

Validate server/database side:

1. authenticated user;
2. membership exists;
3. member_card belongs to user;
4. card status is active;
5. requested_count is 1 or 2;
6. request does not exceed remaining capacity;
7. no conflicting pending request.

Never trust client values.

Recommended RPC:

```text
request_stamps(...)
```

---

# 15. Pending UX

After request:

```text
Stamp request sent!
```

Supporting:

```text
Lagi dicek sama Kira Kira Michi. Stamp kamu akan masuk setelah dikonfirmasi.
```

Pending stamp must not increase approved progress.

---

# 16. Admin Dashboard

Route:

```text
/admin
```

Top metrics:

- Total Members
- Pending Requests
- Approved Today
- Completed Cards
- Rewards Redeemed

Primary area:

**Pending Stamp Requests**

Avoid oversized marketing hero.

Admin UI should prioritize operational speed.

---

# 17. Admin Stamp Requests

Route:

```text
/admin/requests
```

Tabs or filters:

- Pending
- Approved
- Rejected

Default:

**Pending**

Each request shows:

- customer name;
- WhatsApp;
- requested count;
- current card;
- approved progress;
- requested timestamp.

Actions:

- Approve
- Adjust & Approve
- Reject

---

# 18. Partial Approval

If customer requests +2:

admin may approve:

- 2;
- 1;
- reject.

Never approve more than `requested_count`.

---

# 19. Atomic Approval

Do not implement approval as multiple unrelated browser writes.

Create a PostgreSQL RPC such as:

```text
review_stamp_request(...)
```

Inside transaction:

1. verify authenticated admin;
2. lock request row;
3. require pending status;
4. lock member card;
5. validate approved count;
6. ensure no overshoot;
7. create immutable stamp event;
8. increment approved stamp count;
9. update request;
10. detect completion;
11. create/unlock reward;
12. activate next card;
13. complete member program if Card 6 finishes.

Use database transaction and row locking where appropriate.

---

# 20. Realtime UX

Customer UI subscribes only to relevant authenticated data.

Main realtime events:

- request status change;
- member card update;
- reward availability.

When event arrives:

1. show contextual transition;
2. re-fetch authoritative state;
3. animate latest approved stamp.

Never use realtime payload alone as final source of truth.

---

# 21. Personal Feedback

After approval:

```text
Yay, {firstName}! Stamp baru kamu sudah masuk.
```

If close to completion:

```text
Tinggal 1 stamp lagi!
```

If card completes:

```text
Loyalty Card Complete!
```

Use subtle animation.

Respect `prefers-reduced-motion`.

---

# 22. Completion Flow

When 8th stamp is approved:

1. latest stamp animation;
2. card becomes completed;
3. subtle celebration;
4. reward available;
5. next card unlocked;
6. CTA to reward or next card.

Do not require reward redemption before unlocking next card.

---

# 23. Rewards Page

Route:

```text
/loyalty/rewards
```

Sections:

- Available
- Locked
- Redeemed

Reward data should come from database.

Do not hardcode production reward values.

---

# 24. Reward Redemption

Admin customer detail supports:

```text
Mark Reward as Redeemed
```

Require confirmation.

Store:

- member card;
- customer;
- timestamp;
- admin;
- note.

Prevent duplicate redemption.

---

# 25. History Page

Route:

```text
/loyalty/history
```

Show chronological timeline.

Examples:

```text
+1 Stamp — Approved
+2 Stamp Request — Pending
+1 Stamp Request — Rejected
Card 1 — Completed
Reward — Redeemed
```

---

# 26. Customer Profile

Route:

```text
/loyalty/profile
```

Display:

- Full Name
- Email
- WhatsApp
- Member Since
- Marketing Preference

Actions:

- Edit Profile
- Change Password
- Logout

Customer cannot change own role.

---

# 27. Customer Bottom Navigation

Mobile:

```text
Home
Rewards
History
Profile
```

Use a clean fixed bottom navigation.

Avoid more than 4 primary items.

---

# 28. Admin Customer Directory

Route:

```text
/admin/customers
```

Search by:

- name;
- email;
- WhatsApp.

Show:

- name;
- active card;
- approved stamps;
- rewards;
- last activity.

---

# 29. Admin Customer Detail

Route:

```text
/admin/customers/[id]
```

Sections:

- Profile
- Loyalty Journey
- Current Card
- Stamp Requests
- Stamp History
- Rewards
- Admin Adjustments

---

# 30. Controlled Admin Adjustments

Support:

- Grant Stamp
- Revoke Stamp

Every manual adjustment:

- requires reason;
- creates immutable audit record;
- uses secure server/database function.

Never directly edit `stamps_count` from UI.

---

# 31. Program Settings

Route:

```text
/admin/program
```

Admin can update:

- card title;
- card description;
- reward title;
- reward description;
- reward terms;
- optional expiry.

Do not allow normal admin UI to change:

- 6 total cards;
- 8 stamps per card.

---

# 32. QR Management

Route:

```text
/admin/qr
```

Show:

- QR preview;
- join URL;
- copy link;
- download QR;
- simple print-friendly state.

QR points to:

```text
/join
```

No sensitive information in QR.

---

# 33. Database Migrations

Create proper Supabase SQL migrations.

Do not rely on manually creating tables in Supabase Dashboard.

Migrations must include:

- enums or check constraints;
- tables;
- relationships;
- indexes;
- unique constraints;
- RLS;
- policies;
- RPC functions;
- optional triggers;
- seed data.

---

# 34. Database Tables

Implement or adapt:

### profiles

```text
id
full_name
whatsapp
role
marketing_consent
marketing_consent_at
created_at
updated_at
```

### loyalty_programs

```text
id
slug
name
description
total_cards
stamps_per_card
is_active
created_at
updated_at
```

### loyalty_card_definitions

```text
id
program_id
sequence_no
title
description
reward_title
reward_description
reward_terms
reward_expiry_days
is_active
created_at
updated_at
```

### member_programs

```text
id
program_id
user_id
status
joined_at
completed_at
```

### member_cards

```text
id
member_program_id
card_definition_id
sequence_no
status
stamps_count
completed_at
created_at
updated_at
```

### stamp_requests

```text
id
member_card_id
user_id
requested_count
approved_count
status
customer_note
admin_note
reviewed_by
requested_at
reviewed_at
```

### stamp_events

```text
id
member_card_id
user_id
stamp_request_id
event_type
quantity
created_by
reason
created_at
```

### reward_redemptions

```text
id
member_card_id
user_id
status
available_at
redeemed_at
redeemed_by
note
```

---

# 35. Constraints

Enforce database-level constraints.

```text
requested_count IN (1, 2)
```

```text
stamps_count >= 0
stamps_count <= 8
```

```text
approved_count <= requested_count
```

Unique:

```text
program_id + user_id
```

Unique:

```text
member_program_id + sequence_no
```

Prevent:

- multiple active cards;
- duplicate unresolved pending requests;
- duplicate reward redemption.

---

# 36. Loyalty Membership Initialization

Create idempotent:

```text
join_loyalty_program(...)
```

When joining:

```text
member_program
Card 1 active
Card 2 locked
Card 3 locked
Card 4 locked
Card 5 locked
Card 6 locked
```

Repeated scans must return existing membership.

---

# 37. Stamp Ledger

Use `stamp_events` as immutable history.

Do not implement loyalty only as a mutable integer.

Every grant/revoke must be traceable.

Normal UI must not delete ledger entries.

---

# 38. RLS

Enable Row Level Security.

Customer should only see rows tied to `auth.uid()`.

Customer may:

- read own profile;
- update safe fields;
- read own member program;
- read own cards;
- read own requests;
- create safe stamp request;
- read own stamp events;
- read own reward state.

Customer must never:

```text
UPDATE member_cards.stamps_count
UPDATE stamp_requests.status
UPDATE stamp_requests.approved_count
INSERT privileged stamp_events
UPDATE profiles.role
REDEEM reward as admin
```

Admin gets appropriate business access.

---

# 39. Admin Security

Do not protect admin by hiding links only.

Every admin route and mutation must validate:

- authenticated;
- admin role;
- permitted operation.

If customer manually opens `/admin`:

return redirect/403.

---

# 40. Auth Architecture

Use Supabase Auth with the repository's recommended Next.js integration.

Use server-aware session handling.

Protect:

```text
/loyalty/*
/admin/*
```

Do not expose service role key in browser bundle.

Expected public env:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

# 41. Profile Creation

When Supabase user registers:

create a profile with role:

```text
customer
```

Never trust browser/user metadata to create admin role.

Admin promotion must be controlled.

---

# 42. Marketing Consent

Store:

```text
marketing_consent
marketing_consent_at
```

Never pre-check consent.

Customer can change preference later.

---

# 43. Design System

Extract a small token system from Kira Kira Michi brand:

```text
brand-primary
brand-secondary
brand-accent
surface
surface-muted
text-primary
text-muted
border
success
warning
danger
```

Use existing Tailwind/theme architecture.

Do not create an unrelated palette.

---

# 44. UI Quality Bar

Customer app should feel like a real consumer product.

Pay special attention to:

- mobile touch targets;
- card proportions;
- stamp visual;
- active/locked states;
- typography;
- spacing;
- bottom sheet;
- completion feedback;
- microcopy.

Admin should feel:

- compact;
- fast;
- operational;
- clear.

---

# 45. Icons

Reuse existing icon library if present.

If none exists:

choose one quality icon package.

Do not mix several icon libraries.

Do not use emoji as primary UI icons.

---

# 46. Loading States

Implement:

- skeletons;
- form pending state;
- request pending state;
- admin approval loading state;
- disabled duplicate submit.

---

# 47. Errors

Translate technical errors into human messages.

Never expose:

- SQL;
- database internals;
- service secrets;
- stack details.

---

# 48. Accessibility

Implement:

- semantic buttons;
- labels;
- visible focus;
- keyboard navigation;
- accessible dialogs;
- accessible status;
- adequate contrast;
- reduced motion.

---

# 49. Responsive Testing

Customer:

```text
320px
375px
390px
430px
768px
1024+
```

Admin:

```text
375px
768px
1024px
1440px
```

No accidental horizontal overflow.

Intentional card carousel is allowed.

---

# 50. Edge Cases

Handle:

### Logged-out QR scan

→ auth → return to loyalty.

### Logged-in QR scan

→ dashboard.

### Repeated QR scan

→ no duplicate membership.

### Double request tap

→ one pending request.

### Request +2 with only one slot remaining

→ blocked.

### Admin double approve

→ only one approval succeeds.

### Two admins approve same request

→ only first valid transaction succeeds.

### Stale request

→ server revalidates.

### 7/8 + approve 2

→ blocked/adjusted according to safe rules.

### Card reaches exactly 8

→ complete once.

### Card 6 reaches 8

→ journey completed.

### Realtime disconnected

→ page refresh still returns correct state.

### Already redeemed reward

→ cannot redeem twice.

---

# 51. Seed Data

Seed one active loyalty program:

```text
Kira Kira Michi Loyalty
6 cards
8 stamps
```

Seed 6 neutral card definitions:

```text
Loyalty Card 1
Loyalty Card 2
Loyalty Card 3
Loyalty Card 4
Loyalty Card 5
Loyalty Card 6
```

Reward values should be easy to edit.

Do not invent final production rewards unless provided by business.

---

# 52. Tests

Use existing test tooling where possible.

Core tests must cover:

- membership initialization;
- idempotent join;
- request +1;
- request +2;
- invalid count;
- remaining capacity;
- duplicate pending prevention;
- approval;
- partial approval;
- rejection;
- double approval prevention;
- card 8th stamp completion;
- next card unlock;
- Card 6 full completion;
- unauthorized customer access;
- unauthorized admin access;
- duplicate reward redemption.

---

# 53. Manual UAT

## Customer

Test:

- Register
- Login
- Scan/join
- View six cards
- Request +1
- Request +2
- See pending
- Receive realtime approval
- Complete card
- Unlock next card
- View reward
- View history
- Edit profile
- Logout

## Admin

Test:

- Login
- Dashboard
- Pending request
- Approve
- Partial approve
- Reject
- Customer search
- Customer detail
- Adjustment
- Reward redemption
- Program reward edit
- Audit history
- QR page
- Logout

---

# 54. Security QA

Verify customer cannot manually use client requests to:

- read another customer;
- modify own stamp count;
- approve own request;
- change own role;
- insert privileged event;
- redeem reward as admin.

Do not mark project complete until database rejects these.

---

# 55. Performance QA

Avoid:

- giant client components;
- admin data fetching on customer routes;
- request waterfalls;
- unnecessary realtime subscriptions;
- unoptimized brand images.

Use Server Components where beneficial.

Use Client Components only where interaction/realtime requires.

---

# 56. Scope Control

Do not add:

- POS;
- ecommerce;
- payments;
- advanced CRM;
- AI chatbot;
- referral engine;
- WhatsApp automation;
- inventory.

Keep product focused.

---

# 57. Future-Ready

Architecture should not block future:

- birthday reward;
- bonus stamps;
- campaigns;
- PWA;
- referral;
- membership tier;
- multi-location;
- customer segmentation;
- WhatsApp notifications.

Do not build these now.

---

# 58. Definition of Done

The system is complete only when this works end-to-end:

```text
Customer scans QR
→ registers
→ sees Card 1
→ requests +1/+2
→ admin receives request
→ admin approves
→ customer sees realtime update
→ 8 stamps complete card
→ reward unlocks
→ Card 2 unlocks automatically
→ all actions remain auditable
→ customer cannot manipulate loyalty state
```

---

# 59. Final QA Checklist

Before finishing:

1. Run migrations.
2. Seed development data.
3. Run build.
4. Run lint.
5. Run TypeScript checks.
6. Run tests.
7. Fix runtime errors.
8. Inspect browser console.
9. Test customer mobile flow.
10. Test admin flow.
11. Test RLS.
12. Test realtime.
13. Verify no service key exposure.
14. Verify no broken images.
15. Verify 6-card progression.
16. Verify 8-stamp maximum.
17. Verify approval concurrency.
18. Verify reward redemption.
19. Verify mobile responsiveness.

---

# 60. Final Response Required from Codex

After implementation, report:

## Created

List new files.

## Modified

List changed files.

## Database

List migrations, tables, RPC, policies, indexes.

## Routes

List all customer/admin routes.

## Test Accounts

Explain how test accounts can be created safely.

## Testing

Report actual result for:

- build;
- lint;
- typecheck;
- tests;
- manual UAT;
- security checks.

## Remaining Manual Configuration

Only mention items that genuinely require project/Supabase access.

Do not claim something is complete if it was not verified.

---

# Product North Star

Customer experience:

> **Scan, tap, and my stamp is there.**

Admin experience:

> **I can approve this in seconds.**

Business outcome:

> **Kira Kira Michi moves from disposable physical loyalty cards to a structured digital loyalty relationship with its customers.**
