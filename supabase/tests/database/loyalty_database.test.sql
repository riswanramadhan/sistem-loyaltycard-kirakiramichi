begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select extensions.plan(100);

-- Required schema and deletion semantics.
select extensions.has_table('public', 'profiles', 'profiles exists');
select extensions.has_table('public', 'loyalty_programs', 'loyalty_programs exists');
select extensions.has_table('public', 'loyalty_card_definitions', 'loyalty_card_definitions exists');
select extensions.has_table('public', 'member_programs', 'member_programs exists');
select extensions.has_table('public', 'member_cards', 'member_cards exists');
select extensions.has_table('public', 'stamp_requests', 'stamp_requests exists');
select extensions.has_table('public', 'stamp_events', 'stamp_events exists');
select extensions.has_table('public', 'reward_redemptions', 'reward_redemptions exists');
select extensions.has_column(
  'public',
  'reward_redemptions',
  'expires_at',
  'reward_redemptions stores a snapshot expiry timestamp'
);
select extensions.is(
  (
    select c.confdeltype::text
    from pg_catalog.pg_constraint as c
    where c.conrelid = 'public.stamp_requests'::regclass
      and c.conname = 'stamp_requests_reviewed_by_fkey'
  ),
  'r'::text,
  'reviewed request audit actors use ON DELETE RESTRICT'
);
select extensions.is(
  (
    select c.confdeltype::text
    from pg_catalog.pg_constraint as c
    where c.conrelid = 'public.reward_redemptions'::regclass
      and c.conname = 'reward_redemptions_redeemed_by_fkey'
  ),
  'r'::text,
  'reward redemption audit actors use ON DELETE RESTRICT'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_publication as p
    where p.pubname = 'supabase_realtime'
      and (
        p.puballtables
        or 3 = (
          select count(*)
          from pg_catalog.pg_publication_tables as pt
          where pt.pubname = p.pubname
            and pt.schemaname = 'public'
            and pt.tablename in ('member_cards', 'stamp_requests', 'reward_redemptions')
        )
      )
  ),
  'realtime publication exists and includes every loyalty change table'
);

-- Isolated program fixture. Production seed is tested independently by db reset/UAT.
insert into public.loyalty_programs (
  id, slug, name, total_cards, stamps_per_card, is_active
)
values (
  '30000000-0000-4000-8000-000000000001',
  'database-test-loyalty',
  'Database Test Loyalty',
  6,
  8,
  true
);

insert into public.loyalty_card_definitions (
  id, program_id, sequence_no, title, reward_title, reward_expiry_days
)
select
  ('31000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '30000000-0000-4000-8000-000000000001',
  n,
  'Test Card ' || n,
  'Test Reward ' || n,
  case when n = 1 then 30 else null end
from generate_series(1, 6) as n;

-- The 6/8 shape is a database invariant, not a UI convention.
select extensions.throws_ok(
  $$
    insert into public.loyalty_programs (slug, name, total_cards, stamps_per_card)
    values ('invalid-shape', 'Invalid', 5, 8)
  $$,
  '23514',
  null,
  'program shape other than six cards/eight stamps is rejected'
);

-- Auth fixtures invoke the real on_auth_user_created trigger.
insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '40000000-0000-4000-8000-000000000001',
    'customer-one@example.test',
    '{"full_name":"Customer One","role":"admin","marketing_consent":true}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'customer-two@example.test',
    '{"full_name":"Customer Two"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'admin@example.test',
    '{"full_name":"Test Admin","role":"admin"}'::jsonb
  );

-- Auth metadata cannot self-promote.
select extensions.is(
  (select role::text from public.profiles where id = '40000000-0000-4000-8000-000000000001'),
  'customer'::text,
  'profile trigger always forces customer role'
);

