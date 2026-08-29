-- Neutral, idempotent MVP program data. Business reward copy can be edited later.
insert into public.loyalty_programs (
  id,
  slug,
  name,
  description,
  total_cards,
  stamps_per_card,
  is_active
)
values (
  '10000000-0000-4000-8000-000000000001',
  'kira-kira-michi-loyalty',
  'Kira Kira Michi Loyalty',
  'Kumpulkan enam stamp di setiap tujuh loyalty card dan buka reward pada setiap kartu yang selesai.',
  7,
  6,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  total_cards = excluded.total_cards,
  stamps_per_card = excluded.stamps_per_card,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.loyalty_card_definitions (
  id,
  program_id,
  sequence_no,
  title,
  description,
  reward_title,
  reward_description,
  reward_terms,
  reward_expiry_days,
  is_active
)
select
  ('20000000-0000-4000-8000-' || lpad(cards.sequence_no::text, 12, '0'))::uuid,
  programs.id,
  cards.sequence_no,
  'Loyalty Card ' || cards.sequence_no,
  'Kumpulkan 6 stamp untuk menyelesaikan Loyalty Card ' || cards.sequence_no || '.',
  'Reward ' || cards.sequence_no,
  'Reward details will be announced by Kira Kira Michi.',
  'Final reward terms will be provided by Kira Kira Michi.',
  null,
  true
from public.loyalty_programs as programs
cross join generate_series(1, 7) as cards(sequence_no)
where programs.slug = 'kira-kira-michi-loyalty'
on conflict (program_id, sequence_no) do nothing;
