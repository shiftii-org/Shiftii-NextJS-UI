import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/LoginForm";
import { getCurrentMembership } from "@/lib/auth/membership";

type LoginPageProps = {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo ?? "/overview");
  const membership = await getCurrentMembership({ allowDevelopmentBypass: false });

  if (membership) {
    redirect(returnTo);
  }

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
          <span className="login-kicker">Supabase Auth</span>
          <h1>Sign in to your workspace</h1>
          <p>Use the email and password attached to your Shiftii account.</p>
        </div>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/overview";

  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/overview";
    if (url.pathname === "/login") return "/overview";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/overview";
  }
}
