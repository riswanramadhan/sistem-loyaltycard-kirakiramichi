-- Kira Kira Michi loyalty: core schema and database invariants.
-- All business mutations are added in the following migrations.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('customer', 'admin');
create type public.member_program_status as enum ('active', 'completed');
create type public.member_card_status as enum ('locked', 'active', 'completed');
create type public.stamp_request_status as enum ('pending', 'approved', 'rejected');
create type public.stamp_event_type as enum ('grant', 'revoke');
create type public.reward_status as enum ('available', 'redeemed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  whatsapp text,
  role public.app_role not null default 'customer',
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_full_name_valid check (
    char_length(btrim(full_name)) between 1 and 120
  ),
  constraint profiles_whatsapp_valid check (
    whatsapp is null
    or (
      char_length(btrim(whatsapp)) between 5 and 30
      and whatsapp ~ '^[0-9+(). -]+$'
    )
  ),
  constraint profiles_marketing_consent_timestamp_consistent check (
    (marketing_consent and marketing_consent_at is not null)
    or (not marketing_consent and marketing_consent_at is null)
  )
);

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  total_cards integer not null default 6,
  stamps_per_card integer not null default 8,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint loyalty_programs_fixed_mvp_shape check (
    total_cards = 6 and stamps_per_card = 8
  ),
  constraint loyalty_programs_slug_valid check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 80
  ),
  constraint loyalty_programs_name_valid check (
    char_length(btrim(name)) between 1 and 120
  ),
  constraint loyalty_programs_description_length check (
    description is null or char_length(description) <= 2000
  )
);

create table public.loyalty_card_definitions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs (id) on delete restrict,
  sequence_no integer not null,
  title text not null,
  description text,
  reward_title text,
  reward_description text,
  reward_terms text,
  reward_expiry_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint loyalty_card_definitions_program_sequence_unique unique (program_id, sequence_no),
  constraint loyalty_card_definitions_id_program_unique unique (id, program_id),
  constraint loyalty_card_definitions_sequence_valid check (sequence_no between 1 and 6),
  constraint loyalty_card_definitions_title_valid check (
    char_length(btrim(title)) between 1 and 120
  ),
  constraint loyalty_card_definitions_description_length check (
    description is null or char_length(description) <= 2000
  ),
  constraint loyalty_card_definitions_reward_title_length check (
    reward_title is null or char_length(reward_title) <= 160
  ),
  constraint loyalty_card_definitions_reward_description_length check (
    reward_description is null or char_length(reward_description) <= 2000
  ),
  constraint loyalty_card_definitions_reward_terms_length check (
    reward_terms is null or char_length(reward_terms) <= 4000
  ),
  constraint loyalty_card_definitions_reward_expiry_valid check (
    reward_expiry_days is null or reward_expiry_days between 1 and 3650
  ),
  constraint loyalty_card_definitions_fixed_mvp_active check (
    is_active
  )
);

