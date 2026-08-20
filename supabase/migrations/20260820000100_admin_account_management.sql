-- Admin account lifecycle. Every public entry point verifies the caller's role.

create or replace function public.admin_promote_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'account_not_found';
  end if;

  if exists (select 1 from public.member_programs where user_id = p_user_id) then
    raise exception using errcode = '55000', message = 'customer_account_cannot_be_promoted';
  end if;

  update public.profiles
  set role = 'admin', updated_at = statement_timestamp()
  where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'profile_not_found';
  end if;
end;
$$;

create or replace function public.get_admin_accounts()
returns table (
  user_id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  return query
  select p.id, p.full_name, u.email::text, p.created_at, u.last_sign_in_at
  from public.profiles as p
  join auth.users as u on u.id = p.id
  where p.role = 'admin'
  order by p.created_at asc;
end;
$$;

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

  raise exception using errcode = '55000', message = 'stamp_events_are_immutable';
end;
$$;

create or replace function public.admin_prepare_customer_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;

  if p_user_id = auth.uid() then
    raise exception using errcode = '55000', message = 'admin_cannot_delete_self';
  end if;

  select role into v_role
  from public.profiles
  where id = p_user_id
  for update;

  if v_role is null then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  if v_role <> 'customer' then
    raise exception using errcode = '42501', message = 'only_customer_accounts_can_be_deleted';
  end if;

  if exists (
    select 1 from public.stamp_events where created_by = p_user_id and user_id <> p_user_id
  ) then
    raise exception using errcode = '55000', message = 'customer_has_admin_audit_activity';
  end if;

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
begin
  select role into v_role
  from public.profiles
  where id = old.id
  for update;

  -- Accounts without an application profile have no loyalty data to purge.
  if v_role is null then
    return old;
  end if;

  if v_role <> 'customer' then
    raise exception using errcode = '42501', message = 'admin_accounts_require_explicit_demotion_before_deletion';
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

drop trigger if exists purge_customer_before_auth_delete on auth.users;
create trigger purge_customer_before_auth_delete
before delete on auth.users
for each row execute function public._purge_customer_before_auth_delete();

revoke all on function public.admin_promote_account(uuid) from public, anon, authenticated;
revoke all on function public.get_admin_accounts() from public, anon, authenticated;
revoke all on function public.admin_prepare_customer_deletion(uuid) from public, anon, authenticated;
revoke all on function public._purge_customer_before_auth_delete() from public;

grant execute on function public.admin_promote_account(uuid) to authenticated;
grant execute on function public.get_admin_accounts() to authenticated;
grant execute on function public.admin_prepare_customer_deletion(uuid) to authenticated;
