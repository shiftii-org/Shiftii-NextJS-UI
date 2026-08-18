-- Core Shiftii workforce schema.
--
-- This migration adds the normalized multi-tenant model described in the
-- implementation brief. It is safe to review locally before applying to the
-- connected Supabase project.

begin;

create extension if not exists pgcrypto;

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  week_starts_on smallint not null default 1,
  require_claim_approval boolean not null default true,
  require_swap_approval boolean not null default true,
  require_giveup_approval boolean not null default true,
  availability_lock_days integer not null default 0,
  max_weekly_hours numeric(5,2),
  minimum_rest_minutes integer,
  overtime_threshold_hours numeric(5,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_week_starts_on_check check (week_starts_on between 0 and 6),
  constraint organizations_availability_lock_days_check check (availability_lock_days >= 0),
  constraint organizations_max_weekly_hours_check check (max_weekly_hours is null or max_weekly_hours > 0),
  constraint organizations_minimum_rest_minutes_check check (minimum_rest_minutes is null or minimum_rest_minutes >= 0),
  constraint organizations_overtime_threshold_hours_check check (overtime_threshold_hours is null or overtime_threshold_hours > 0)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_role text not null,
  status text not null default 'ACTIVE',
  employee_code text,
  job_title text,
  target_weekly_hours numeric(5,2),
  hired_at date,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_access_role_check check (access_role in ('ADMIN', 'MANAGER', 'EMPLOYEE')),
  constraint memberships_status_check check (status in ('ACTIVE', 'INACTIVE', 'INVITED')),
  constraint memberships_target_weekly_hours_check check (target_weekly_hours is null or target_weekly_hours >= 0),
  constraint memberships_unique_user_org unique (user_id, organization_id),
  constraint memberships_unique_id_org unique (id, organization_id)
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint positions_unique_id_org unique (id, organization_id)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  timezone text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_unique_id_org unique (id, organization_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  manager_membership_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_unique_id_org unique (id, organization_id),
  constraint teams_manager_same_org foreign key (manager_membership_id, organization_id)
    references public.memberships(id, organization_id)
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null,
  membership_id uuid not null,
  team_role text not null default 'MEMBER',
  created_at timestamptz not null default now(),
  constraint team_memberships_role_check check (team_role in ('MEMBER', 'MANAGER')),
  constraint team_memberships_unique unique (team_id, membership_id),
  constraint team_memberships_team_same_org foreign key (team_id, organization_id)
    references public.teams(id, organization_id) on delete cascade,
  constraint team_memberships_member_same_org foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade
);

create table if not exists public.member_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  position_id uuid not null,
  created_at timestamptz not null default now(),
  constraint member_positions_unique unique (membership_id, position_id),
  constraint member_positions_member_same_org foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  constraint member_positions_position_same_org foreign key (position_id, organization_id)
    references public.positions(id, organization_id) on delete cascade
);

