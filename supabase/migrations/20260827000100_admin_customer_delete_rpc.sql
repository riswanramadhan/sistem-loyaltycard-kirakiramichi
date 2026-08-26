-- Customer deletion is performed inside Postgres so the admin UI does not
-- depend on a privileged key being present in the Vercel runtime. The existing
-- auth.users trigger performs the complete loyalty-data purge atomically.

create or replace function public.admin_delete_customer_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_prepare_customer_deletion(p_user_id);

  delete from auth.users
  where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;
end;
$$;

revoke all on function public.admin_delete_customer_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_customer_account(uuid) to authenticated;
