-- New business shape: seven cards, six stamps per card, requests from one to
-- six stamps, and an endless cycle that returns to Card 1 after Card 7.

alter table public.loyalty_programs drop constraint if exists loyalty_programs_fixed_mvp_shape;
alter table public.loyalty_card_definitions drop constraint if exists loyalty_card_definitions_sequence_valid;
alter table public.member_cards drop constraint if exists member_cards_sequence_valid;
alter table public.member_cards drop constraint if exists member_cards_stamp_range;
alter table public.member_cards drop constraint if exists member_cards_locked_empty;
alter table public.member_cards drop constraint if exists member_cards_completion_consistent;
alter table public.stamp_requests drop constraint if exists stamp_requests_requested_count_valid;
alter table public.stamp_events drop constraint if exists stamp_events_quantity_valid;
alter table public.reward_redemptions drop constraint if exists reward_redemptions_member_card_id_key;

alter table public.member_programs
  add column if not exists completed_cycles integer not null default 0
    check (completed_cycles >= 0);

alter table public.reward_redemptions
  add column if not exists cycle_no integer not null default 1
    check (cycle_no >= 1),
  add constraint reward_redemptions_member_card_cycle_unique unique (member_card_id, cycle_no);

alter table public.loyalty_programs
  alter column total_cards set default 7,
  alter column stamps_per_card set default 6;

update public.loyalty_programs
set total_cards = 7,
    stamps_per_card = 6
where slug = 'kira-kira-michi-loyalty';

alter table public.loyalty_programs
  add constraint loyalty_programs_fixed_mvp_shape check (
    total_cards = 7 and stamps_per_card = 6
  );

alter table public.loyalty_card_definitions
  add constraint loyalty_card_definitions_sequence_valid check (sequence_no between 1 and 7);