create table if not exists public.member_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  location_id uuid not null,
  created_at timestamptz not null default now(),
  constraint member_locations_unique unique (membership_id, location_id),
  constraint member_locations_member_same_org foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  constraint member_locations_location_same_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete cascade
);

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  date_start date not null,
  date_end date not null,
  team_id uuid,
  location_id uuid,
  status text not null default 'DRAFT',
  published_by_membership_id uuid,
  published_at timestamptz,
  archived_at timestamptz,
  created_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rosters_status_check check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  constraint rosters_date_range_check check (date_end >= date_start),
  constraint rosters_team_same_org foreign key (team_id, organization_id)
    references public.teams(id, organization_id),
  constraint rosters_location_same_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id),
  constraint rosters_published_by_same_org foreign key (published_by_membership_id, organization_id)
    references public.memberships(id, organization_id),
  constraint rosters_created_by_same_org foreign key (created_by_membership_id, organization_id)
    references public.memberships(id, organization_id),
  constraint rosters_unique_id_org unique (id, organization_id)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  roster_id uuid not null,
  assigned_membership_id uuid,
  position_id uuid not null,
  location_id uuid not null,
  shift_type text not null default 'DAY',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  cancelled_at timestamptz,
  cancelled_by_membership_id uuid,
  cancellation_note text,
  created_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_type_check check (shift_type in ('DAY', 'NIGHT', 'ON_CALL', 'FLOAT')),
  constraint shifts_time_range_check check (ends_at > starts_at),
  constraint shifts_roster_same_org foreign key (roster_id, organization_id)
    references public.rosters(id, organization_id) on delete cascade,
  constraint shifts_assignee_same_org foreign key (assigned_membership_id, organization_id)
    references public.memberships(id, organization_id),
  constraint shifts_position_same_org foreign key (position_id, organization_id)
    references public.positions(id, organization_id),
  constraint shifts_location_same_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id),
  constraint shifts_cancelled_by_same_org foreign key (cancelled_by_membership_id, organization_id)
    references public.memberships(id, organization_id),
  constraint shifts_created_by_same_org foreign key (created_by_membership_id, organization_id)
    references public.memberships(id, organization_id),
  constraint shifts_unique_id_org unique (id, organization_id)
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  weekday smallint not null,
  starts_at time not null,
  ends_at time not null,
  availability_type text not null default 'AVAILABLE',
  preferred_hours numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_weekday_check check (weekday between 0 and 6),
  constraint availability_rules_type_check check (availability_type in ('AVAILABLE', 'UNAVAILABLE')),
  constraint availability_rules_time_check check (ends_at > starts_at),
  constraint availability_rules_preferred_hours_check check (preferred_hours is null or preferred_hours >= 0),
  constraint availability_rules_member_same_org foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade
);

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  exception_date date not null,
  starts_at time,
  ends_at time,
  availability_type text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exceptions_type_check check (availability_type in ('AVAILABLE', 'UNAVAILABLE')),
  constraint availability_exceptions_time_check check (
    (starts_at is null and ends_at is null) or (starts_at is not null and ends_at is not null and ends_at > starts_at)
  ),
  constraint availability_exceptions_member_same_org foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  leave_type text not null,
  date_start date not null,
  date_end date not null,
  note text,
  status text not null default 'PENDING',
  review_comment text,
  reviewed_by_membership_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  constraint leave_requests_date_range_check check (date_end >= date_start),
  constraint leave_requests_rejection_comment_check check (status <> 'REJECTED' or nullif(btrim(review_comment), '') is not null),
  constraint leave_requests_member_same_org foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  constraint leave_requests_reviewer_same_org foreign key (reviewed_by_membership_id, organization_id)
    references public.memberships(id, organization_id)
);

create table if not exists public.shift_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null,
  claimant_membership_id uuid not null,
  status text not null default 'PENDING',
  decided_by_membership_id uuid,
  decided_at timestamptz,
  decision_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_claims_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'NOT_SELECTED')),
  constraint shift_claims_shift_same_org foreign key (shift_id, organization_id)
    references public.shifts(id, organization_id) on delete cascade,
  constraint shift_claims_claimant_same_org foreign key (claimant_membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  constraint shift_claims_decider_same_org foreign key (decided_by_membership_id, organization_id)
    references public.memberships(id, organization_id)
);