create table public.member_programs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.member_program_status not null default 'active',
  joined_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint member_programs_program_user_unique unique (program_id, user_id),
  constraint member_programs_id_program_unique unique (id, program_id),
  constraint member_programs_completion_consistent check (
    (status = 'active' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table public.member_cards (
  id uuid primary key default gen_random_uuid(),
  member_program_id uuid not null references public.member_programs (id) on delete cascade,
  card_definition_id uuid not null references public.loyalty_card_definitions (id) on delete restrict,
  sequence_no integer not null,
  status public.member_card_status not null,
  stamps_count integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint member_cards_program_sequence_unique unique (member_program_id, sequence_no),
  constraint member_cards_program_definition_unique unique (member_program_id, card_definition_id),
  constraint member_cards_sequence_valid check (sequence_no between 1 and 6),
  constraint member_cards_stamp_range check (stamps_count between 0 and 8),
  constraint member_cards_locked_empty check (status <> 'locked' or stamps_count = 0),
  constraint member_cards_completion_consistent check (
    (
      status = 'completed'
      and stamps_count = 8
      and completed_at is not null
    )
    or (
      status <> 'completed'
      and stamps_count between 0 and 7
      and completed_at is null
    )
  )
);

create table public.stamp_requests (
  id uuid primary key default gen_random_uuid(),
  member_card_id uuid not null references public.member_cards (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_count smallint not null,
  approved_count smallint,
  status public.stamp_request_status not null default 'pending',
  customer_note text,
  admin_note text,
  reviewed_by uuid references auth.users (id) on delete restrict,
  requested_at timestamptz not null default statement_timestamp(),
  reviewed_at timestamptz,
  constraint stamp_requests_requested_count_valid check (requested_count in (1, 2)),
  constraint stamp_requests_approved_count_valid check (
    approved_count is null
    or approved_count between 0 and requested_count
  ),
  constraint stamp_requests_review_state_consistent check (
    (
      status = 'pending'
      and approved_count is null
      and reviewed_by is null
      and reviewed_at is null
    )
    or (
      status = 'approved'
      and approved_count between 1 and requested_count
      and reviewed_by is not null
      and reviewed_at is not null
    )
    or (
      status = 'rejected'
      and approved_count = 0
      and reviewed_by is not null
      and reviewed_at is not null
    )
  ),
  constraint stamp_requests_customer_note_length check (
    customer_note is null or char_length(customer_note) <= 500
  ),
  constraint stamp_requests_admin_note_length check (
    admin_note is null or char_length(admin_note) <= 1000
  )
);

create table public.stamp_events (
  id uuid primary key default gen_random_uuid(),
  member_card_id uuid not null references public.member_cards (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  stamp_request_id uuid references public.stamp_requests (id) on delete restrict,
  event_type public.stamp_event_type not null,
  quantity smallint not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  reason text,
  created_at timestamptz not null default statement_timestamp(),
  constraint stamp_events_quantity_valid check (quantity between 1 and 8),
  constraint stamp_events_reason_length check (
    reason is null or char_length(reason) <= 1000
  )
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  member_card_id uuid not null unique references public.member_cards (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.reward_status not null default 'available',
  available_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete restrict,
  note text,
  constraint reward_redemptions_state_consistent check (
    (
      status = 'available'
      and redeemed_at is null
      and redeemed_by is null
    )
    or (
      status = 'redeemed'
      and redeemed_at is not null
      and redeemed_by is not null
    )
  ),
  constraint reward_redemptions_expiry_valid check (
    expires_at is null or expires_at > available_at
  ),
  constraint reward_redemptions_note_length check (
    note is null or char_length(note) <= 1000
  )
);

-- Business uniqueness and operational indexes.
create unique index member_cards_one_active_per_program_idx
  on public.member_cards (member_program_id)
  where status = 'active';

create unique index stamp_requests_one_pending_per_user_idx
  on public.stamp_requests (user_id)
  where status = 'pending';

create index member_programs_user_status_idx
  on public.member_programs (user_id, status);
create index member_cards_program_status_idx
  on public.member_cards (member_program_id, status, sequence_no);
create index stamp_requests_user_requested_idx
  on public.stamp_requests (user_id, requested_at desc);
create index stamp_requests_status_requested_idx
  on public.stamp_requests (status, requested_at desc);
create index stamp_requests_member_card_idx
  on public.stamp_requests (member_card_id, requested_at desc);
create index stamp_events_user_created_idx
  on public.stamp_events (user_id, created_at desc);
create index stamp_events_member_card_created_idx
  on public.stamp_events (member_card_id, created_at desc);
create index reward_redemptions_user_status_idx
  on public.reward_redemptions (user_id, status, available_at desc);

create or replace function public._set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function public._set_profile_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();

  if tg_op = 'INSERT' then
    new.marketing_consent_at := case
      when new.marketing_consent then coalesce(new.marketing_consent_at, statement_timestamp())
      else null
    end;
  elsif new.marketing_consent is distinct from old.marketing_consent then
    new.marketing_consent_at := case
      when new.marketing_consent then statement_timestamp()
      else null
    end;
  else
    new.marketing_consent_at := old.marketing_consent_at;
  end if;

  return new;
end;
$$;

create trigger profiles_set_timestamps
before insert or update on public.profiles
for each row execute function public._set_profile_timestamps();

create trigger loyalty_programs_set_updated_at
before update on public.loyalty_programs
for each row execute function public._set_updated_at();

create trigger loyalty_card_definitions_set_updated_at
before update on public.loyalty_card_definitions
for each row execute function public._set_updated_at();

create trigger member_cards_set_updated_at
before update on public.member_cards
for each row execute function public._set_updated_at();

create or replace function public._validate_member_card()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member_program_id uuid;
begin
  select mp.program_id
  into v_member_program_id
  from public.member_programs as mp
  where mp.id = new.member_program_id;

  if v_member_program_id is null then
    raise exception using errcode = '23503', message = 'member_program_not_found';
  end if;

  if not exists (
    select 1
    from public.loyalty_card_definitions as d
    where d.id = new.card_definition_id
      and d.program_id = v_member_program_id
      and d.sequence_no = new.sequence_no
  ) then
    raise exception using errcode = '23514', message = 'card_definition_mismatch';
  end if;

  return new;
end;
$$;

create trigger member_cards_validate_definition
before insert or update of member_program_id, card_definition_id, sequence_no
on public.member_cards
for each row execute function public._validate_member_card();

create or replace function public._validate_stamp_request_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mc.id = new.member_card_id
      and mp.user_id = new.user_id
  ) then
    raise exception using errcode = '23514', message = 'stamp_request_owner_mismatch';
  end if;

  return new;
end;
$$;

create trigger stamp_requests_validate_owner
before insert or update of member_card_id, user_id
on public.stamp_requests
for each row execute function public._validate_stamp_request_owner();

create or replace function public._validate_stamp_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mc.id = new.member_card_id
      and mp.user_id = new.user_id
  ) then
    raise exception using errcode = '23514', message = 'stamp_event_owner_mismatch';
  end if;

  if new.stamp_request_id is not null and not exists (
    select 1
    from public.stamp_requests as sr
    where sr.id = new.stamp_request_id
      and sr.member_card_id = new.member_card_id
      and sr.user_id = new.user_id
  ) then
    raise exception using errcode = '23514', message = 'stamp_event_request_mismatch';
  end if;

  return new;
end;
$$;

create trigger stamp_events_validate_relationships
before insert on public.stamp_events
for each row execute function public._validate_stamp_event();

create or replace function public._prevent_stamp_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'stamp_events_are_immutable';
end;
$$;

create trigger stamp_events_immutable
before update or delete on public.stamp_events
for each row execute function public._prevent_stamp_event_mutation();

create or replace function public._validate_reward_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.member_cards as mc
    join public.member_programs as mp on mp.id = mc.member_program_id
    where mc.id = new.member_card_id
      and mp.user_id = new.user_id
      and mc.status = 'completed'
  ) then
    raise exception using errcode = '23514', message = 'reward_owner_or_card_state_invalid';
  end if;

  return new;
end;
$$;

create trigger reward_redemptions_validate_owner
before insert or update of member_card_id, user_id
on public.reward_redemptions
for each row execute function public._validate_reward_owner();

-- Auth metadata is untrusted. This trigger deliberately hard-codes customer role.
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

  v_marketing_consent := lower(coalesce(new.raw_user_meta_data ->> 'marketing_consent', 'false')) = 'true';

  insert into public.profiles (
    id,
    full_name,
    whatsapp,
    role,
    marketing_consent
  )
  values (
    new.id,
    v_full_name,
    v_whatsapp,
    'customer',
    v_marketing_consent
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

revoke all on function public._set_updated_at() from public;
revoke all on function public._set_profile_timestamps() from public;
revoke all on function public._validate_member_card() from public;
revoke all on function public._validate_stamp_request_owner() from public;
revoke all on function public._validate_stamp_event() from public;
revoke all on function public._prevent_stamp_event_mutation() from public;
revoke all on function public._validate_reward_owner() from public;
revoke all on function public.handle_new_auth_user() from public;
