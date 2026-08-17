const DEFAULT_API_BASE_URL = "https://shiftii-gkeh.onrender.com/api";

type AdminLoginResponse = {
  tokens?: {
    access?: string;
  };
};

type SendInvitationInput = {
  email: string;
  role: string;
};

type StaffRegistrationInput = {
  token: string;
  password: string;
  first_name: string;
  last_name: string;
};

function apiBaseUrl() {
  return (process.env.SHIFTTII_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

async function readApiResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { detail: text };
  }
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["detail", "message", "error", "non_field_errors"]) {
      const value = record[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value) && value.length) return String(value[0]);
    }
  }

  return fallback;
}

async function getAdminAccessToken() {
  const code = process.env.SHIFTTII_ADMIN_ORG_CODE;
  const email = process.env.SHIFTTII_ADMIN_EMAIL;
  const password = process.env.SHIFTTII_ADMIN_PASSWORD;

  if (!code || !email || !password) {
    throw new Error("Invitation API is missing Shiftii admin credentials.");
  }

  const response = await fetch(`${apiBaseUrl()}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, email, password }),
    cache: "no-store",
  });
  const payload = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, "Unable to authenticate with Shiftii API."));
  }

  const access = (payload as AdminLoginResponse).tokens?.access;
  if (!access) {
    throw new Error("Shiftii API login did not return an access token.");
  }

  return access;
}

export async function sendInvitation(input: SendInvitationInput) {
  const access = await getAdminAccessToken();
  const response = await fetch(`${apiBaseUrl()}/invite/send/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const payload = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, "Unable to send invitation."));
  }

  return payload;
}

export async function validateInvitation(token: string) {
  const response = await fetch(`${apiBaseUrl()}/invite/accept/${encodeURIComponent(token)}/`, {
    cache: "no-store",
  });
  const payload = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, "Invitation token is invalid or expired."));
  }

  return payload;
}

export async function registerStaff(input: StaffRegistrationInput) {
  const response = await fetch(`${apiBaseUrl()}/auth/staff/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const payload = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, "Unable to complete staff registration."));
  }

  return payload;
}
