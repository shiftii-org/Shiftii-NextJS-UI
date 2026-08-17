import { normalizeAccessRole, type AccessRole } from "@/lib/auth/roles";
import type { CurrentMembership } from "@/lib/auth/membership";

export function canInviteStaff(membership: CurrentMembership | null) {
  return membership?.accessRole === "ADMIN" || membership?.accessRole === "MANAGER";
}

export function canInviteRole(membership: CurrentMembership | null, inviteRole: string) {
  if (!canInviteStaff(membership)) return false;

  const requestedAccessRole = normalizeAccessRole(inviteRole);

  if (membership?.accessRole === "ADMIN") return true;
  return requestedAccessRole === "EMPLOYEE";
}

export function roleLabel(role: AccessRole) {
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Manager";
  return "Employee";
}
