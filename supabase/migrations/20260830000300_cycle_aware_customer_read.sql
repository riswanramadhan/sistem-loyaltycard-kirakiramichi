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
  v_current_cycle integer := 1;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select lp.id into v_program_id
  from public.loyalty_programs as lp
  where lp.slug = p_program_slug;
  if v_program_id is null then raise exception using errcode = 'P0002', message = 'loyalty_program_not_found'; end if;

  select mp.id, mp.completed_cycles + 1
  into v_member_program_id, v_current_cycle
  from public.member_programs as mp
  where mp.program_id = v_program_id and mp.user_id = v_user_id;

  return jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', au.email,
        'whatsapp', p.whatsapp,
        'date_of_birth', p.date_of_birth,
        'terms_accepted_at', p.terms_accepted_at,
        'terms_version', p.terms_version,
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
      ) from public.loyalty_programs as lp where lp.id = v_program_id
    ),
    'member_program', (
      select jsonb_build_object(
        'id', mp.id,
        'program_id', mp.program_id,
        'user_id', mp.user_id,
        'status', mp.status,
        'joined_at', mp.joined_at,
        'completed_at', mp.completed_at,
        'completed_cycles', mp.completed_cycles,
        'current_cycle', mp.completed_cycles + 1
      ) from public.member_programs as mp where mp.id = v_member_program_id
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
            select jsonb_build_object('id', sr.id, 'requested_count', sr.requested_count, 'customer_note', sr.customer_note, 'requested_at', sr.requested_at)
            from public.stamp_requests as sr
            where sr.member_card_id = mc.id and sr.status = 'pending'
            order by sr.requested_at desc limit 1
          ),
          'reward', (
            select jsonb_build_object('id', rr.id, 'cycle_no', rr.cycle_no, 'status', rr.status, 'available_at', rr.available_at, 'expires_at', rr.expires_at, 'redeemed_at', rr.redeemed_at, 'note', rr.note)
            from public.reward_redemptions as rr
            where rr.member_card_id = mc.id and rr.cycle_no = v_current_cycle
            limit 1
          )
        ) order by mc.sequence_no
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
        ) order by sr.requested_at desc
      )
      from public.stamp_requests as sr
      join public.member_cards as mc on mc.id = sr.member_card_id
      where sr.user_id = v_user_id and mc.member_program_id = v_member_program_id
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
        ) order by se.created_at desc
      )
      from public.stamp_events as se
      join public.member_cards as mc on mc.id = se.member_card_id
      where se.user_id = v_user_id and mc.member_program_id = v_member_program_id
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rr.id,
          'member_card_id', rr.member_card_id,
          'cycle_no', rr.cycle_no,
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
        ) order by rr.cycle_no desc, mc.sequence_no
      )
      from public.reward_redemptions as rr
      join public.member_cards as mc on mc.id = rr.member_card_id
      join public.loyalty_card_definitions as d on d.id = mc.card_definition_id
      where rr.user_id = v_user_id and mc.member_program_id = v_member_program_id
    ), '[]'::jsonb),
    'current_cycle', v_current_cycle
  );
end;
$$;

revoke all on function public.get_my_loyalty_state(text) from public, anon, authenticated;
grant execute on function public.get_my_loyalty_state(text) to authenticated;
