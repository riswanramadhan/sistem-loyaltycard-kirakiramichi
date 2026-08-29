alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

alter table public.profiles
  add constraint profiles_date_of_birth_valid
    check (date_of_birth is null or date_of_birth >= date '1900-01-01'),
  add constraint profiles_terms_acceptance_consistent
    check (
      (terms_accepted_at is null and terms_version is null)
      or (terms_accepted_at is not null and char_length(btrim(terms_version)) between 1 and 40)
    );

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
begin
  v_full_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    120
  );

  v_whatsapp := nullif(left(btrim(new.raw_user_meta_data ->> 'whatsapp'), 30), '');
  if v_whatsapp is not null and v_whatsapp !~ '^[0-9+(). -]{5,30}$' then
    v_whatsapp := null;
  end if;

  begin
    v_date_of_birth := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
    if v_date_of_birth < date '1900-01-01' or v_date_of_birth > current_date then
      v_date_of_birth := null;
    end if;
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
    id,
    full_name,
    whatsapp,
    role,
    date_of_birth,
    terms_accepted_at,
    terms_version,
    marketing_consent
  )
  values (
    new.id,
    v_full_name,
    v_whatsapp,
    'customer',
    v_date_of_birth,
    case when v_terms_accepted then statement_timestamp() else null end,
    v_terms_version,
    v_marketing_consent
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