create table if not exists public.shift_swaps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_membership_id uuid not null,
  requester_shift_id uuid not null,
  target_user_id uuid not null,
  target_shift_id uuid not null,
  status text not null default 'PENDING_TARGET',
  target_decided_at timestamptz,
  manager_decided_by_membership_id uuid,
  manager_decided_at timestamptz,
  decision_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_swaps_status_check check (
    status in ('PENDING_TARGET', 'TARGET_ACCEPTED', 'TARGET_DECLINED', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  constraint shift_swaps_requester_member_same_org foreign key (requester_membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  constraint shift_swaps_requester_shift_same_org foreign key (requester_shift_id, organization_id)
    references public.shifts(id, organization_id) on delete cascade,
  constraint shift_swaps_target_user_same_org foreign key (target_user_id, organization_id)
    references public.memberships(user_id, organization_id),
  constraint shift_swaps_target_shift_same_org foreign key (target_shift_id, organization_id)
    references public.shifts(id, organization_id) on delete cascade,
  constraint shift_swaps_manager_same_org foreign key (manager_decided_by_membership_id, organization_id)
    references public.memberships(id, organization_id),
  constraint shift_swaps_distinct_shifts_check check (requester_shift_id <> target_shift_id)
);

create table if not exists public.shift_giveups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null,
  requester_membership_id uuid not null,
  status text not null default 'PENDING',
  decided_by_membership_id uuid,
  decided_at timestamptz,
  decision_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_giveups_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  constraint shift_giveups_shift_same_org foreign key (shift_id, organization_id)
    references public.shifts(id, organization_id) on delete cascade,
  constraint shift_giveups_requester_same_org foreign key (requester_membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade,
  constraint shift_giveups_decider_same_org foreign key (decided_by_membership_id, organization_id)
    references public.memberships(id, organization_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_membership_id uuid not null,
  event_type text not null,
  related_entity_type text,
  related_entity_id uuid,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_same_org foreign key (recipient_membership_id, organization_id)
    references public.memberships(id, organization_id) on delete cascade
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_membership_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_actor_same_org foreign key (actor_membership_id, organization_id)
    references public.memberships(id, organization_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  intended_access_role text not null default 'EMPLOYEE',
  intended_position_id uuid,
  invited_by_membership_id uuid,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_access_role_check check (intended_access_role in ('ADMIN', 'MANAGER', 'EMPLOYEE')),
  constraint invitations_position_same_org foreign key (intended_position_id, organization_id)
    references public.positions(id, organization_id),
  constraint invitations_inviter_same_org foreign key (invited_by_membership_id, organization_id)
    references public.memberships(id, organization_id)
);

create unique index if not exists organizations_lower_name_key on public.organizations (lower(name));
create unique index if not exists profiles_lower_email_key on public.profiles (lower(email));
create index if not exists memberships_organization_id_idx on public.memberships (organization_id);
create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_org_status_role_idx on public.memberships (organization_id, status, access_role);
create unique index if not exists memberships_active_employee_code_key
  on public.memberships (organization_id, lower(employee_code))
  where employee_code is not null and status = 'ACTIVE';

create unique index if not exists positions_org_lower_name_key on public.positions (organization_id, lower(name));
create index if not exists positions_org_active_idx on public.positions (organization_id, is_active);
create unique index if not exists locations_org_lower_name_key on public.locations (organization_id, lower(name));
create index if not exists locations_org_active_idx on public.locations (organization_id, is_active);
create unique index if not exists teams_org_lower_name_key on public.teams (organization_id, lower(name));
create index if not exists teams_org_active_idx on public.teams (organization_id, is_active);
create index if not exists teams_manager_membership_id_idx on public.teams (manager_membership_id);

create index if not exists team_memberships_organization_id_idx on public.team_memberships (organization_id);
create index if not exists team_memberships_team_id_idx on public.team_memberships (team_id);
create index if not exists team_memberships_membership_id_idx on public.team_memberships (membership_id);
create index if not exists member_positions_organization_id_idx on public.member_positions (organization_id);
create index if not exists member_positions_membership_id_idx on public.member_positions (membership_id);
create index if not exists member_positions_position_id_idx on public.member_positions (position_id);
create index if not exists member_locations_organization_id_idx on public.member_locations (organization_id);
create index if not exists member_locations_membership_id_idx on public.member_locations (membership_id);
create index if not exists member_locations_location_id_idx on public.member_locations (location_id);

create index if not exists rosters_org_status_dates_idx on public.rosters (organization_id, status, date_start, date_end);
create index if not exists rosters_team_id_idx on public.rosters (team_id);
create index if not exists rosters_location_id_idx on public.rosters (location_id);
create index if not exists rosters_published_by_membership_id_idx on public.rosters (published_by_membership_id);
create index if not exists rosters_created_by_membership_id_idx on public.rosters (created_by_membership_id);

create index if not exists shifts_org_starts_ends_idx on public.shifts (organization_id, starts_at, ends_at);
create index if not exists shifts_roster_assignee_idx on public.shifts (roster_id, assigned_membership_id);
create index if not exists shifts_assigned_membership_id_idx on public.shifts (assigned_membership_id);
create index if not exists shifts_position_id_idx on public.shifts (position_id);
create index if not exists shifts_location_id_idx on public.shifts (location_id);
create index if not exists shifts_cancelled_by_membership_id_idx on public.shifts (cancelled_by_membership_id);
create index if not exists shifts_created_by_membership_id_idx on public.shifts (created_by_membership_id);
create index if not exists shifts_open_idx on public.shifts (organization_id, starts_at)
  where assigned_membership_id is null and cancelled_at is null;

create index if not exists availability_rules_member_weekday_idx on public.availability_rules (membership_id, weekday);
create index if not exists availability_rules_org_member_idx on public.availability_rules (organization_id, membership_id);
create index if not exists availability_exceptions_member_date_idx on public.availability_exceptions (membership_id, exception_date);
create index if not exists availability_exceptions_org_member_date_idx on public.availability_exceptions (organization_id, membership_id, exception_date);

create index if not exists leave_requests_org_status_created_idx on public.leave_requests (organization_id, status, created_at desc);
create index if not exists leave_requests_member_dates_idx on public.leave_requests (membership_id, date_start, date_end);
create index if not exists leave_requests_reviewer_idx on public.leave_requests (reviewed_by_membership_id);

create index if not exists shift_claims_org_status_created_idx on public.shift_claims (organization_id, status, created_at desc);
create index if not exists shift_claims_shift_id_idx on public.shift_claims (shift_id);
create index if not exists shift_claims_claimant_idx on public.shift_claims (claimant_membership_id);
create index if not exists shift_claims_decider_idx on public.shift_claims (decided_by_membership_id);
create unique index if not exists shift_claims_one_active_claim_per_member_idx
  on public.shift_claims (shift_id, claimant_membership_id)
  where status = 'PENDING';

create index if not exists shift_swaps_org_status_created_idx on public.shift_swaps (organization_id, status, created_at desc);
create index if not exists shift_swaps_requester_member_idx on public.shift_swaps (requester_membership_id);
create index if not exists shift_swaps_requester_shift_idx on public.shift_swaps (requester_shift_id);
create index if not exists shift_swaps_target_user_idx on public.shift_swaps (target_user_id);
create index if not exists shift_swaps_target_shift_idx on public.shift_swaps (target_shift_id);
create index if not exists shift_swaps_manager_decider_idx on public.shift_swaps (manager_decided_by_membership_id);

create index if not exists shift_giveups_org_status_created_idx on public.shift_giveups (organization_id, status, created_at desc);
create index if not exists shift_giveups_shift_id_idx on public.shift_giveups (shift_id);
create index if not exists shift_giveups_requester_idx on public.shift_giveups (requester_membership_id);
create index if not exists shift_giveups_decider_idx on public.shift_giveups (decided_by_membership_id);

create index if not exists notifications_recipient_unread_created_idx on public.notifications (recipient_membership_id, created_at desc)
  where read_at is null;
create index if not exists notifications_org_created_idx on public.notifications (organization_id, created_at desc);
create index if not exists audit_events_org_created_idx on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_membership_id);
create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id);
create index if not exists invitations_org_email_idx on public.invitations (organization_id, lower(email));
create index if not exists invitations_org_expiry_idx on public.invitations (organization_id, expires_at);
create index if not exists invitations_invited_by_idx on public.invitations (invited_by_membership_id);
create index if not exists invitations_position_idx on public.invitations (intended_position_id);

create or replace function private.current_membership_id(target_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.memberships as m
  where m.organization_id = target_organization_id
    and m.user_id = (select auth.uid())
    and m.status = 'ACTIVE'
  limit 1;
$$;

create or replace function private.has_active_membership(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
  );
$$;

create or replace function private.has_membership_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
      and m.access_role = any(allowed_roles)
  );
$$;

revoke all on schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

do $$
declare
  tracked_table text;
begin
  foreach tracked_table in array array[
    'organizations',
    'profiles',
    'memberships',
    'positions',
    'locations',
    'teams',
    'rosters',
    'shifts',
    'availability_rules',
    'availability_exceptions',
    'leave_requests',
    'shift_claims',
    'shift_swaps',
    'shift_giveups',
    'invitations'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', tracked_table);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      tracked_table
    );
  end loop;
end $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.positions enable row level security;
alter table public.locations enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.member_positions enable row level security;
alter table public.member_locations enable row level security;
alter table public.rosters enable row level security;
alter table public.shifts enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.leave_requests enable row level security;
alter table public.shift_claims enable row level security;
alter table public.shift_swaps enable row level security;
alter table public.shift_giveups enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;
alter table public.invitations enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.organizations,
  public.profiles,
  public.memberships,
  public.positions,
  public.locations,
  public.teams,
  public.team_memberships,
  public.member_positions,
  public.member_locations,
  public.rosters,
  public.shifts,
  public.availability_rules,
  public.availability_exceptions,
  public.leave_requests,
  public.shift_claims,
  public.shift_swaps,
  public.shift_giveups,
  public.notifications,
  public.audit_events,
  public.invitations
to authenticated;

create policy organizations_select_member on public.organizations
  for select to authenticated
  using ((select private.has_active_membership(id)));

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using ((select private.has_membership_role(id, array['ADMIN'])))
  with check ((select private.has_membership_role(id, array['ADMIN'])));

create policy profiles_select_related on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid()) or exists (
      select 1
      from public.memberships as profile_memberships
      where profile_memberships.user_id = profiles.id
        and (select private.has_active_membership(profile_memberships.organization_id))
    )
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy memberships_select_org_member on public.memberships
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy memberships_insert_admin on public.memberships
  for insert to authenticated
  with check ((select private.has_membership_role(organization_id, array['ADMIN'])));

create policy memberships_update_admin on public.memberships
  for update to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN'])));

create policy reference_data_select_org_member on public.positions
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy reference_data_write_admin on public.positions
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN'])));

create policy locations_select_org_member on public.locations
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy locations_write_admin on public.locations
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN'])));

create policy teams_select_org_member on public.teams
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy teams_write_admin on public.teams
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN'])));

create policy team_memberships_select_org_member on public.team_memberships
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy team_memberships_write_admin on public.team_memberships
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN'])));

create policy member_positions_select_org_member on public.member_positions
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy member_positions_write_admin_manager on public.member_positions
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])));

