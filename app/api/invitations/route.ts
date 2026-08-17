import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth/membership";
import { canInviteRole } from "@/lib/auth/permissions";
import { isInviteRole } from "@/lib/auth/roles";
import { sendInvitation } from "@/lib/shiftii-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; role?: string };
    const email = body.email?.trim().toLowerCase();
    const role = body.role?.trim().toUpperCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!role || !isInviteRole(role)) {
      return NextResponse.json({ error: "Choose a valid role." }, { status: 400 });
    }

    const membership = await getCurrentMembership();
    if (!canInviteRole(membership, role)) {
      return NextResponse.json(
        { error: "You do not have permission to send this invitation." },
        { status: 403 },
      );
    }

    const result = await sendInvitation({ email, role });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send invitation." },
      { status: 500 },
    );
  }
}