insert into public.loyalty_card_definitions (
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
  lp.id,
  7,
  'Loyalty Card 7',
  'Lengkapi 6 stamp untuk menutup satu putaran loyalty.',
  'Reward 7',
  'Detail reward dapat diperbarui admin dari pengaturan program.',
  'Tunjukkan reward aktif kepada tim Kira Kira Michi.',
  null,
  true
from public.loyalty_programs as lp
where lp.slug = 'kira-kira-michi-loyalty'
on conflict (program_id, sequence_no) do nothing;

-- Preserve approved history while adapting old 7/8-stamp progress.
update public.member_cards
set stamps_count = least(stamps_count, 6),
    completed_at = case
      when stamps_count >= 6 then coalesce(completed_at, statement_timestamp())
      else null
    end;

delete from public.stamp_requests as sr
using public.member_cards as mc
where sr.member_card_id = mc.id
  and sr.status = 'pending'
  and mc.stamps_count = 6;

insert into public.reward_redemptions (
  member_card_id,
  user_id,
  cycle_no,
  status,
  available_at,
  expires_at
)
select
  mc.id,
  mp.user_id,
  1,
  'available',
  coalesce(mc.completed_at, statement_timestamp()),
  case
    when d.reward_expiry_days is null then null
    else coalesce(mc.completed_at, statement_timestamp()) + make_interval(days => d.reward_expiry_days)
  end
from public.member_cards as mc
join public.member_programs as mp on mp.id = mc.member_program_id
join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
where mc.stamps_count = 6
on conflict (member_card_id, cycle_no) do nothing;

insert into public.member_cards (
  member_program_id,
  card_definition_id,
  sequence_no,
  status,
  stamps_count
)
select
  mp.id,
  d.id,
  7,
  'locked',
  0
from public.member_programs as mp
join public.loyalty_card_definitions as d
  on d.program_id = mp.program_id
 and d.sequence_no = 7
on conflict (member_program_id, sequence_no) do nothing;

update public.member_cards
set status = case when stamps_count = 6 then 'completed'::public.member_card_status else 'locked'::public.member_card_status end,
    completed_at = case when stamps_count = 6 then coalesce(completed_at, statement_timestamp()) else null end;

with first_incomplete as (
  select mc.member_program_id, min(mc.sequence_no) as sequence_no
  from public.member_cards as mc
  where mc.stamps_count < 6
  group by mc.member_program_id
)
update public.member_cards as mc
set status = 'active', completed_at = null
from first_incomplete as fi
where mc.member_program_id = fi.member_program_id
  and mc.sequence_no = fi.sequence_no;

update public.member_programs
set status = 'active', completed_at = null;

alter table public.member_cards
  add constraint member_cards_sequence_valid check (sequence_no between 1 and 7),
  add constraint member_cards_stamp_range check (stamps_count between 0 and 6),
  add constraint member_cards_locked_empty check (status <> 'locked' or stamps_count = 0),
  add constraint member_cards_completion_consistent check (
    (status = 'completed' and stamps_count = 6 and completed_at is not null)
    or (status <> 'completed' and stamps_count between 0 and 5 and completed_at is null)
  );

alter table public.stamp_requests
  add constraint stamp_requests_requested_count_valid check (requested_count between 1 and 6);

alter table public.stamp_events
  add constraint stamp_events_quantity_valid check (quantity between 1 and 6);

create or replace function public.join_loyalty_program(
  p_program_slug text default 'kira-kira-michi-loyalty'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_program public.loyalty_programs%rowtype;
  v_member_program_id uuid;
  v_definition_count integer;
  v_member_card_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lp.* into v_program
  from public.loyalty_programs as lp
  where lp.slug = p_program_slug and lp.is_active
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'active_loyalty_program_not_found';
  end if;

  select count(*) into v_definition_count
  from public.loyalty_card_definitions as d
  where d.program_id = v_program.id and d.is_active;

  if v_definition_count <> 7 then
    raise exception using errcode = '55000', message = 'loyalty_program_requires_seven_active_card_definitions';
  end if;

  insert into public.profiles (id, full_name, role)
  select au.id,
    left(coalesce(nullif(btrim(au.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(au.email, ''), '@', 1), ''), 'Member'), 120),
    'customer'
  from auth.users as au
  where au.id = v_user_id
  on conflict (id) do nothing;

  if not exists (select 1 from public.profiles as p where p.id = v_user_id and p.role = 'customer') then
    raise exception using errcode = '42501', message = 'customer_role_required';
  end if;
  if exists (
    select 1 from public.profiles as p
    where p.id = v_user_id
      and p.created_at >= timestamptz '2026-08-30 00:00:00+08'
      and p.date_of_birth is null
  ) then
    raise exception using errcode = '42501', message = 'date_of_birth_required';
  end if;
  if exists (
    select 1 from public.profiles as p
    where p.id = v_user_id
      and p.created_at >= timestamptz '2026-08-30 00:00:00+08'
      and p.terms_accepted_at is null
  ) then
    raise exception using errcode = '42501', message = 'terms_acceptance_required';
  end if;

  insert into public.member_programs (program_id, user_id)
  values (v_program.id, v_user_id)
  on conflict (program_id, user_id) do nothing
  returning id into v_member_program_id;

  if v_member_program_id is null then
    select mp.id into v_member_program_id
    from public.member_programs as mp
    where mp.program_id = v_program.id and mp.user_id = v_user_id
    for update;
  end if;

  insert into public.member_cards (member_program_id, card_definition_id, sequence_no, status)
  select v_member_program_id, d.id, d.sequence_no,
    case when d.sequence_no = 1 then 'active'::public.member_card_status else 'locked'::public.member_card_status end
  from public.loyalty_card_definitions as d
  where d.program_id = v_program.id and d.is_active
  order by d.sequence_no
  on conflict (member_program_id, sequence_no) do nothing;

  select count(*) into v_member_card_count
  from public.member_cards as mc
  join public.loyalty_card_definitions as d
    on d.id = mc.card_definition_id
   and d.program_id = v_program.id
   and d.sequence_no = mc.sequence_no
  where mc.member_program_id = v_member_program_id;

  if v_member_card_count <> 7 then
    raise exception using errcode = '55000', message = 'member_program_initialization_failed';
  end if;

  return v_member_program_id;
end;
$$;

create or replace function public.request_stamps(
  p_member_card_id uuid,
  p_requested_count smallint,
  p_customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_card public.member_cards%rowtype;
  v_member_status public.member_program_status;
  v_program_active boolean;
  v_request_id uuid;
  v_note text := nullif(btrim(p_customer_note), '');
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if not exists (select 1 from public.profiles where id = v_user_id and role = 'customer') then
    raise exception using errcode = '42501', message = 'customer_role_required';
  end if;
  if p_requested_count is null or p_requested_count not between 1 and 6 then
    raise exception using errcode = '22023', message = 'invalid_requested_count';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception using errcode = '22023', message = 'customer_note_too_long';
  end if;

  select mc.* into v_card
  from public.member_cards as mc
  join public.member_programs as mp on mp.id = mc.member_program_id
  where mc.id = p_member_card_id and mp.user_id = v_user_id
  for update of mc;
  if not found then raise exception using errcode = 'P0002', message = 'member_card_not_found'; end if;

  select mp.status, lp.is_active into v_member_status, v_program_active
  from public.member_programs as mp
  join public.loyalty_programs as lp on lp.id = mp.program_id
  where mp.id = v_card.member_program_id
  for share of lp;

  if not v_program_active then raise exception using errcode = '55000', message = 'loyalty_program_not_active'; end if;
  if v_member_status <> 'active' or v_card.status <> 'active' then
    raise exception using errcode = '55000', message = 'member_card_not_active';
  end if;
  if v_card.stamps_count + p_requested_count > 6 then
    raise exception using errcode = '22003', message = 'insufficient_stamp_capacity';
  end if;
  if exists (select 1 from public.stamp_requests where user_id = v_user_id and status = 'pending') then
    raise exception using errcode = '55000', message = 'pending_stamp_request_exists';
  end if;

  begin
    insert into public.stamp_requests (member_card_id, user_id, requested_count, customer_note)
    values (p_member_card_id, v_user_id, p_requested_count, v_note)
    returning id into v_request_id;
  exception when unique_violation then
    raise exception using errcode = '55000', message = 'pending_stamp_request_exists';
  end;
  return v_request_id;
end;
$$;

create or replace function public._advance_loyalty_after_completion(
  p_member_card_id uuid,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.member_cards%rowtype;
  v_user_id uuid;
  v_completed_cycles integer;
  v_cycle_no integer;
  v_next_card_id uuid;
  v_reward_id uuid;
  v_reward_expiry_days integer;
  v_cycle_completed boolean := false;
begin
  select mc.* into v_card
  from public.member_cards as mc
  where mc.id = p_member_card_id
  for update;
  if not found or v_card.status <> 'completed' or v_card.stamps_count <> 6 then
    raise exception using errcode = '55000', message = 'card_is_not_completed';
  end if;

  select mp.user_id, mp.completed_cycles into v_user_id, v_completed_cycles
  from public.member_programs as mp
  where mp.id = v_card.member_program_id
  for update;
  v_cycle_no := v_completed_cycles + 1;

  select d.reward_expiry_days into v_reward_expiry_days
  from public.loyalty_card_definitions as d where d.id = v_card.card_definition_id;

  insert into public.reward_redemptions (member_card_id, user_id, cycle_no, status, available_at, expires_at)
  values (
    v_card.id,
    v_user_id,
    v_cycle_no,
    'available',
    p_completed_at,
    case when v_reward_expiry_days is null then null else p_completed_at + make_interval(days => v_reward_expiry_days) end
  )
  on conflict (member_card_id, cycle_no) do nothing
  returning id into v_reward_id;

  if v_reward_id is null then
    select rr.id into v_reward_id from public.reward_redemptions as rr
    where rr.member_card_id = v_card.id and rr.cycle_no = v_cycle_no;
  end if;

  if v_card.sequence_no < 7 then
    select mc.id into v_next_card_id
    from public.member_cards as mc
    where mc.member_program_id = v_card.member_program_id
      and mc.sequence_no = v_card.sequence_no + 1
    for update;
    update public.member_cards set status = 'active'
    where id = v_next_card_id and status = 'locked';
  else
    v_cycle_completed := true;
    update public.member_programs
    set completed_cycles = completed_cycles + 1,
        status = 'active',
        completed_at = null
    where id = v_card.member_program_id;

    update public.member_cards
    set status = 'locked', stamps_count = 0, completed_at = null
    where member_program_id = v_card.member_program_id;

    update public.member_cards
    set status = 'active'
    where member_program_id = v_card.member_program_id and sequence_no = 1
    returning id into v_next_card_id;
  end if;

  return jsonb_build_object(
    'reward_id', v_reward_id,
    'next_card_id', v_next_card_id,
    'program_completed', false,
    'cycle_completed', v_cycle_completed,
    'completed_cycles', v_completed_cycles + case when v_cycle_completed then 1 else 0 end
  );
end;
$$;

create or replace function public.review_stamp_request(
  p_request_id uuid,
  p_action text,
  p_approved_count smallint default null,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_action text := lower(btrim(p_action));
  v_note text := nullif(btrim(p_admin_note), '');
  v_request public.stamp_requests%rowtype;
  v_card public.member_cards%rowtype;
  v_now timestamptz := statement_timestamp();
  v_new_count integer;
  v_completion jsonb := '{}'::jsonb;
begin
  if v_admin_id is null or not public.is_admin() then raise exception using errcode = '42501', message = 'admin_access_required'; end if;
  if v_action in ('approve', 'approved') then v_action := 'approved';
  elsif v_action in ('reject', 'rejected') then v_action := 'rejected';
  else raise exception using errcode = '22023', message = 'invalid_review_action'; end if;
  if v_note is not null and char_length(v_note) > 1000 then raise exception using errcode = '22023', message = 'admin_note_too_long'; end if;

  select sr.* into v_request from public.stamp_requests as sr where sr.id = p_request_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'stamp_request_not_found'; end if;
  if v_request.status <> 'pending' then raise exception using errcode = '55000', message = 'stamp_request_already_reviewed'; end if;
  select mc.* into v_card from public.member_cards as mc where mc.id = v_request.member_card_id for update;

  if v_action = 'rejected' then
    if coalesce(p_approved_count, 0) <> 0 then raise exception using errcode = '22023', message = 'rejection_cannot_approve_stamps'; end if;
    update public.stamp_requests set status = 'rejected', approved_count = 0, admin_note = v_note, reviewed_by = v_admin_id, reviewed_at = v_now where id = v_request.id;
    return jsonb_build_object('request_id', v_request.id, 'request_status', 'rejected', 'approved_count', 0, 'card_id', v_card.id, 'stamps_count', v_card.stamps_count, 'card_status', v_card.status, 'card_completed', false, 'reward_id', null, 'next_card_id', null, 'program_completed', false, 'cycle_completed', false);
  end if;

  if p_approved_count is null or p_approved_count < 1 or p_approved_count > v_request.requested_count then
    raise exception using errcode = '22023', message = 'invalid_approved_count';
  end if;
  if v_card.status <> 'active' then raise exception using errcode = '55000', message = 'member_card_not_active'; end if;
  v_new_count := v_card.stamps_count + p_approved_count;
  if v_new_count > 6 then raise exception using errcode = '22003', message = 'stamp_approval_exceeds_capacity'; end if;

  insert into public.stamp_events (member_card_id, user_id, stamp_request_id, event_type, quantity, created_by, reason, created_at)
  values (v_card.id, v_request.user_id, v_request.id, 'grant', p_approved_count, v_admin_id, coalesce(v_note, 'Stamp request approved'), v_now);

  update public.member_cards
  set stamps_count = v_new_count,
      status = case when v_new_count = 6 then 'completed'::public.member_card_status else status end,
      completed_at = case when v_new_count = 6 then v_now else null end
  where id = v_card.id;

  update public.stamp_requests
  set status = 'approved', approved_count = p_approved_count, admin_note = v_note, reviewed_by = v_admin_id, reviewed_at = v_now
  where id = v_request.id;

  if v_new_count = 6 then v_completion := public._advance_loyalty_after_completion(v_card.id, v_now); end if;

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', 'approved',
    'approved_count', p_approved_count,
    'card_id', v_card.id,
    'stamps_count', v_new_count,
    'card_status', case when v_new_count = 6 then 'completed' else 'active' end,
    'card_completed', v_new_count = 6,
    'reward_id', v_completion -> 'reward_id',
    'next_card_id', v_completion -> 'next_card_id',
    'program_completed', false,
    'cycle_completed', coalesce((v_completion ->> 'cycle_completed')::boolean, false),
    'completed_cycles', v_completion -> 'completed_cycles'
  );
end;
$$;

create or replace function public.adjust_member_stamps(
  p_member_card_id uuid,
  p_quantity smallint,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_reason text := btrim(p_reason);
  v_card public.member_cards%rowtype;
  v_next_card public.member_cards%rowtype;
  v_reward public.reward_redemptions%rowtype;
  v_user_id uuid;
  v_completed_cycles integer;
  v_new_count integer;
  v_now timestamptz := statement_timestamp();
  v_event_id uuid;
  v_completion jsonb := '{}'::jsonb;
  v_completion_reversed boolean := false;
  v_invalidated_reward_id uuid;
  v_relocked_card_id uuid;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;
  if p_quantity is null or p_quantity = 0 or abs(p_quantity::integer) > 6 then
    raise exception using errcode = '22023', message = 'invalid_adjustment_quantity';
  end if;
  if v_reason is null or char_length(v_reason) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'adjustment_reason_required';
  end if;

  select mc.* into v_card
  from public.member_cards as mc
  where mc.id = p_member_card_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'member_card_not_found'; end if;

  select mp.user_id, mp.completed_cycles into v_user_id, v_completed_cycles
  from public.member_programs as mp where mp.id = v_card.member_program_id for update;

  if v_card.status = 'completed' and p_quantity < 0 and v_card.sequence_no < 7 then
    v_completion_reversed := true;
    select rr.* into v_reward
    from public.reward_redemptions as rr
    where rr.member_card_id = v_card.id
      and rr.cycle_no = v_completed_cycles + 1
    for update;
    if not found or v_reward.status <> 'available' then
      raise exception using errcode = '55000', message = 'completed_card_reward_not_available_for_reversal';
    end if;

    select mc.* into v_next_card
    from public.member_cards as mc
    where mc.member_program_id = v_card.member_program_id
      and mc.sequence_no = v_card.sequence_no + 1
    for update;
    if not found or v_next_card.status <> 'active' or v_next_card.stamps_count <> 0 then
      raise exception using errcode = '55000', message = 'next_member_card_has_progress';
    end if;
    if exists (
      select 1 from public.stamp_events as se
      where se.member_card_id = v_next_card.id and se.created_at >= v_card.completed_at
    ) or exists (
      select 1 from public.stamp_requests as sr
      where sr.member_card_id = v_next_card.id and sr.requested_at >= v_card.completed_at
    ) then
      raise exception using errcode = '55000', message = 'next_member_card_has_activity';
    end if;
    v_invalidated_reward_id := v_reward.id;
    v_relocked_card_id := v_next_card.id;
  elsif v_card.status <> 'active' then
    raise exception using errcode = '55000', message = 'member_card_not_active';
  end if;

  if exists (select 1 from public.stamp_requests where user_id = v_user_id and status = 'pending') then
    raise exception using errcode = '55000', message = 'pending_stamp_request_exists';
  end if;

  v_new_count := v_card.stamps_count + p_quantity;
  if v_new_count < 0 or v_new_count > 6 then
    raise exception using errcode = '22003', message = 'adjustment_exceeds_stamp_bounds';
  end if;

  insert into public.stamp_events (member_card_id, user_id, event_type, quantity, created_by, reason, created_at)
  values (
    v_card.id,
    v_user_id,
    case when p_quantity > 0 then 'grant'::public.stamp_event_type else 'revoke'::public.stamp_event_type end,
    abs(p_quantity::integer)::smallint,
    v_admin_id,
    v_reason,
    v_now
  ) returning id into v_event_id;

  if v_completion_reversed then
    delete from public.reward_redemptions where id = v_reward.id and status = 'available';
    if not found then raise exception using errcode = '55000', message = 'completed_card_reward_not_available_for_reversal'; end if;
    update public.member_cards set status = 'locked' where id = v_next_card.id and status = 'active' and stamps_count = 0;
    if not found then raise exception using errcode = '55000', message = 'next_member_card_has_progress'; end if;
    update public.member_cards set stamps_count = v_new_count, status = 'active', completed_at = null where id = v_card.id;
  else
    update public.member_cards
    set stamps_count = v_new_count,
        status = case when v_new_count = 6 then 'completed'::public.member_card_status else 'active'::public.member_card_status end,
        completed_at = case when v_new_count = 6 then v_now else null end
    where id = v_card.id;
    if v_new_count = 6 then v_completion := public._advance_loyalty_after_completion(v_card.id, v_now); end if;
  end if;

  return jsonb_build_object(
    'event_id', v_event_id,
    'card_id', v_card.id,
    'quantity', p_quantity,
    'stamps_count', v_new_count,
    'card_status', case when v_new_count = 6 then 'completed' else 'active' end,
    'card_completed', v_new_count = 6,
    'reward_id', v_completion -> 'reward_id',
    'next_card_id', v_completion -> 'next_card_id',
    'program_completed', false,
    'cycle_completed', coalesce((v_completion ->> 'cycle_completed')::boolean, false),
    'completion_reversed', v_completion_reversed,
    'invalidated_reward_id', v_invalidated_reward_id,
    'relocked_card_id', v_relocked_card_id
  );
end;
$$;

revoke all on function public.join_loyalty_program(text) from public, anon, authenticated;
revoke all on function public.request_stamps(uuid, smallint, text) from public, anon, authenticated;
revoke all on function public._advance_loyalty_after_completion(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.review_stamp_request(uuid, text, smallint, text) from public, anon, authenticated;
revoke all on function public.adjust_member_stamps(uuid, smallint, text) from public, anon, authenticated;
grant execute on function public.join_loyalty_program(text) to authenticated;
grant execute on function public.request_stamps(uuid, smallint, text) to authenticated;
grant execute on function public.review_stamp_request(uuid, text, smallint, text) to authenticated;
grant execute on function public.adjust_member_stamps(uuid, smallint, text) to authenticated;