create policy member_locations_select_org_member on public.member_locations
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy member_locations_write_admin_manager on public.member_locations
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])));

create policy rosters_select_org_member on public.rosters
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy rosters_write_admin_manager on public.rosters
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])));

create policy shifts_select_org_member on public.shifts
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy shifts_write_admin_manager on public.shifts
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])));

create policy availability_rules_select_org_member on public.availability_rules
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy availability_rules_write_self_or_manager on public.availability_rules
  for all to authenticated
  using (
    membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  )
  with check (
    membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  );

create policy availability_exceptions_select_org_member on public.availability_exceptions
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy availability_exceptions_write_self_or_manager on public.availability_exceptions
  for all to authenticated
  using (
    membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  )
  with check (
    membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  );

create policy leave_requests_select_org_member on public.leave_requests
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy leave_requests_insert_self on public.leave_requests
  for insert to authenticated
  with check (membership_id = (select private.current_membership_id(organization_id)));

create policy leave_requests_update_self_or_manager on public.leave_requests
  for update to authenticated
  using (
    membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  )
  with check (
    membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  );

create policy shift_claims_select_org_member on public.shift_claims
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy shift_claims_insert_self on public.shift_claims
  for insert to authenticated
  with check (claimant_membership_id = (select private.current_membership_id(organization_id)));

