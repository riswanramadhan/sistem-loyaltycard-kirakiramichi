-- Realtime sends change hints; clients must refetch the authoritative RLS-filtered state.
alter table public.member_cards replica identity full;
alter table public.stamp_requests replica identity full;
alter table public.reward_redemptions replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception using
      errcode = '55000',
      message = 'supabase_realtime_publication_missing';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
      and not puballtables
  ) then
    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'member_cards'
    ) then
      alter publication supabase_realtime add table public.member_cards;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'stamp_requests'
    ) then
      alter publication supabase_realtime add table public.stamp_requests;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'reward_redemptions'
    ) then
      alter publication supabase_realtime add table public.reward_redemptions;
    end if;
  end if;
end;
$$;

comment on table public.stamp_events is
  'Append-only stamp ledger. UPDATE and DELETE are rejected by trigger.';
comment on function public.request_stamps(uuid, smallint, text) is
  'Creates one validated pending request for the authenticated customer.';
comment on function public.review_stamp_request(uuid, text, smallint, text) is
  'Atomically approves/partially approves/rejects a pending request as admin.';
comment on function public.adjust_member_stamps(uuid, smallint, text) is
  'Admin-only signed adjustment; safe completed-card reversals relock untouched progression and append a revoke event.';
