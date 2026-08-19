import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/client";

type PasswordGrantResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !email.includes("@") || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const { url, publishableKey } = getSupabaseConfig();
  const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    body: JSON.stringify({ email, password }),
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!authResponse.ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const tokens = (await authResponse.json()) as PasswordGrantResponse;
  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("shiftii_access_token", tokens.access_token, {
    httpOnly: true,
    maxAge: tokens.expires_in,
    path: "/",
    sameSite: "lax",
    secure,
  });

  if (tokens.refresh_token) {
    response.cookies.set("shiftii_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }

  return response;
}
