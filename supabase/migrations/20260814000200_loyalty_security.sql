-- Row-level authorization and deliberately narrow table privileges.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_card_definitions enable row level security;
alter table public.member_programs enable row level security;
alter table public.member_cards enable row level security;
alter table public.stamp_requests enable row level security;
alter table public.stamp_events enable row level security;
alter table public.reward_redemptions enable row level security;

-- Strip broad API privileges first. RPCs below are the only business write surface.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.loyalty_programs from anon, authenticated;
revoke all on table public.loyalty_card_definitions from anon, authenticated;
revoke all on table public.member_programs from anon, authenticated;
revoke all on table public.member_cards from anon, authenticated;
revoke all on table public.stamp_requests from anon, authenticated;
revoke all on table public.stamp_events from anon, authenticated;
revoke all on table public.reward_redemptions from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on type public.app_role to authenticated;
grant usage on type public.member_program_status to authenticated;
grant usage on type public.member_card_status to authenticated;
grant usage on type public.stamp_request_status to authenticated;
grant usage on type public.stamp_event_type to authenticated;
grant usage on type public.reward_status to authenticated;

grant select on table public.loyalty_programs to anon;
grant select on table public.loyalty_card_definitions to anon;

grant select on table public.profiles to authenticated;
grant select on table public.loyalty_programs to authenticated;
grant select on table public.loyalty_card_definitions to authenticated;
grant select on table public.member_programs to authenticated;
grant select on table public.member_cards to authenticated;
grant select on table public.stamp_requests to authenticated;
grant select on table public.stamp_events to authenticated;
grant select on table public.reward_redemptions to authenticated;

-- Even if a customer bypasses update_my_profile, SQL privileges expose only safe columns.
grant update (full_name, whatsapp, marketing_consent)
  on table public.profiles to authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or (select public.is_admin()));

create policy profiles_update_own_safe_columns
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy loyalty_programs_public_select_active
on public.loyalty_programs
for select
to anon
using (is_active);

create policy loyalty_programs_authenticated_select
on public.loyalty_programs
for select
to authenticated
using (is_active or (select public.is_admin()));

create policy loyalty_card_definitions_public_select_active
on public.loyalty_card_definitions
for select
to anon
using (
  is_active
  and exists (
    select 1
    from public.loyalty_programs as lp
    where lp.id = loyalty_card_definitions.program_id
      and lp.is_active
  )
);

create policy loyalty_card_definitions_authenticated_select
on public.loyalty_card_definitions
for select
to authenticated
using (
  (
    is_active
    and exists (
      select 1
      from public.loyalty_programs as lp
      where lp.id = loyalty_card_definitions.program_id
        and lp.is_active
    )
  )
  or (select public.is_admin())
);

create policy member_programs_select_own_or_admin
on public.member_programs
for select
to authenticated
using (user_id = auth.uid() or (select public.is_admin()));

create policy member_cards_select_own_or_admin
on public.member_cards
for select
to authenticated
using (
  exists (
    select 1
    from public.member_programs as mp
    where mp.id = member_cards.member_program_id
      and mp.user_id = auth.uid()
  )
  or (select public.is_admin())
);

create policy stamp_requests_select_own_or_admin
on public.stamp_requests
for select
to authenticated
using (user_id = auth.uid() or (select public.is_admin()));

create policy stamp_events_select_own_or_admin
on public.stamp_events
for select
to authenticated
using (user_id = auth.uid() or (select public.is_admin()));

create policy reward_redemptions_select_own_or_admin
on public.reward_redemptions
for select
to authenticated
using (user_id = auth.uid() or (select public.is_admin()));

