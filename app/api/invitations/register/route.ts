import { NextResponse } from "next/server";
import { registerStaff, validateInvitation } from "@/lib/shiftii-api";
import { createSupabaseAuthUser } from "@/lib/supabase/auth-admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      first_name?: string;
      last_name?: string;
      password?: string;
    };
    const token = body.token?.trim();
    const first_name = body.first_name?.trim();
    const last_name = body.last_name?.trim();
    const password = body.password ?? "";

    if (!token || !first_name || !last_name || password.length < 8) {
      return NextResponse.json(
        { error: "Enter your first name, last name, and a password with at least 8 characters." },
        { status: 400 },
      );
    }

    const invitation = await validateInvitation(token);
    const result = await registerStaff({ token, first_name, last_name, password });
    const email = extractInvitationEmail(invitation) ?? extractInvitationEmail(result);

    if (!email) {
      return NextResponse.json(
        { error: "The invitation was accepted, but its email address could not be read." },
        { status: 502 },
      );
    }

    const authUser = await createSupabaseAuthUser({
      email: email.trim().toLowerCase(),
      password,
    });

    return NextResponse.json({
      authUser,
      email,
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete registration." },
      { status: 500 },
    );
  }
}

function extractInvitationEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const directEmail = record.email;
  if (typeof directEmail === "string" && directEmail.includes("@")) return directEmail;

  for (const key of ["data", "invite", "invitation", "user"]) {
    const nestedEmail = extractInvitationEmail(record[key]);
    if (nestedEmail) return nestedEmail;
  }

  return null;
}
