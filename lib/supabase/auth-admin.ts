import { getSupabaseConfig, shouldSendSupabaseBearer } from "@/lib/supabase/client";
import { getSupabaseServerConfig } from "@/lib/supabase/server";

type AuthUserCreateResult = {
  alreadyExists: boolean;
  confirmationRequired: boolean;
};

type SupabaseAuthPayload = {
  session?: unknown;
  user?: {
    email?: string;
  };
};

export async function createSupabaseAuthUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthUserCreateResult> {
  const { key, usesElevatedKey } = getSupabaseServerConfig();

  if (usesElevatedKey) {
    return createUserWithServiceRole({ email, password, serviceRoleKey: key });
  }

  return signUpWithPublishableKey({ email, password });
}

async function createUserWithServiceRole({
  email,
  password,
  serviceRoleKey,
}: {
  email: string;
  password: string;
  serviceRoleKey: string;
}): Promise<AuthUserCreateResult> {
  const { url } = getSupabaseConfig();
  const headers = new Headers({
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
  });

  if (shouldSendSupabaseBearer(serviceRoleKey)) {
    headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  }

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    body: JSON.stringify({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        source: "shiftii_invite",
      },
    }),
    cache: "no-store",
    headers,
    method: "POST",
  });

  if (response.ok) {
    return { alreadyExists: false, confirmationRequired: false };
  }

  const payload = await readAuthPayload(response);
  if (isAlreadyRegistered(payload)) {
    return { alreadyExists: true, confirmationRequired: false };
  }

  throw new Error(authErrorMessage(payload, "Unable to create Supabase Auth user."));
}

async function signUpWithPublishableKey({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthUserCreateResult> {
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/signup`, {
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await readAuthPayload(response);

  if (response.ok) {
    return {
      alreadyExists: false,
      confirmationRequired: !payload.session,
    };
  }

  if (isAlreadyRegistered(payload)) {
    return { alreadyExists: true, confirmationRequired: false };
  }

  throw new Error(authErrorMessage(payload, "Unable to create Supabase Auth user."));
}

async function readAuthPayload(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as SupabaseAuthPayload & Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function isAlreadyRegistered(payload: Record<string, unknown>) {
  const message = authErrorMessage(payload, "");
  return /already registered|already exists|user already/i.test(message);
}

function authErrorMessage(payload: Record<string, unknown>, fallback: string) {
  for (const key of ["msg", "message", "error", "error_description"]) {
    const value = payload[key];
    if (typeof value === "string") return value;
  }

  return fallback;
}
