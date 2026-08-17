export type AccessRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

const employeeRoleAliases = new Set(["EMPLOYEE", "STAFF", "DOCTOR", "NURSE"]);

export function normalizeAccessRole(role: string | null | undefined): AccessRole {
  const normalized = role?.trim().toUpperCase();

  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "MANAGER") return "MANAGER";
  if (employeeRoleAliases.has(normalized ?? "")) return "EMPLOYEE";

  return "EMPLOYEE";
}

export function isInviteRole(role: string | null | undefined) {
  const normalized = role?.trim().toUpperCase();
  return (
    normalized === "ADMIN" ||
    normalized === "MANAGER" ||
    employeeRoleAliases.has(normalized ?? "")
  );
}