update public.profiles
set role = 'admin'
where id = '40000000-0000-4000-8000-000000000003';

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Membership initialization and idempotency.
select extensions.lives_ok(
  $$ select public.join_loyalty_program('database-test-loyalty') $$,
  'customer can join the active loyalty program'
);
select extensions.is(
  (
    select count(*)
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
  ),
  6::bigint,
  'join creates exactly six member cards'
);
select extensions.is(
  (
    select count(*)
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.status = 'active'
  ),
  1::bigint,
  'join creates exactly one active card'
);
select extensions.is(
  public.join_loyalty_program('database-test-loyalty'),
  (
    select id
    from public.member_programs
    where user_id = '40000000-0000-4000-8000-000000000001'
      and program_id = '30000000-0000-4000-8000-000000000001'
  ),
  'repeated join returns the existing membership'
);
select extensions.is(
  (
    select count(*)
    from public.member_programs
    where user_id = '40000000-0000-4000-8000-000000000001'
      and program_id = '30000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'repeated join never duplicates membership'
);

-- Customer-only membership and request guards.
update public.profiles
set role = 'admin'
where id = '40000000-0000-4000-8000-000000000001';

select extensions.throws_ok(
  format(
    'select public.request_stamps(%L::uuid, 1::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  '42501',
  'customer_role_required',
  'a promoted admin cannot submit customer stamp requests'
);

update public.profiles
set role = 'customer'
where id = '40000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select extensions.throws_ok(
  $$ select public.join_loyalty_program('database-test-loyalty') $$,
  '42501',
  'customer_role_required',
  'an admin cannot initialize a customer loyalty membership'
);
select extensions.is(
  (
    select count(*)
    from public.member_programs
    where user_id = '40000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'a rejected admin join creates no membership'
);

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

update public.loyalty_programs
set is_active = false
where id = '30000000-0000-4000-8000-000000000001';

select extensions.throws_ok(
  format(
    'select public.request_stamps(%L::uuid, 1::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  '55000',
  'loyalty_program_not_active',
  'a paused loyalty program rejects new customer stamp requests'
);

update public.loyalty_programs
set is_active = true
where id = '30000000-0000-4000-8000-000000000001';

-- Request validation, +1, pending state, and duplicate prevention.
select extensions.throws_ok(
  format(
    'select public.request_stamps(%L::uuid, 3::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  '22023',
  'invalid_requested_count',
  'request rejects a count outside one or two'
);
select extensions.lives_ok(
  format(
    'select public.request_stamps(%L::uuid, 1::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    ),
    'First purchase'
  ),
  'customer can request one stamp'
);
select extensions.is(
  (
    select count(*)
    from public.stamp_requests
    where user_id = '40000000-0000-4000-8000-000000000001'
      and status = 'pending'
  ),
  1::bigint,
  'request creates one pending row'
);
select extensions.is(
  (
    select mc.stamps_count
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
  ),
  0,
  'pending request does not change approved progress'
);
select extensions.throws_ok(
  format(
    'select public.request_stamps(%L::uuid, 1::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  '55000',
  'pending_stamp_request_exists',
  'a second unresolved request is rejected'
);

-- A customer cannot review even their own request.
select extensions.throws_ok(
  format(
    'select public.review_stamp_request(%L::uuid, %L, 1::smallint, null)',
    (
      select id
      from public.stamp_requests
      where user_id = '40000000-0000-4000-8000-000000000001'
        and status = 'pending'
    ),
    'approve'
  ),
  '42501',
  'admin_access_required',
  'customer cannot review a stamp request'
);

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);

-- The fixed six-card MVP does not permit disabling one definition.
select extensions.throws_ok(
  $$
    select public.admin_update_card_definition(
      '31000000-0000-4000-8000-000000000001'::uuid,
      'Test Card 1',
      null,
      'Test Reward 1',
      null,
      null,
      30,
      false
    )
  $$,
  '55000',
  'fixed_loyalty_card_definition_must_remain_active',
  'admin cannot disable a required loyalty card definition'
);
select extensions.throws_ok(
  $$
    update public.loyalty_card_definitions
    set is_active = false
    where id = '31000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'database constraint also prevents bypassing the fixed active-definition policy'
);
select extensions.is(
  (
    select is_active
    from public.loyalty_card_definitions
    where id = '31000000-0000-4000-8000-000000000001'
  ),
  true,
  'failed deactivation leaves the definition active'
);

-- Approval is atomic, auditable, and single-use.
select extensions.lives_ok(
  format(
    'select public.review_stamp_request(%L::uuid, %L, 1::smallint, %L)',
    (
      select id
      from public.stamp_requests
      where user_id = '40000000-0000-4000-8000-000000000001'
        and status = 'pending'
    ),
    'approve',
    'Receipt checked'
  ),
  'admin can approve a pending request'
);
select extensions.is(
  (
    select mc.stamps_count
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
  ),
  1,
  'approval increments the authoritative count'
);
select extensions.is(
  (select count(*) from public.stamp_events where user_id = '40000000-0000-4000-8000-000000000001'),
  1::bigint,
  'approval appends one immutable ledger event'
);
select extensions.throws_ok(
  format(
    'select public.review_stamp_request(%L::uuid, %L, 1::smallint, null)',
    (
      select id
      from public.stamp_requests
      where user_id = '40000000-0000-4000-8000-000000000001'
      order by requested_at
      limit 1
    ),
    'approve'
  ),
  '55000',
  'stamp_request_already_reviewed',
  'double approval is rejected'
);

-- A +2 request can receive a partial approval of one.
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok(
  format(
    'select public.request_stamps(%L::uuid, 2::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  'customer can request two stamps'
);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select extensions.lives_ok(
  format(
    'select public.review_stamp_request(%L::uuid, %L, 1::smallint, null)',
    (
      select id
      from public.stamp_requests
      where user_id = '40000000-0000-4000-8000-000000000001'
        and status = 'pending'
    ),
    'approve'
  ),
  'admin may partially approve one of two requested stamps'
);
select extensions.is(
  (
    select mc.stamps_count
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
  ),
  2,
  'partial approval adds only the approved count'
);

-- Rejection records a decision without changing stamps.
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok(
  format(
    'select public.request_stamps(%L::uuid, 2::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  'customer can submit a request that will be rejected'
);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select extensions.lives_ok(
  format(
    'select public.review_stamp_request(%L::uuid, %L, 0::smallint, %L)',
    (
      select id
      from public.stamp_requests
      where user_id = '40000000-0000-4000-8000-000000000001'
        and status = 'pending'
    ),
    'reject',
    'Receipt mismatch'
  ),
  'admin can reject a pending request'
);
select extensions.is(
  (
    select mc.stamps_count
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
  ),
  2,
  'rejection does not change stamp progress'
);

-- Capacity, exact eighth stamp, reward, and sequential unlock.
select extensions.lives_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, 5::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    ),
    'Prepare capacity boundary test'
  ),
  'admin adjustment can bring the active card to seven'
);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select extensions.throws_ok(
  format(
    'select public.request_stamps(%L::uuid, 2::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  '22003',
  'insufficient_stamp_capacity',
  'request cannot exceed the remaining card capacity'
);
select extensions.lives_ok(
  format(
    'select public.request_stamps(%L::uuid, 1::smallint, null)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    )
  ),
  'one remaining stamp can be requested'
);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select extensions.lives_ok(
  format(
    'select public.review_stamp_request(%L::uuid, %L, 1::smallint, null)',
    (
      select id
      from public.stamp_requests
      where user_id = '40000000-0000-4000-8000-000000000001'
        and status = 'pending'
    ),
    'approve'
  ),
  'eighth approved stamp completes the card atomically'
);
select extensions.is(
  (
    select mc.status::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
  ),
  'completed'::text,
  'eighth stamp marks card one completed'
);
select extensions.is(
  (
    select mc.status::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 2
  ),
  'active'::text,
  'card completion activates the next card'
);
select extensions.is(
  (select count(*) from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001' and status = 'available'),
  1::bigint,
  'card completion unlocks one available reward'
);

-- A safe completed-card revoke reverses only untouched downstream progression.
select extensions.is(
  (
    public.adjust_member_stamps(
      (
        select mc.id
        from public.member_cards as mc
        join public.member_programs as mp on mp.id = mc.member_program_id
        where mp.user_id = '40000000-0000-4000-8000-000000000001'
          and mc.sequence_no = 1
      ),
      (-1)::smallint,
      'Correct an erroneous completion'
    ) ->> 'completion_reversed'
  )::boolean,
  true,
  'revoke reports that card completion was reversed'
);
select extensions.is(
  (
    select mc.status::text || ':' || mc.stamps_count::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
  ),
  'active:7'::text,
  'reversal reopens the completed card with corrected progress'
);
select extensions.is(
  (
    select mc.status::text || ':' || mc.stamps_count::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 2
  ),
  'locked:0'::text,
  'reversal relocks the untouched next card before reopening the previous card'
);
select extensions.is(
  (select count(*) from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'reversal invalidates the still-available reward'
);
select extensions.is(
  (
    select count(*)
    from public.stamp_events as se
    join public.member_cards as mc on mc.id = se.member_card_id
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 1
      and se.event_type = 'revoke'
  ),
  1::bigint,
  'completion reversal appends an immutable revoke ledger event'
);
select extensions.lives_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, 1::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    ),
    'Restore corrected completion'
  ),
  'the reopened card can be completed again'
);
select extensions.is(
  (
    select mc.status::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 2
  ),
  'active'::text,
  'recompletion activates the next card again'
);
select extensions.is(
  (
    select expires_at
    from public.reward_redemptions
    where user_id = '40000000-0000-4000-8000-000000000001'
      and status = 'available'
  ),
  (
    select available_at + interval '30 days'
    from public.reward_redemptions
    where user_id = '40000000-0000-4000-8000-000000000001'
      and status = 'available'
  ),
  'reward expiry is snapshotted when the reward is created'
);

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select extensions.ok(
  (public.get_my_loyalty_state('database-test-loyalty') -> 'rewards' -> 0) ? 'expires_at',
  'customer loyalty-state JSON exposes reward expires_at'
);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select extensions.ok(
  (public.get_admin_customer_detail('40000000-0000-4000-8000-000000000001') -> 'rewards' -> 0) ? 'expires_at',
  'admin customer-detail JSON exposes reward expires_at'
);

select extensions.lives_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, 1::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 2
    ),
    'Create downstream progress guard fixture'
  ),
  'admin can add progress to the active next card'
);
select extensions.throws_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, (-1)::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    ),
    'Unsafe reversal with downstream progress'
  ),
  '55000',
  'next_member_card_has_progress',
  'completion reversal is blocked after the next card gains progress'
);
select extensions.lives_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, (-1)::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 2
    ),
    'Remove downstream progress guard fixture'
  ),
  'active-card revoke removes the downstream guard fixture'
);
select extensions.throws_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, (-1)::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    ),
    'Unsafe reversal after downstream audit activity'
  ),
  '55000',
  'next_member_card_has_activity',
  'completion reversal remains blocked after downstream progress returns to zero'
);

