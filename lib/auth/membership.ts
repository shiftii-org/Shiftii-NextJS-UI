import { headers } from "next/headers";
import { supabaseFetch } from "@/lib/supabase/server";
import { normalizeAccessRole, type AccessRole } from "@/lib/auth/roles";

type MembershipUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  organization_id: number | null;
};

export type CurrentMembership = {
  userId: number | null;
  email: string;
  organizationId: number | null;
  accessRole: AccessRole;
  source: "trusted-header" | "local-development";
};

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const requestHeaders = await headers();
  const trustedEmail = requestHeaders.get("oai-authenticated-user-email");

  if (trustedEmail) {
    return findMembershipByEmail(trustedEmail);
  }

  if (allowLocalAdminBypass()) {
    return {
      userId: null,
      email: process.env.SHIFTTII_ADMIN_EMAIL ?? "local-admin@shiftii.dev",
      organizationId: null,
      accessRole: "ADMIN",
      source: "local-development",
    };
  }

  return null;
}

async function findMembershipByEmail(email: string): Promise<CurrentMembership | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const users = await supabaseFetch<MembershipUser[]>(
    `users_user?select=id,email,role,is_active,organization_id&email=eq.${encodeURIComponent(normalizedEmail)}&is_active=eq.true&limit=1`,
  );
  const user = users[0];

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organization_id,
    accessRole: normalizeAccessRole(user.role),
    source: "trusted-header",
  };
}

function allowLocalAdminBypass() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.SHIFTTII_DEV_ALLOW_ADMIN === "true"
  );
}
