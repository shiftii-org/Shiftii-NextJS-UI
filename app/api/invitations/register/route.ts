import { NextResponse } from "next/server";
import { registerStaff } from "@/lib/shiftii-api";

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

    const result = await registerStaff({ token, first_name, last_name, password });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete registration." },
      { status: 500 },
    );
  }
}