update public.reward_redemptions
set available_at = statement_timestamp() - interval '2 days',
    expires_at = statement_timestamp() - interval '1 day'
where user_id = '40000000-0000-4000-8000-000000000001'
  and status = 'available';

select extensions.throws_ok(
  format(
    'select public.redeem_reward(%L::uuid, null)',
    (
      select id
      from public.reward_redemptions
      where user_id = '40000000-0000-4000-8000-000000000001'
        and status = 'available'
    )
  ),
  '55000',
  'reward_expired',
  'an expired reward cannot be redeemed'
);
select extensions.is(
  (
    public.search_admin_customers('Customer One', 10, 0)
      -> 'data' -> 0 ->> 'rewards_available'
  )::integer,
  0,
  'admin customer metrics exclude expired available rewards'
);

update public.reward_redemptions
set available_at = statement_timestamp(),
    expires_at = statement_timestamp() + interval '30 days'
where user_id = '40000000-0000-4000-8000-000000000001'
  and status = 'available';

-- Reward redemption and immutable audit protection.
select extensions.lives_ok(
  format(
    'select public.redeem_reward(%L::uuid, %L)',
    (
      select id
      from public.reward_redemptions
      where user_id = '40000000-0000-4000-8000-000000000001'
      limit 1
    ),
    'Collected in store'
  ),
  'admin can redeem an available reward'
);
select extensions.throws_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, (-1)::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 1
    ),
    'Unsafe reversal after redemption'
  ),
  '55000',
  'completed_card_reward_not_available_for_reversal',
  'a redeemed reward makes completion reversal unavailable'
);
select extensions.throws_ok(
  format(
    'select public.redeem_reward(%L::uuid, null)',
    (
      select id
      from public.reward_redemptions
      where user_id = '40000000-0000-4000-8000-000000000001'
      limit 1
    )
  ),
  '55000',
  'reward_already_redeemed',
  'the same reward cannot be redeemed twice'
);
select extensions.throws_ok(
  $$
    update public.stamp_events
    set reason = 'tampered'
    where user_id = '40000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'stamp_events_are_immutable',
  'stamp ledger rows cannot be updated'
);

