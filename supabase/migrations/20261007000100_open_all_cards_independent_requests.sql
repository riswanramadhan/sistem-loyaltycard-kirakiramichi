-- All seven cards are open from the first day. A customer may request stamps
-- on any card without waiting for another card to be approved; stamps still
-- only land after an admin approves the request. The loyalty cycle restarts
-- once every card of the cycle is complete, not when Card 7 is complete.
--
-- The 'locked' member_card_status value stays in the enum (Postgres cannot drop
-- enum values cleanly) but is no longer assigned to any card.

drop index if exists public.member_cards_one_active_per_program_idx;
drop index if exists public.stamp_requests_one_pending_per_user_idx;

-- A card can wait for one review at a time; different cards are independent.
create unique index if not exists stamp_requests_one_pending_per_card_idx
  on public.stamp_requests (member_card_id)
  where status = 'pending';

-- Open every card that was waiting behind an earlier card.
update public.member_cards
set status = 'active'
where status = 'locked';

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
  select v_member_program_id, d.id, d.sequence_no, 'active'::public.member_card_status
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
  -- A completed card cannot take more stamps; every other card is open.
  if v_member_status <> 'active' or v_card.status <> 'active' then
    raise exception using errcode = '55000', message = 'member_card_not_active';
  end if;
  if v_card.stamps_count + p_requested_count > 6 then
    raise exception using errcode = '22003', message = 'insufficient_stamp_capacity';
  end if;
  -- One request per card waits for review; other cards stay independent.
  if exists (
    select 1 from public.stamp_requests
    where member_card_id = p_member_card_id and status = 'pending'
  ) then
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

-- Completing a card issues its reward. The cycle restarts only when no card of
-- the member is left unfinished; no card is ever "unlocked" by another one.
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
  v_first_card_id uuid;
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

  -- Serialises concurrent completions for one member: the completeness check
  -- below runs after this lock, so the last of two simultaneous approvals sees
  -- the other card as completed and restarts the cycle exactly once.
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

  if not exists (
    select 1 from public.member_cards as mc
    where mc.member_program_id = v_card.member_program_id
      and mc.status <> 'completed'
  ) then
    v_cycle_completed := true;
    update public.member_programs
    set completed_cycles = completed_cycles + 1,
        status = 'active',
        completed_at = null
    where id = v_card.member_program_id;

    update public.member_cards
    set status = 'active', stamps_count = 0, completed_at = null
    where member_program_id = v_card.member_program_id;

    select mc.id into v_first_card_id
    from public.member_cards as mc
    where mc.member_program_id = v_card.member_program_id and mc.sequence_no = 1;
  end if;

  return jsonb_build_object(
    'reward_id', v_reward_id,
    'next_card_id', v_first_card_id,
    'program_completed', false,
    'cycle_completed', v_cycle_completed,
    'completed_cycles', v_completed_cycles + case when v_cycle_completed then 1 else 0 end
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
  v_reward public.reward_redemptions%rowtype;
  v_user_id uuid;
  v_completed_cycles integer;
  v_new_count integer;
  v_now timestamptz := statement_timestamp();
  v_event_id uuid;
  v_completion jsonb := '{}'::jsonb;
  v_completion_reversed boolean := false;
  v_invalidated_reward_id uuid;
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

  -- Revoking from a completed card reopens it, cancelling the reward it earned
  -- in this cycle as long as that reward has not been redeemed.
  if v_card.status = 'completed' and p_quantity < 0 then
    v_completion_reversed := true;
    select rr.* into v_reward
    from public.reward_redemptions as rr
    where rr.member_card_id = v_card.id
      and rr.cycle_no = v_completed_cycles + 1
    for update;
    if not found or v_reward.status <> 'available' then
      raise exception using errcode = '55000', message = 'completed_card_reward_not_available_for_reversal';
    end if;
    v_invalidated_reward_id := v_reward.id;
  elsif v_card.status <> 'active' then
    raise exception using errcode = '55000', message = 'member_card_not_active';
  end if;

  if exists (
    select 1 from public.stamp_requests
    where member_card_id = v_card.id and status = 'pending'
  ) then
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
    'relocked_card_id', null
  );
end;
$$;

