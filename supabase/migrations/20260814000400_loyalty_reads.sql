-- Aggregated read models. They avoid client waterfalls and expose auth email only
-- after an explicit own-user/admin authorization check.

create or replace function public.get_my_loyalty_state(
  p_program_slug text default 'kira-kira-michi-loyalty'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_program_id uuid;
  v_member_program_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lp.id
  into v_program_id
  from public.loyalty_programs as lp
  where lp.slug = p_program_slug;

  if v_program_id is null then
    raise exception using errcode = 'P0002', message = 'loyalty_program_not_found';
  end if;

  select mp.id
  into v_member_program_id
  from public.member_programs as mp
  where mp.program_id = v_program_id
    and mp.user_id = v_user_id;

  return jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', au.email,
        'whatsapp', p.whatsapp,
        'role', p.role,
        'marketing_consent', p.marketing_consent,
        'marketing_consent_at', p.marketing_consent_at,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      from public.profiles as p
      join auth.users as au on au.id = p.id
      where p.id = v_user_id
    ),
    'program', (
      select jsonb_build_object(
        'id', lp.id,
        'slug', lp.slug,
        'name', lp.name,
        'description', lp.description,
        'total_cards', lp.total_cards,
        'stamps_per_card', lp.stamps_per_card,
        'is_active', lp.is_active
      )
      from public.loyalty_programs as lp
      where lp.id = v_program_id
    ),
    'member_program', (
      select jsonb_build_object(
        'id', mp.id,
        'program_id', mp.program_id,
        'user_id', mp.user_id,
        'status', mp.status,
        'joined_at', mp.joined_at,
        'completed_at', mp.completed_at
      )
      from public.member_programs as mp
      where mp.id = v_member_program_id
    ),
    'cards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', mc.id,
          'member_program_id', mc.member_program_id,
          'card_definition_id', mc.card_definition_id,
          'sequence_no', mc.sequence_no,
          'status', mc.status,
          'stamps_count', mc.stamps_count,
          'completed_at', mc.completed_at,
          'created_at', mc.created_at,
          'updated_at', mc.updated_at,
          'definition', jsonb_build_object(
            'id', d.id,
            'title', d.title,
            'description', d.description,
            'reward_title', d.reward_title,
            'reward_description', d.reward_description,
            'reward_terms', d.reward_terms,
            'reward_expiry_days', d.reward_expiry_days,
            'is_active', d.is_active
          ),
          'pending_request', (
            select jsonb_build_object(
              'id', sr.id,
              'requested_count', sr.requested_count,
              'customer_note', sr.customer_note,
              'requested_at', sr.requested_at
            )
            from public.stamp_requests as sr
            where sr.member_card_id = mc.id
              and sr.status = 'pending'
            order by sr.requested_at desc
            limit 1
          ),
          'reward', (
            select jsonb_build_object(
              'id', rr.id,
              'status', rr.status,
              'available_at', rr.available_at,
              'expires_at', rr.expires_at,
              'redeemed_at', rr.redeemed_at,
              'note', rr.note
            )
            from public.reward_redemptions as rr
            where rr.member_card_id = mc.id
          )
        )
        order by mc.sequence_no
      )
      from public.member_cards as mc
      join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
      where mc.member_program_id = v_member_program_id
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sr.id,
          'member_card_id', sr.member_card_id,
          'requested_count', sr.requested_count,
          'approved_count', sr.approved_count,
          'status', sr.status,
          'customer_note', sr.customer_note,
          'admin_note', sr.admin_note,
          'requested_at', sr.requested_at,
          'reviewed_at', sr.reviewed_at,
          'card_sequence_no', mc.sequence_no
        )
        order by sr.requested_at desc
      )
      from public.stamp_requests as sr
      join public.member_cards as mc on mc.id = sr.member_card_id
      where sr.user_id = v_user_id
        and mc.member_program_id = v_member_program_id
    ), '[]'::jsonb),
    'stamp_events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', se.id,
          'member_card_id', se.member_card_id,
          'stamp_request_id', se.stamp_request_id,
          'event_type', se.event_type,
          'quantity', se.quantity,
          'reason', se.reason,
          'created_at', se.created_at,
          'card_sequence_no', mc.sequence_no
        )
        order by se.created_at desc
      )
      from public.stamp_events as se
      join public.member_cards as mc on mc.id = se.member_card_id
      where se.user_id = v_user_id
        and mc.member_program_id = v_member_program_id
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rr.id,
          'member_card_id', rr.member_card_id,
          'status', rr.status,
          'available_at', rr.available_at,
          'expires_at', rr.expires_at,
          'redeemed_at', rr.redeemed_at,
          'note', rr.note,
          'card_sequence_no', mc.sequence_no,
          'reward_title', d.reward_title,
          'reward_description', d.reward_description,
          'reward_terms', d.reward_terms,
          'reward_expiry_days', d.reward_expiry_days
        )
        order by mc.sequence_no
      )
      from public.reward_redemptions as rr
      join public.member_cards as mc on mc.id = rr.member_card_id
      join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
      where rr.user_id = v_user_id
        and mc.member_program_id = v_member_program_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  v_start := date_trunc('day', statement_timestamp() at time zone 'Asia/Makassar') at time zone 'Asia/Makassar';
  v_end := v_start + interval '1 day';

  return jsonb_build_object(
    'total_members', (
      select count(distinct mp.user_id)
      from public.member_programs as mp
      join public.profiles as p on p.id = mp.user_id
      where p.role = 'customer'
    ),
    'pending_requests', (
      select count(*)
      from public.stamp_requests as sr
      join public.profiles as p on p.id = sr.user_id
      where sr.status = 'pending'
        and p.role = 'customer'
    ),
    'approved_today', (
      select count(*)
      from public.stamp_requests as sr
      join public.profiles as p on p.id = sr.user_id
      where sr.status = 'approved'
        and sr.reviewed_at >= v_start
        and sr.reviewed_at < v_end
        and p.role = 'customer'
    ),
    'completed_cards', (
      select count(*)
      from public.member_cards as mc
      join public.member_programs as mp on mp.id = mc.member_program_id
      join public.profiles as p on p.id = mp.user_id
      where mc.status = 'completed'
        and p.role = 'customer'
    ),
    'rewards_redeemed', (
      select count(*)
      from public.reward_redemptions as rr
      join public.profiles as p on p.id = rr.user_id
      where rr.status = 'redeemed'
        and p.role = 'customer'
    )
  );
