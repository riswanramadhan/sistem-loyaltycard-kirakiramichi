-- Admin invitations without a Vercel secret or an Edge Function. An existing
-- authenticated admin records the invitation through a role-checked RPC, then
-- Supabase Auth sends the email OTP with the normal publishable-key flow.

create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null default (statement_timestamp() + interval '7 days'),
  accepted_at timestamptz,
  constraint admin_invitations_email_normalized check (email = lower(btrim(email))),
  constraint admin_invitations_email_valid check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint admin_invitations_name_valid check (char_length(btrim(full_name)) between 2 and 100),
  constraint admin_invitations_expiry_valid check (expires_at > created_at)
);

alter table public.admin_invitations enable row level security;
revoke all on table public.admin_invitations from public, anon, authenticated;

drop policy if exists admin_invitations_admin_read on public.admin_invitations;
create policy admin_invitations_admin_read
on public.admin_invitations
for select
to authenticated
using (public.is_admin());

grant select on table public.admin_invitations to authenticated;

create or replace function public.admin_create_email_invitation(
  p_email text,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_email text := lower(btrim(p_email));
  v_full_name text := btrim(p_full_name);
  v_invitation_id uuid;
  v_existing_user_id uuid;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invalid_admin_email';
  end if;
  if v_full_name is null or char_length(v_full_name) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'invalid_admin_name';
  end if;

  insert into public.admin_invitations (email, full_name, invited_by)
  values (v_email, v_full_name, v_admin_id)
  on conflict (email) do update
  set full_name = excluded.full_name,
      invited_by = excluded.invited_by,
      created_at = statement_timestamp(),
      expires_at = statement_timestamp() + interval '7 days',
      accepted_at = null
  returning id into v_invitation_id;

  select au.id into v_existing_user_id
  from auth.users as au
  where lower(au.email) = v_email
  order by au.created_at
  limit 1;

  if v_existing_user_id is not null then
    insert into public.profiles (id, full_name, role)
    values (v_existing_user_id, v_full_name, 'admin')
    on conflict (id) do update
    set role = 'admin',
        full_name = excluded.full_name,
        updated_at = statement_timestamp();

    update public.admin_invitations
    set accepted_at = statement_timestamp()
    where id = v_invitation_id;
  end if;

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'existing_user', v_existing_user_id is not null,
    'user_id', v_existing_user_id
  );
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_whatsapp text;
  v_marketing_consent boolean;
  v_date_of_birth date;
  v_terms_accepted boolean;
  v_terms_version text;
  v_role public.app_role := 'customer';
  v_invitation_id uuid;
begin
  select ai.id, ai.full_name
  into v_invitation_id, v_full_name
  from public.admin_invitations as ai
  where ai.email = lower(coalesce(new.email, ''))
    and ai.expires_at > statement_timestamp()
  limit 1;

  if v_invitation_id is not null then
    v_role := 'admin';
  else
    v_full_name := left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Member'
      ),
      120
    );
  end if;

  v_whatsapp := nullif(left(btrim(new.raw_user_meta_data ->> 'whatsapp'), 30), '');
  if v_whatsapp is not null and v_whatsapp !~ '^[0-9+(). -]{5,30}$' then v_whatsapp := null; end if;

  begin
    v_date_of_birth := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
    if v_date_of_birth < date '1900-01-01' or v_date_of_birth > current_date then v_date_of_birth := null; end if;
  exception when invalid_datetime_format or datetime_field_overflow then
    v_date_of_birth := null;
  end;

  v_marketing_consent := lower(coalesce(new.raw_user_meta_data ->> 'marketing_consent', 'false')) = 'true';
  v_terms_accepted := lower(coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false')) = 'true';
  v_terms_version := case
    when v_terms_accepted then left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'terms_version'), ''), '2026-08-30'), 40)
    else null
  end;

  insert into public.profiles (
    id, full_name, whatsapp, role, date_of_birth,
    terms_accepted_at, terms_version, marketing_consent
  )
  values (
    new.id,
    left(v_full_name, 120),
    v_whatsapp,
    v_role,
    v_date_of_birth,
    case when v_terms_accepted then statement_timestamp() else null end,
    v_terms_version,
    v_marketing_consent
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = case when v_role = 'admin' then 'admin'::public.app_role else public.profiles.role end,
      updated_at = statement_timestamp();

  if v_invitation_id is not null then
    update public.admin_invitations
    set accepted_at = statement_timestamp()
    where id = v_invitation_id;
  end if;

  return new;
end;
$$;

revoke all on function public.admin_create_email_invitation(text, text) from public, anon, authenticated;
grant execute on function public.admin_create_email_invitation(text, text) to authenticated;