create policy shift_claims_update_self_or_manager on public.shift_claims
  for update to authenticated
  using (
    claimant_membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  )
  with check (
    claimant_membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  );

create policy shift_swaps_select_org_member on public.shift_swaps
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy shift_swaps_insert_self on public.shift_swaps
  for insert to authenticated
  with check (requester_membership_id = (select private.current_membership_id(organization_id)));

create policy shift_swaps_update_related_or_manager on public.shift_swaps
  for update to authenticated
  using (
    requester_membership_id = (select private.current_membership_id(organization_id))
    or target_user_id = (select auth.uid())
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  )
  with check (
    requester_membership_id = (select private.current_membership_id(organization_id))
    or target_user_id = (select auth.uid())
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  );

create policy shift_giveups_select_org_member on public.shift_giveups
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy shift_giveups_insert_self on public.shift_giveups
  for insert to authenticated
  with check (requester_membership_id = (select private.current_membership_id(organization_id)));

create policy shift_giveups_update_self_or_manager on public.shift_giveups
  for update to authenticated
  using (
    requester_membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  )
  with check (
    requester_membership_id = (select private.current_membership_id(organization_id))
    or (select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER']))
  );

create policy notifications_select_recipient on public.notifications
  for select to authenticated
  using (recipient_membership_id = (select private.current_membership_id(organization_id)));

create policy notifications_update_recipient on public.notifications
  for update to authenticated
  using (recipient_membership_id = (select private.current_membership_id(organization_id)))
  with check (recipient_membership_id = (select private.current_membership_id(organization_id)));

create policy audit_events_select_org_member on public.audit_events
  for select to authenticated
  using ((select private.has_active_membership(organization_id)));

create policy invitations_select_admin_manager on public.invitations
  for select to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])));

create policy invitations_write_admin_manager on public.invitations
  for all to authenticated
  using ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])))
  with check ((select private.has_membership_role(organization_id, array['ADMIN', 'MANAGER'])));

commit;
