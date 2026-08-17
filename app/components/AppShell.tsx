import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { DashboardView, Organization } from "@/lib/dashboard-data";
import { initials, locationLabel } from "@/lib/dashboard-data";
import { roleLabel } from "@/lib/auth/permissions";
import type { AccessRole } from "@/lib/auth/roles";
import type { CurrentMembership } from "@/lib/auth/membership";

const navItems: {
  label: string;
  icon: string;
  href: string;
  view: DashboardView;
  roles: AccessRole[];
}[] = [
  {
    label: "Overview",
    icon: "OV",
    href: "/overview",
    view: "overview",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Organizations",
    icon: "OR",
    href: "/organizations",
    view: "organizations",
    roles: ["ADMIN"],
  },
  {
    label: "Schedule",
    icon: "SC",
    href: "/schedule",
    view: "schedule",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Requests",
    icon: "RQ",
    href: "/requests",
    view: "requests",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Team",
    icon: "TM",
    href: "/team",
    view: "team",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Reports",
    icon: "RP",
    href: "/reports",
    view: "reports",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "Settings",
    icon: "ST",
    href: "/settings",
    view: "settings",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
];

export function AppShell({
  active,
  children,
  currentMembership,
  orgCount,
  pendingCount,
  primaryOrg,
  title,
}: {
  active: DashboardView;
  children: React.ReactNode;
  currentMembership: CurrentMembership;
  orgCount: number;
  pendingCount: number;
  primaryOrg: Organization | undefined;
  title: string;
}) {
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(currentMembership.accessRole),
  );

  async function signOut() {
    "use server";

    const cookieStore = await cookies();

    cookieStore.set("shiftii_access_token", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    cookieStore.set("shiftii_refresh_token", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    redirect("/");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          shiftii
        </div>
        <nav className="primary-nav">
          <p>Live data</p>
          {visibleNavItems.map((item) => (
            <Link className={active === item.view ? "active" : ""} href={item.href} key={item.href}>
              <span>{item.icon}</span>
              {item.label}
              {item.view === "requests" && pendingCount > 0 && <b>{pendingCount}</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="org">
            <span>{initials(primaryOrg?.name ?? "S")}</span>
            <div>
              <strong>{primaryOrg?.name ?? "Supabase"}</strong>
              <small>{primaryOrg ? locationLabel(primaryOrg) : "No organization rows"}</small>
            </div>
            <span>v</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <small>Connected to Supabase</small>
            <h1>{title}<em>.</em></h1>
          </div>
          <div className="top-actions">
            <span className="pill success">Database live</span>
            <span className="pill">{roleLabel(currentMembership.accessRole)}</span>
            <span className="pill">{orgCount} orgs</span>
            <form action={signOut}>
              <button className="secondary compact-action" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        <div className="content">{children}</div>
      </section>
    </main>
  );
}
