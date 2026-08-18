import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/client";
import { supabaseFetch } from "@/lib/supabase/server";
import { normalizeAccessRole, type AccessRole } from "@/lib/auth/roles";

type MembershipUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  organization_id: number | null;
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type CurrentMembership = {
  authUserId: string | null;
  userId: number | null;
  email: string;
  organizationId: number | null;
  accessRole: AccessRole;
  source: "supabase-auth" | "trusted-header" | "local-development";
};

export async function getCurrentMembership({
  allowDevelopmentBypass = true,
}: {
  allowDevelopmentBypass?: boolean;
} = {}): Promise<CurrentMembership | null> {
  const supabaseMembership = await getSupabaseMembership();
  if (supabaseMembership) return supabaseMembership;

  const requestHeaders = await headers();
  const trustedEmail = requestHeaders.get("oai-authenticated-user-email");

  if (trustedEmail) {
    return findMembershipByEmail(trustedEmail, "trusted-header", null);
  }

  if (allowDevelopmentBypass && allowLocalAdminBypass()) {
    return {
      authUserId: null,
      userId: null,
      email: process.env.SHIFTTII_ADMIN_EMAIL ?? "local-admin@shiftii.dev",
      organizationId: null,
      accessRole: "ADMIN",
      source: "local-development",
    };
  }

  return null;
}

export async function requireCurrentMembership(returnTo: string): Promise<CurrentMembership> {
  const membership = await getCurrentMembership();
  if (membership) return membership;

  redirect(`/?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

async function getSupabaseMembership(): Promise<CurrentMembership | null> {
  const user = await getSupabaseAuthUser();
  if (!user?.email) return null;

  return findMembershipByEmail(user.email, "supabase-auth", user.id);
}

async function getSupabaseAuthUser(): Promise<SupabaseAuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("shiftii_access_token")?.value;

  if (!accessToken) return null;

  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    cache: "no-store",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  return response.json() as Promise<SupabaseAuthUser>;
}

async function findMembershipByEmail(
  email: string,
  source: CurrentMembership["source"],
  authUserId: string | null,
): Promise<CurrentMembership | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const users = await supabaseFetch<MembershipUser[]>(
    `users_user?select=id,email,role,is_active,organization_id&email=eq.${encodeURIComponent(normalizedEmail)}&is_active=eq.true&limit=1`,
  );
  const user = users[0];

  if (!user) return null;

  return {
    authUserId,
    userId: user.id,
    email: user.email,
    organizationId: user.organization_id,
    accessRole: normalizeAccessRole(user.role),
    source,
  };
}

function allowLocalAdminBypass() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.SHIFTTII_DEV_ALLOW_ADMIN === "true"
  );
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/overview";

  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/overview";
    if (url.pathname === "/" || url.pathname === "/login") return "/overview";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/overview";
  }
}