-- With every card open there can be several active cards per member; show the
-- lowest-numbered unfinished one so the admin list stays deterministic.
create or replace function public.search_admin_customers(
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  return jsonb_build_object(
    'data', coalesce((
      select jsonb_agg(to_jsonb(customer_rows) order by customer_rows.full_name, customer_rows.joined_at desc)
      from (
        select
          p.id as user_id,
          p.full_name,
          au.email,
          p.whatsapp,
          mp.id as member_program_id,
          mp.program_id,
          lp.name as program_name,
          mp.status as program_status,
          mp.joined_at,
          active_card.id as active_card_id,
          active_card.sequence_no as active_card_sequence,
          active_card.stamps_count as active_card_stamps,
          coalesce(reward_counts.available, 0) as rewards_available,
          coalesce(reward_counts.redeemed, 0) as rewards_redeemed,
          greatest(
            mp.joined_at,
            coalesce(activity.last_request_at, mp.joined_at),
            coalesce(activity.last_event_at, mp.joined_at),
            coalesce(activity.last_redemption_at, mp.joined_at)
          ) as last_activity
        from public.member_programs as mp
        join public.loyalty_programs as lp on lp.id = mp.program_id
        join public.profiles as p on p.id = mp.user_id
        join auth.users as au on au.id = mp.user_id
        left join lateral (
          select mc.id, mc.sequence_no, mc.stamps_count
          from public.member_cards as mc
          where mc.member_program_id = mp.id
            and mc.status = 'active'
          order by mc.sequence_no
          limit 1
        ) as active_card on true
        left join lateral (
          select
            count(*) filter (
              where rr.status = 'available'
                and (rr.expires_at is null or rr.expires_at > statement_timestamp())
            ) as available,
            count(*) filter (where rr.status = 'redeemed') as redeemed
          from public.reward_redemptions as rr
          where rr.user_id = mp.user_id
            and exists (
              select 1
              from public.member_cards as rc
              where rc.id = rr.member_card_id
                and rc.member_program_id = mp.id
            )
        ) as reward_counts on true
        left join lateral (
          select
            (
              select max(sr.requested_at)
              from public.stamp_requests as sr
              join public.member_cards as sc on sc.id = sr.member_card_id
              where sr.user_id = mp.user_id
                and sc.member_program_id = mp.id
            ) as last_request_at,
            (
              select max(se.created_at)
              from public.stamp_events as se
              join public.member_cards as ec on ec.id = se.member_card_id
              where se.user_id = mp.user_id
                and ec.member_program_id = mp.id
            ) as last_event_at,
            (
              select max(rr.redeemed_at)
              from public.reward_redemptions as rr
              join public.member_cards as rc on rc.id = rr.member_card_id
              where rr.user_id = mp.user_id
                and rc.member_program_id = mp.id
            ) as last_redemption_at
        ) as activity on true
        where p.role = 'customer'
          and (
            v_query is null
            or p.full_name ilike '%' || v_query || '%'
            or coalesce(au.email, '') ilike '%' || v_query || '%'
            or coalesce(p.whatsapp, '') ilike '%' || v_query || '%'
          )
        order by p.full_name, mp.joined_at desc
        limit v_limit
        offset v_offset
      ) as customer_rows
    ), '[]'::jsonb),
    'total', (
      select count(*)
      from public.member_programs as mp
      join public.profiles as p on p.id = mp.user_id
      join auth.users as au on au.id = mp.user_id
      where p.role = 'customer'
        and (
          v_query is null
          or p.full_name ilike '%' || v_query || '%'
          or coalesce(au.email, '') ilike '%' || v_query || '%'
          or coalesce(p.whatsapp, '') ilike '%' || v_query || '%'
        )
    ),
    'limit', v_limit,
    'offset', v_offset,
    'query', v_query
  );
end;
$$;

revoke all on function public.join_loyalty_program(text) from public, anon, authenticated;
revoke all on function public.request_stamps(uuid, smallint, text) from public, anon, authenticated;
revoke all on function public._advance_loyalty_after_completion(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.adjust_member_stamps(uuid, smallint, text) from public, anon, authenticated;
revoke all on function public.search_admin_customers(text, integer, integer) from public, anon, authenticated;
grant execute on function public.join_loyalty_program(text) to authenticated;
grant execute on function public.request_stamps(uuid, smallint, text) to authenticated;
grant execute on function public.adjust_member_stamps(uuid, smallint, text) to authenticated;
grant execute on function public.search_admin_customers(text, integer, integer) to authenticated;