-- Complete the remaining cards and the full six-card journey.
select extensions.lives_ok(
  format('select public.adjust_member_stamps(%L::uuid, 8::smallint, %L)',
    (select mc.id from public.member_cards mc join public.member_programs mp on mp.id = mc.member_program_id where mp.user_id = '40000000-0000-4000-8000-000000000001' and mc.sequence_no = 2),
    'Complete test card two'),
  'admin grant can complete card two'
);
select extensions.lives_ok(
  format('select public.adjust_member_stamps(%L::uuid, 8::smallint, %L)',
    (select mc.id from public.member_cards mc join public.member_programs mp on mp.id = mc.member_program_id where mp.user_id = '40000000-0000-4000-8000-000000000001' and mc.sequence_no = 3),
    'Complete test card three'),
  'admin grant can complete card three'
);
select extensions.lives_ok(
  format('select public.adjust_member_stamps(%L::uuid, 8::smallint, %L)',
    (select mc.id from public.member_cards mc join public.member_programs mp on mp.id = mc.member_program_id where mp.user_id = '40000000-0000-4000-8000-000000000001' and mc.sequence_no = 4),
    'Complete test card four'),
  'admin grant can complete card four'
);
select extensions.lives_ok(
  format('select public.adjust_member_stamps(%L::uuid, 8::smallint, %L)',
    (select mc.id from public.member_cards mc join public.member_programs mp on mp.id = mc.member_program_id where mp.user_id = '40000000-0000-4000-8000-000000000001' and mc.sequence_no = 5),
    'Complete test card five'),
  'admin grant can complete card five'
);
select extensions.lives_ok(
  format('select public.adjust_member_stamps(%L::uuid, 8::smallint, %L)',
    (select mc.id from public.member_cards mc join public.member_programs mp on mp.id = mc.member_program_id where mp.user_id = '40000000-0000-4000-8000-000000000001' and mc.sequence_no = 6),
    'Complete test card six'),
  'admin grant can complete card six'
);
select extensions.is(
  (
    select status::text
    from public.member_programs
    where user_id = '40000000-0000-4000-8000-000000000001'
      and program_id = '30000000-0000-4000-8000-000000000001'
  ),
  'completed'::text,
  'card six completion completes the member program'
);
select extensions.is(
  (select count(*) from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001'),
  6::bigint,
  'six completed cards create exactly six rewards'
);

-- Reversing the final card reopens the member program and can be completed again.
select extensions.is(
  (
    public.adjust_member_stamps(
      (
        select mc.id
        from public.member_cards as mc
        join public.member_programs as mp on mp.id = mc.member_program_id
        where mp.user_id = '40000000-0000-4000-8000-000000000001'
          and mc.sequence_no = 6
      ),
      (-1)::smallint,
      'Correct final-card completion'
    ) ->> 'completion_reversed'
  )::boolean,
  true,
  'final-card revoke reports a completion reversal'
);
select extensions.is(
  (
    select status::text
    from public.member_programs
    where user_id = '40000000-0000-4000-8000-000000000001'
      and program_id = '30000000-0000-4000-8000-000000000001'
  ),
  'active'::text,
  'final-card reversal reopens the member program'
);
select extensions.is(
  (
    select mc.status::text || ':' || mc.stamps_count::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 6
  ),
  'active:7'::text,
  'final-card reversal reopens card six at seven stamps'
);
select extensions.is(
  (select count(*) from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001'),
  5::bigint,
  'final-card reversal invalidates only card six reward'
);
select extensions.lives_ok(
  format(
    'select public.adjust_member_stamps(%L::uuid, 1::smallint, %L)',
    (
      select mc.id
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      where mp.user_id = '40000000-0000-4000-8000-000000000001'
        and mc.sequence_no = 6
    ),
    'Restore final-card completion'
  ),
  'reopened final card can complete again'
);
select extensions.is(
  (
    select status::text
    from public.member_programs
    where user_id = '40000000-0000-4000-8000-000000000001'
      and program_id = '30000000-0000-4000-8000-000000000001'
  ),
  'completed'::text,
  'recompletion closes the member program again'
);
select extensions.is(
  (
    select mc.status::text
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.sequence_no = 6
  ),
  'completed'::text,
  'card six is completed again after correction'
);
select extensions.is(
  (select count(*) from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001'),
  6::bigint,
  'recompletion recreates exactly one card six reward'
);

-- RLS prevents a different customer reading customer-one data.
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
select extensions.is(
  (select count(*) from public.profiles where id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'customer cannot read another profile'
);
select extensions.is(
  (select count(*) from public.member_programs where user_id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'customer cannot read another membership'
);
reset role;

-- SQL privileges expose reads and vetted RPCs, never raw loyalty writes.
select extensions.ok(
  not has_table_privilege('authenticated', 'public.member_cards', 'UPDATE'),
  'authenticated role has no direct member-card update privilege'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.stamp_events', 'INSERT'),
  'authenticated role has no direct stamp-event insert privilege'
);
select extensions.ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated role cannot update profile role'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.request_stamps(uuid,smallint,text)', 'EXECUTE'),
  'anonymous role cannot execute request_stamps'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.request_stamps(uuid,smallint,text)', 'EXECUTE'),
  'authenticated role can execute the vetted request RPC'
);

-- Customer role cannot call an admin mutation even with a known reward id.
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
select extensions.throws_ok(
  format(
    'select public.redeem_reward(%L::uuid, null)',
    (select id from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001' limit 1)
  ),
  '42501',
  'admin_access_required',
  'customer cannot redeem a reward through the admin RPC'
);

-- Partial unique indexes remain effective after progression.
select extensions.is(
  (
    select count(*)
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mp.user_id = '40000000-0000-4000-8000-000000000001'
      and mc.status = 'active'
  ),
  0::bigint,
  'a completed six-card journey has no active card'
);
select extensions.is(
  (
    select count(*)
    from public.stamp_requests
    where user_id = '40000000-0000-4000-8000-000000000001'
      and status = 'pending'
  ),
  0::bigint,
  'completed journey leaves no unresolved request'
);

-- Admin API deletion invokes the auth trigger and leaves no customer data behind.
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok(
  $$ select public.admin_prepare_customer_deletion('40000000-0000-4000-8000-000000000001') $$,
  'admin can authorize complete customer deletion'
);

delete from auth.users
where id = '40000000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*) from auth.users where id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'customer auth account is deleted'
);
select extensions.is(
  (select count(*) from public.profiles where id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'customer profile is deleted'
);
select extensions.is(
  (
    (select count(*) from public.member_programs where user_id = '40000000-0000-4000-8000-000000000001')
    +
    (select count(*) from public.member_cards where member_program_id in (
      select id from public.member_programs where user_id = '40000000-0000-4000-8000-000000000001'
    ))
  ),
  0::bigint,
  'customer memberships and cards are deleted'
);
select extensions.is(
  (
    (select count(*) from public.stamp_requests where user_id = '40000000-0000-4000-8000-000000000001')
    +
    (select count(*) from public.stamp_events where user_id = '40000000-0000-4000-8000-000000000001')
  ),
  0::bigint,
  'customer stamp requests and ledger are deleted'
);
select extensions.is(
  (select count(*) from public.reward_redemptions where user_id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'customer rewards are deleted'
);

select * from extensions.finish();
rollback;
