import Link from "next/link";
import type { DashboardView, Organization } from "@/lib/dashboard-data";
import { initials, locationLabel } from "@/lib/dashboard-data";

const navItems: { label: string; icon: string; href: string; view: DashboardView }[] = [
  { label: "Overview", icon: "OV", href: "/overview", view: "overview" },
  { label: "Organizations", icon: "OR", href: "/organizations", view: "organizations" },
  { label: "Schedule", icon: "SC", href: "/schedule", view: "schedule" },
  { label: "Requests", icon: "RQ", href: "/requests", view: "requests" },
  { label: "Team", icon: "TM", href: "/team", view: "team" },
  { label: "Reports", icon: "RP", href: "/reports", view: "reports" },
  { label: "Settings", icon: "ST", href: "/settings", view: "settings" },
];

export function AppShell({
  active,
  children,
  orgCount,
  pendingCount,
  primaryOrg,
  title,
}: {
  active: DashboardView;
  children: React.ReactNode;
  orgCount: number;
  pendingCount: number;
  primaryOrg: Organization | undefined;
  title: string;
}) {
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
          {navItems.map((item) => (
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
            <span className="pill">{orgCount} orgs</span>
          </div>
        </header>

        <div className="content">{children}</div>
      </section>
    </main>
  );
}
