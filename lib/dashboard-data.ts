import { supabaseFetch } from "@/lib/supabase/server";

export type DashboardView =
  | "overview"
  | "organizations"
  | "schedule"
  | "requests"
  | "team"
  | "reports"
  | "settings";

export type Organization = {
  id: number;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  estimated_staff_count: number | null;
};

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  organization_id: number | null;
  joined_at: string | null;
};

export type Roster = {
  id: number;
  month: string;
  organization_id: number;
};

export type Shift = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  assigned_user_id: number | null;
  roster_id: number;
  note: string | null;
};

export type Invitation = {
  id: number;
  email: string;
  role: string;
  accepted: boolean;
  created_at: string;
  organization_id: number;
};

export type SwapRequest = {
  id: number;
  status: string;
  created_at: string;
  organization_id: number;
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