end;
$$;

create or replace function public.list_admin_stamp_requests(
  p_status text default 'pending',
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
  v_status text := lower(coalesce(nullif(btrim(p_status), ''), 'pending'));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  if v_status not in ('all', 'pending', 'approved', 'rejected') then
    raise exception using errcode = '22023', message = 'invalid_request_status_filter';
  end if;

  return jsonb_build_object(
    'data', coalesce((
      select jsonb_agg(to_jsonb(request_rows) order by request_rows.requested_at desc)
      from (
        select
          sr.id,
          sr.member_card_id,
          sr.user_id,
          sr.requested_count,
          sr.approved_count,
          sr.status,
          sr.customer_note,
          sr.admin_note,
          sr.requested_at,
          sr.reviewed_at,
          sr.reviewed_by,
          p.full_name,
          au.email,
          p.whatsapp,
          mc.member_program_id,
          mc.sequence_no as card_sequence_no,
          mc.status as card_status,
          mc.stamps_count,
          d.title as card_title,
          lp.name as program_name
        from public.stamp_requests as sr
        join public.profiles as p on p.id = sr.user_id
        join auth.users as au on au.id = sr.user_id
        join public.member_cards as mc on mc.id = sr.member_card_id
        join public.member_programs as mp on mp.id = mc.member_program_id
        join public.loyalty_programs as lp on lp.id = mp.program_id
        join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
        where p.role = 'customer'
          and (v_status = 'all' or sr.status::text = v_status)
        order by sr.requested_at desc
        limit v_limit
        offset v_offset
      ) as request_rows
    ), '[]'::jsonb),
    'total', (
      select count(*)
      from public.stamp_requests as sr
      join public.profiles as p on p.id = sr.user_id
      where p.role = 'customer'
        and (v_status = 'all' or sr.status::text = v_status)
    ),
    'limit', v_limit,
    'offset', v_offset,
    'status', v_status
  );
end;
$$;

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

create or replace function public.get_admin_customer_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'customer'
  ) then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  select jsonb_build_object(
    'customer', jsonb_build_object(
      'user_id', p.id,
      'full_name', p.full_name,
      'email', au.email,
      'whatsapp', p.whatsapp,
      'role', p.role,
      'marketing_consent', p.marketing_consent,
      'marketing_consent_at', p.marketing_consent_at,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ),
    'member_programs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', mp.id,
          'program_id', mp.program_id,
          'program_slug', lp.slug,
          'program_name', lp.name,
          'status', mp.status,
          'joined_at', mp.joined_at,
          'completed_at', mp.completed_at,
          'cards', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', mc.id,
                'card_definition_id', mc.card_definition_id,
                'sequence_no', mc.sequence_no,
                'status', mc.status,
                'stamps_count', mc.stamps_count,
                'completed_at', mc.completed_at,
                'title', d.title,
                'description', d.description,
                'reward_title', d.reward_title,
                'reward_description', d.reward_description,
                'reward_terms', d.reward_terms,
                'reward_expiry_days', d.reward_expiry_days,
                'reward', (
                  select jsonb_build_object(
                    'id', rr.id,
                    'status', rr.status,
                    'available_at', rr.available_at,
                    'expires_at', rr.expires_at,
                    'redeemed_at', rr.redeemed_at,
                    'redeemed_by', rr.redeemed_by,
                    'note', rr.note
                  )
                  from public.reward_redemptions as rr
                  where rr.member_card_id = mc.id
                )
              )
              order by mc.sequence_no
            )
            from public.member_cards as mc
            join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
            where mc.member_program_id = mp.id
          ), '[]'::jsonb)
        )
        order by mp.joined_at desc
      )
      from public.member_programs as mp
      join public.loyalty_programs as lp on lp.id = mp.program_id
      where mp.user_id = p_user_id
    ), '[]'::jsonb),
    'stamp_requests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sr.id,
          'member_card_id', sr.member_card_id,
          'card_sequence_no', mc.sequence_no,
          'requested_count', sr.requested_count,
          'approved_count', sr.approved_count,
          'status', sr.status,
          'customer_note', sr.customer_note,
          'admin_note', sr.admin_note,
          'requested_at', sr.requested_at,
          'reviewed_at', sr.reviewed_at,
          'reviewed_by', sr.reviewed_by
        )
        order by sr.requested_at desc
      )
      from public.stamp_requests as sr
      join public.member_cards as mc on mc.id = sr.member_card_id
      where sr.user_id = p_user_id
    ), '[]'::jsonb),
    'stamp_events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', se.id,
          'member_card_id', se.member_card_id,
          'card_sequence_no', mc.sequence_no,
          'stamp_request_id', se.stamp_request_id,
          'event_type', se.event_type,
          'quantity', se.quantity,
          'created_by', se.created_by,
          'created_by_name', creator.full_name,
          'reason', se.reason,
          'created_at', se.created_at
        )
        order by se.created_at desc
      )
      from public.stamp_events as se
      join public.member_cards as mc on mc.id = se.member_card_id
      left join public.profiles as creator on creator.id = se.created_by
      where se.user_id = p_user_id
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rr.id,
          'member_card_id', rr.member_card_id,
          'card_sequence_no', mc.sequence_no,
          'reward_title', d.reward_title,
          'status', rr.status,
          'available_at', rr.available_at,
          'expires_at', rr.expires_at,
          'redeemed_at', rr.redeemed_at,
          'redeemed_by', rr.redeemed_by,
          'note', rr.note
        )
        order by rr.available_at desc
      )
      from public.reward_redemptions as rr
      join public.member_cards as mc on mc.id = rr.member_card_id
      join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
      where rr.user_id = p_user_id
    ), '[]'::jsonb)
  )
  into v_result
  from public.profiles as p
  join auth.users as au on au.id = p.id
  where p.id = p_user_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_loyalty_state(text) from public, anon, authenticated;
revoke all on function public.get_admin_dashboard_metrics() from public, anon, authenticated;
revoke all on function public.list_admin_stamp_requests(text, integer, integer) from public, anon, authenticated;
revoke all on function public.search_admin_customers(text, integer, integer) from public, anon, authenticated;
revoke all on function public.get_admin_customer_detail(uuid) from public, anon, authenticated;

grant execute on function public.get_my_loyalty_state(text) to authenticated;
grant execute on function public.get_admin_dashboard_metrics() to authenticated;
grant execute on function public.list_admin_stamp_requests(text, integer, integer) to authenticated;
grant execute on function public.search_admin_customers(text, integer, integer) to authenticated;
grant execute on function public.get_admin_customer_detail(uuid) to authenticated;
