import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth/membership";
import { getSupabaseConfig } from "@/lib/supabase/client";

type HomeProps = {
  searchParams?: Promise<{
    error?: string;
    returnTo?: string;
  }>;
};

type PasswordGrantResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo ?? "/overview");
  const membership = await getCurrentMembership({ allowDevelopmentBypass: false });

  if (membership) {
    redirect(returnTo);
  }

  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const safePath = safeReturnTo(String(formData.get("returnTo") ?? "/overview"));

    if (!email || !email.includes("@") || !password) {
      redirect(`/?returnTo=${encodeURIComponent(safePath)}&error=missing`);
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
      redirect(`/?returnTo=${encodeURIComponent(safePath)}&error=invalid`);
    }

    const tokens = (await authResponse.json()) as PasswordGrantResponse;
    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";

    cookieStore.set("shiftii_access_token", tokens.access_token, {
      httpOnly: true,
      maxAge: tokens.expires_in,
      path: "/",
      sameSite: "lax",
      secure,
    });

    if (tokens.refresh_token) {
      cookieStore.set("shiftii_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
        secure,
      });
    }

    redirect(safePath);
  }

  const errorMessage =
    params?.error === "invalid"
      ? "Invalid email or password."
      : params?.error === "missing"
        ? "Enter your email and password."
        : null;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          shiftii
        </div>
        <div>
          <span className="login-kicker">Connected to Supabase</span>
          <h1>Sign in to your workforce dashboard.</h1>
          <p>Use the account that exists in Supabase Auth and the Shiftii users table.</p>
        </div>
        <form action={signIn} className="login-form">
          <input name="returnTo" type="hidden" value={returnTo} />
          <label>
            Email
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button className="primary" type="submit">Sign in</button>
        </form>
      </section>
    </main>
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
