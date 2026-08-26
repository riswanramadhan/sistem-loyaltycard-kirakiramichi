-- Keep every customer/admin read model live. RLS is still evaluated for each
-- Postgres Changes subscriber, so customers only receive their own rows.
alter table public.profiles replica identity full;
alter table public.member_programs replica identity full;

do $$
declare
  v_table text;
begin
  if not exists (
    select 1 from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception using errcode = '55000', message = 'supabase_realtime_publication_missing';
  end if;

  if exists (
    select 1 from pg_catalog.pg_publication
    where pubname = 'supabase_realtime' and not puballtables
  ) then
    foreach v_table in array array['profiles', 'member_programs'] loop
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
