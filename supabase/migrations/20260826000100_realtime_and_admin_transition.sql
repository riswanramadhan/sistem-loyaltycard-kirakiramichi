-- Customer screens react immediately to new ledger entries and program edits.
alter table public.stamp_events replica identity full;
alter table public.loyalty_programs replica identity full;
alter table public.loyalty_card_definitions replica identity full;

do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise exception using errcode = '55000', message = 'supabase_realtime_publication_missing';
  end if;

  if exists (
    select 1 from pg_catalog.pg_publication
    where pubname = 'supabase_realtime' and not puballtables
  ) then
    foreach v_table in array array['stamp_events', 'loyalty_programs', 'loyalty_card_definitions'] loop
      if not exists (
        select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end;
$$;

-- A bootstrap transition may retire an old admin only after every immutable
-- audit reference is reassigned to a verified replacement admin.
create or replace function public._prevent_stamp_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and current_setting('app.admin_customer_purge', true) = 'on'
  then
    return old;
  end if;

  if tg_op = 'UPDATE'
    and current_setting('app.admin_identity_transfer', true) = 'on'
    and new.id = old.id
    and new.member_card_id = old.member_card_id
    and new.user_id = old.user_id
    and new.stamp_request_id is not distinct from old.stamp_request_id
    and new.event_type = old.event_type
    and new.quantity = old.quantity
    and new.reason is not distinct from old.reason
    and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception using errcode = '55000', message = 'stamp_events_are_immutable';
end;
$$;

create or replace function public._purge_customer_before_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_replacement_id uuid;
begin
  select role into v_role
  from public.profiles
  where id = old.id
  for update;

  if v_role is null then
    return old;
  end if;

  if v_role = 'admin' then
    begin
      v_replacement_id := nullif(old.raw_app_meta_data ->> 'admin_replacement_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'invalid_admin_replacement_id';
    end;

    if v_replacement_id is null or v_replacement_id = old.id or not exists (
      select 1 from public.profiles where id = v_replacement_id and role = 'admin'
    ) then
      raise exception using errcode = '42501', message = 'admin_accounts_require_verified_replacement';
    end if;

    update public.stamp_requests set reviewed_by = v_replacement_id where reviewed_by = old.id;
    perform set_config('app.admin_identity_transfer', 'on', true);
    update public.stamp_events set created_by = v_replacement_id where created_by = old.id;
    update public.reward_redemptions set redeemed_by = v_replacement_id where redeemed_by = old.id;
    perform set_config('app.admin_customer_purge', 'on', true);
    return old;
  end if;

  if exists (
    select 1 from public.stamp_events where created_by = old.id and user_id <> old.id
  ) then
    raise exception using errcode = '55000', message = 'customer_has_admin_audit_activity';
  end if;

  perform set_config('app.admin_customer_purge', 'on', true);
  delete from public.reward_redemptions where user_id = old.id;
  delete from public.stamp_events where user_id = old.id;
  delete from public.stamp_requests where user_id = old.id;
  delete from public.member_programs where user_id = old.id;

  return old;
end;
$$;

comment on function public._purge_customer_before_auth_delete() is
  'Hard-deletes all customer loyalty data, or safely transfers admin audit ownership to a verified replacement during bootstrap.';

-- Editing a reward deadline also updates every still-available reward. Redeemed
-- rewards remain immutable historical snapshots.
create or replace function public._sync_available_reward_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reward_expiry_days is distinct from old.reward_expiry_days then
    update public.reward_redemptions as rr
    set expires_at = case
      when new.reward_expiry_days is null then null
      else rr.available_at + make_interval(days => new.reward_expiry_days)
    end
    from public.member_cards as mc
    where rr.member_card_id = mc.id
      and mc.card_definition_id = new.id
      and rr.status = 'available';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_available_reward_expiry on public.loyalty_card_definitions;
create trigger sync_available_reward_expiry
after update of reward_expiry_days on public.loyalty_card_definitions
for each row execute function public._sync_available_reward_expiry();

revoke all on function public._sync_available_reward_expiry() from public;

comment on function public._sync_available_reward_expiry() is
  'Propagates edited expiry days to every available customer reward while preserving redeemed history.';
