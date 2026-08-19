import { supabaseFetch } from "@/lib/supabase/server";

export type EntityId = string | number;

export type DashboardView =
  | "overview"
  | "organizations"
  | "schedule"
  | "requests"
  | "team"
  | "reports"
  | "settings";

export type Organization = {
  id: EntityId;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  estimated_staff_count: number | null;
};

export type User = {
  id: EntityId;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  organization_id: EntityId | null;
  joined_at: string | null;
};

export type Roster = {
  id: EntityId;
  month: string;
  organization_id: EntityId;
};

export type Shift = {
  id: EntityId;
  date: string;
  start_time: string;
  end_time: string;
  assigned_user_id: EntityId | null;
  roster_id: EntityId;
  note: string | null;
};

export type Invitation = {
  id: EntityId;
  email: string;
  role: string;
  accepted: boolean;
  created_at: string;
  organization_id: EntityId;
};

export type SwapRequest = {
  id: EntityId;
  status: string;
  created_at: string;
  organization_id: EntityId;
};

export type DashboardData = {
  organizations: Organization[];
  users: User[];
  rosters: Roster[];
  shifts: Shift[];
  invitations: Invitation[];
  swapRequests: SwapRequest[];
};

export async function loadDashboardData(): Promise<DashboardData> {
  try {
    return await loadCoreDashboardData();
  } catch {
    return loadLegacyDashboardData();
  }
}

type CoreOrganization = {
  id: string;
  name: string;
  timezone: string;
  is_active: boolean;
};

type CoreProfile = {
  id: string;
  email: string;
  full_name: string | null;
};

type CoreMembership = {
  id: string;
  organization_id: string;
  user_id: string;
  access_role: string;
  status: string;
  created_at: string;
};

type CoreRoster = {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  organization_id: string;
  status: string;
};

type CoreShift = {
  id: string;
  roster_id: string;
  assigned_membership_id: string | null;
  starts_at: string;
  ends_at: string;
  note: string | null;
};

type CoreInvitation = {
  id: string;
  email: string;
  intended_access_role: string;
  accepted_at: string | null;
  created_at: string;
  organization_id: string;
};

async function loadCoreDashboardData(): Promise<DashboardData> {
  const [
    organizations,
    profiles,
    memberships,
    rosters,
    shifts,
    invitations,
    swapRequests,
  ] = await Promise.all([
    supabaseFetch<CoreOrganization[]>(
      "organizations?select=id,name,timezone,is_active&order=name.asc",
    ),
    supabaseFetch<CoreProfile[]>(
      "profiles?select=id,email,full_name&order=email.asc",
    ),
    supabaseFetch<CoreMembership[]>(
      "memberships?select=id,organization_id,user_id,access_role,status,created_at&order=created_at.desc",
    ),
    supabaseFetch<CoreRoster[]>(
      "rosters?select=id,name,date_start,date_end,organization_id,status&order=date_start.desc",
    ),
    supabaseFetch<CoreShift[]>(
      "shifts?select=id,roster_id,assigned_membership_id,starts_at,ends_at,note&order=starts_at.asc",
    ),
    supabaseFetch<CoreInvitation[]>(
      "invitations?select=id,email,intended_access_role,accepted_at,created_at,organization_id&order=created_at.desc",
    ),
    supabaseFetch<SwapRequest[]>(
      "shift_swaps?select=id,status,created_at,organization_id&order=created_at.desc",
    ),
  ]);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      code: organization.name.slice(0, 3).toUpperCase(),
      city: null,
      country: null,
      timezone: organization.timezone,
      is_active: organization.is_active,
      estimated_staff_count: memberships.filter(
        (membership) =>
          membership.organization_id === organization.id &&
          membership.status === "ACTIVE",
      ).length,
    })),
    users: memberships.map((membership) => {
      const profile = profilesById.get(membership.user_id);
      const name = splitName(profile?.full_name);

      return {
        id: membership.id,
        email: profile?.email ?? "unknown@shiftii.local",
        first_name: name.first,
        last_name: name.last,
        role: membership.access_role,
        is_active: membership.status === "ACTIVE",
        organization_id: membership.organization_id,
        joined_at: membership.created_at,
      };
    }),
    rosters: rosters.map((roster) => ({
      id: roster.id,
      month: `${roster.date_start} to ${roster.date_end}`,
      organization_id: roster.organization_id,
    })),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      date: isoDate(shift.starts_at),
      start_time: isoTime(shift.starts_at),
      end_time: isoTime(shift.ends_at),
      assigned_user_id: shift.assigned_membership_id,
      roster_id: shift.roster_id,
      note: shift.note,
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.intended_access_role,
      accepted: Boolean(invitation.accepted_at),
      created_at: invitation.created_at,
      organization_id: invitation.organization_id,
    })),
    swapRequests,
  };
}

async function loadLegacyDashboardData(): Promise<DashboardData> {
  const [organizations, users, rosters, shifts, invitations, swapRequests] =
    await Promise.all([
      supabaseFetch<Organization[]>(
        "users_organization?select=id,name,code,city,country,timezone,is_active,estimated_staff_count&order=id.asc",
      ),
      supabaseFetch<User[]>(
        "users_user?select=id,email,first_name,last_name,role,is_active,organization_id,joined_at&order=id.asc",
      ),
      supabaseFetch<Roster[]>(
        "roster_roster?select=id,month,organization_id&order=month.desc",
      ),
      supabaseFetch<Shift[]>(
        "roster_shift?select=id,date,start_time,end_time,assigned_user_id,roster_id,note&order=date.asc,start_time.asc",
      ),
      supabaseFetch<Invitation[]>(
        "users_invitation?select=id,email,role,accepted,created_at,organization_id&order=created_at.desc",
      ),
      supabaseFetch<SwapRequest[]>(
        "swaps_swaprequest?select=id,status,created_at,organization_id&order=created_at.desc",
      ),
    ]);

  return { organizations, users, rosters, shifts, invitations, swapRequests };
}

export function primaryOrganization(organizations: Organization[]) {
  return (
    organizations.find((org) => org.code === "UNI-568") ??
    organizations.find((org) => org.is_active) ??
    organizations[0]
  );
}

export function userName(user: User) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;
}

export function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

export function locationLabel(org: Organization) {
  return [org.city, org.country].filter(Boolean).join(", ") || "No location saved";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function hoursBetween(start: string, end: string) {
  const startMinutes = toMinutes(start);
  let endMinutes = toMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function splitName(value: string | null | undefined) {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    first: parts[0] ?? "",
    last: parts.slice(1).join(" "),
  };
}

function isoDate(value: string) {
  return value.slice(0, 10);
}

function isoTime(value: string) {
  return value.slice(11, 16);
}
