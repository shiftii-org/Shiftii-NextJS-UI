-- Lock down the public schema for Supabase Data API access.
--
-- Apply only after the app runtime has SUPABASE_SECRET_KEY or
-- SUPABASE_SERVICE_ROLE_KEY configured server-side. The Next.js server reads
-- dashboard data with that elevated key and performs app-level membership
-- checks before rendering.
--
-- No anon/authenticated RLS policies are added here intentionally. Browser
-- clients should not query these Django/Shiftii tables directly.

begin;

revoke all privileges on schema public from anon, authenticated;
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke all privileges on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all privileges on tables from anon, authenticated;
alter default privileges in schema public revoke all privileges on sequences from anon, authenticated;
alter default privileges in schema public revoke all privileges on functions from public, anon, authenticated;

do $$
declare
  public_table record;
begin
  for public_table in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I enable row level security',
      public_table.schemaname,
      public_table.tablename
    );
  end loop;
end $$;

commit;
