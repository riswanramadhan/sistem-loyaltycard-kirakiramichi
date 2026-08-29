-- Jalankan seluruh file ini sekali di Supabase Dashboard > SQL Editor.
-- Idempotent: bila email sudah ada, password dan role akan diperbarui.
-- Setelah login pertama berhasil, ganti password dari halaman Profile.

do $$
declare
  v_user_id uuid;
  v_email text := 'kirakiramichi@dekatlokal.com';
  v_password text := 'Kirakiramichi0110!';
  v_now timestamptz := statement_timestamp();
begin
  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  order by created_at
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      v_now,
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', 'Kira Kira Michi Admin'),
      v_now,
      v_now
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, v_now),
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('full_name', 'Kira Kira Michi Admin'),
        updated_at = v_now
    where id = v_user_id;
  end if;

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_now,
    v_now,
    v_now
  )
  on conflict (provider_id, provider) do update
  set identity_data = excluded.identity_data,
      updated_at = excluded.updated_at;

  insert into public.profiles (id, full_name, role)
  values (v_user_id, 'Kira Kira Michi Admin', 'admin')
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = 'admin',
      updated_at = v_now;
end;
$$;

select
  au.id,
  au.email,
  au.email_confirmed_at is not null as email_verified,
  p.role,
  p.full_name
from auth.users as au
join public.profiles as p on p.id = au.id
where lower(au.email) = 'kirakiramichi@dekatlokal.com';

