import { InviteStaffForm } from "@/app/components/InviteStaffForm";
import { supabaseFetch } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Organization = {
  id: number;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  estimated_staff_count: number | null;
};

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  organization_id: number | null;
  joined_at: string | null;
};

type Roster = {
  id: number;
  month: string;
  organization_id: number;
};

type Shift = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  assigned_user_id: number | null;
  roster_id: number;
  note: string | null;
};

type Invitation = {
  id: number;
  email: string;
  role: string;
  accepted: boolean;
  created_at: string;
  organization_id: number;
};

type SwapRequest = {
  id: number;
  status: string;
  created_at: string;
  organization_id: number;
};

type DashboardData = {
  organizations: Organization[];
  users: User[];
  rosters: Roster[];
  shifts: Shift[];
  invitations: Invitation[];
  swapRequests: SwapRequest[];
};

const tones = ["mint", "blue", "violet", "orange", "pink"];

async function loadDashboardData(): Promise<DashboardData> {
  const [organizations, users, rosters, shifts, invitations, swapRequests] =
    await Promise.all([
      supabaseFetch<Organization[]>(
        "users_organization?select=id,name,code,city,country,timezone,is_active,estimated_staff_count&order=id.asc",
      ),
      supabaseFetch<User[]>(
        "users_user?select=id,email,first_name,last_name,role,is_active,organization_id,joined_at&order=id.asc",
      ),
      supabaseFetch<Roster[]>(
        "roster_roster?select=id,month,organization_id&order=month.desc",
      ),
      supabaseFetch<Shift[]>(
        "roster_shift?select=id,date,start_time,end_time,assigned_user_id,roster_id,note&order=date.asc,start_time.asc",
      ),
      supabaseFetch<Invitation[]>(
        "users_invitation?select=id,email,role,accepted,created_at,organization_id&order=created_at.desc",
      ),
      supabaseFetch<SwapRequest[]>(
        "swaps_swaprequest?select=id,status,created_at,organization_id&order=created_at.desc",
      ),
    ]);

  return { organizations, users, rosters, shifts, invitations, swapRequests };
}

export default async function Home() {
  let data: DashboardData;
  let error: string | null = null;

  try {
    data = await loadDashboardData();
  } catch (loadError) {
    error = loadError instanceof Error ? loadError.message : "Unable to load Supabase data";
    data = {
      organizations: [],
      users: [],
      rosters: [],
      shifts: [],
      invitations: [],
      swapRequests: [],
    };
  }

  const organizationsById = new Map(data.organizations.map((org) => [org.id, org]));
  const rostersById = new Map(data.rosters.map((roster) => [roster.id, roster]));
  const usersById = new Map(data.users.map((user) => [user.id, user]));
  const activeUsers = data.users.filter((user) => user.is_active);
  const openShifts = data.shifts.filter((shift) => shift.assigned_user_id === null);
  const pendingInvitations = data.invitations.filter((invite) => !invite.accepted);
  const pendingSwaps = data.swapRequests.filter((swap) =>
    swap.status.toLowerCase().includes("pending"),
  );
  const pendingCount = pendingInvitations.length + pendingSwaps.length;
  const scheduledHours = Math.round(
    data.shifts.reduce((total, shift) => total + hoursBetween(shift.start_time, shift.end_time), 0),
  );
  const primaryOrg =
    data.organizations.find((org) => org.code === "UNI-568") ??
    data.organizations.find((org) => org.is_active) ??
    data.organizations[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /></span>
          shiftii
        </div>
        <nav className="primary-nav">
          <p>Live data</p>
          {[
            ["Overview", "◫"],
            ["Organizations", "◎"],
            ["Team", "▦"],
            ["Schedule", "◷"],
            ["Requests", "↗"],
          ].map(([label, icon], index) => (
            <button className={index === 0 ? "active" : ""} key={label} type="button">
              <span>{icon}</span>
              {label}
              {label === "Requests" && pendingCount > 0 && <b>{pendingCount}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="org">
            <span>{initials(primaryOrg?.name ?? "S")}</span>
            <div>
              <strong>{primaryOrg?.name ?? "Supabase"}</strong>
              <small>{primaryOrg ? locationLabel(primaryOrg) : "No organization rows"}</small>
            </div>
            <span>⌄</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <small>Connected to Supabase</small>
            <h1>Live workforce data<em>.</em></h1>
          </div>
          <div className="top-actions">
            <span className="pill success">Database live</span>
            <span className="pill">{data.organizations.length} orgs</span>
          </div>
        </header>

        <div className="content">
          {error ? (
            <article className="panel full">
              <div className="empty large">
                <span>!</span>
                <strong>Supabase data could not load</strong>
                <p>{error}</p>
              </div>
            </article>
          ) : (
            <>
              <section className="metrics">
                <Metric dark icon="◎" label="Organizations" value={data.organizations.length} detail={`${activeUsers.length} active users`} />
                <Metric icon="▦" label="Shifts" value={data.shifts.length} detail={`${openShifts.length} open shifts`} kind="warning" />
                <Metric icon="◷" label="Scheduled hours" value={`${scheduledHours}h`} detail={`${data.rosters.length} rosters saved`} kind="success" />
                <Metric icon="↗" label="Pending items" value={pendingCount} detail={`${pendingInvitations.length} invites, ${pendingSwaps.length} swaps`} />
              </section>

              <section className="overview-grid">
                <article className="panel schedule-card">
                  <PanelHead kicker="Roster" title="Real shifts from Supabase" />
                  <div className="request-list">
                    {data.shifts.slice(0, 8).map((shift) => {
                      const user = shift.assigned_user_id ? usersById.get(shift.assigned_user_id) : null;
                      const roster = rostersById.get(shift.roster_id);
                      const org = roster ? organizationsById.get(roster.organization_id) : null;

                      return (
                        <div className="request-row" key={shift.id}>
                          <Avatar index={shift.id} name={user ? userName(user) : "Open shift"} />
                          <div>
                            <strong>{user ? userName(user) : "Open shift"}</strong>
                            <span>{formatDate(shift.date)} · {formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                          </div>
                          <Pill kind={user ? "success" : "warning"}>{user ? user.role : "Unassigned"}</Pill>
                          <span className="pill">{org?.name ?? "No org"}</span>
                        </div>
                      );
                    })}
                    {!data.shifts.length && <Empty title="No shifts yet" detail="No roster_shift rows were found." />}
                  </div>
                </article>

                <div className="right-stack">
                  <article className="panel open-card">
                    <PanelHead kicker="Primary organization" title={primaryOrg?.name ?? "No organization"} />
                    <div className="open-shift">
                      <div className="date">
                        <strong>{primaryOrg?.estimated_staff_count ?? activeUsers.length}</strong>
                        <span>STAFF</span>
                      </div>
                      <div>
                        <strong>{primaryOrg?.code ?? "No code"}</strong>
                        <p>{primaryOrg ? locationLabel(primaryOrg) : "No location saved"}</p>
                        <small>{primaryOrg?.timezone ?? "No timezone saved"}</small>
                      </div>
                      <Pill kind={primaryOrg?.is_active ? "success" : "warning"}>{primaryOrg?.is_active ? "Active" : "Inactive"}</Pill>
                    </div>
                  </article>

                  <article className="panel quick">
                    <PanelHead kicker="Snapshot" title="Current database totals" />
                    <div className="quick-grid">
                      <DataTile icon="◎" tone="green" title={data.organizations.length} sub="Organizations" />
                      <DataTile icon="▦" tone="blue" title={activeUsers.length} sub="Active users" />
                      <DataTile icon="!" tone="amber" title={openShifts.length} sub="Open shifts" />
                      <DataTile icon="↗" tone="purple" title={pendingInvitations.length} sub="Pending invites" />
                    </div>
                  </article>
                </div>
              </section>

              <article className="panel full">
                <PanelHead kicker="Team" title="Users from Supabase" />
                <div className="team-table">
                  <div className="team-head">
                    <span>Employee</span><span>Role</span><span>Organization</span><span>Status</span><span>Joined</span>
                  </div>
                  {data.users.map((user, index) => {
                    const org = user.organization_id ? organizationsById.get(user.organization_id) : null;
                    return (
                      <div className="team-row" key={user.id}>
                        <div>
                          <Avatar index={index} name={userName(user)} />
                          <span><strong>{userName(user)}</strong><small>{user.email}</small></span>
                        </div>
                        <span>{user.role}</span>
                        <span><strong>{org?.name ?? "No organization"}</strong><small>{org?.code ?? "No code"}</small></span>
                        <span><Pill kind={user.is_active ? "success" : "warning"}>{user.is_active ? "Active" : "Inactive"}</Pill></span>
                        <span className="pill">{user.joined_at ? formatDate(user.joined_at) : "No date"}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <section className="request-grid">
                <SummaryList
                  items={data.organizations.slice(0, 6).map((org) => ({
                    id: org.id,
                    title: org.name,
                    detail: locationLabel(org),
                    badge: org.code,
                    status: org.is_active ? "success" : "warning",
                  }))}
                  kicker="Organizations"
                  title="Registered workplaces"
                />
                <SummaryList
                  empty="No invitation rows were found."
                  items={data.invitations.slice(0, 6).map((invite) => ({
                    id: invite.id,
                    title: invite.email,
                    detail: `${formatDate(invite.created_at)} · ${organizationsById.get(invite.organization_id)?.name ?? "No organization"}`,
                    badge: invite.accepted ? "Accepted" : "Pending",
                    status: invite.accepted ? "success" : "warning",
                  }))}
                  kicker="Invitations"
                  title="Invite status"
                >
                  <InviteStaffForm />
                </SummaryList>
                <SummaryList
                  empty="No swap request rows were found."
                  items={data.swapRequests.slice(0, 6).map((swap) => ({
                    id: swap.id,
                    title: `Swap request #${swap.id}`,
                    detail: `${formatDate(swap.created_at)} · ${organizationsById.get(swap.organization_id)?.name ?? "No organization"}`,
                    badge: swap.status,
                    status: swap.status.toLowerCase().includes("approved") ? "success" : "warning",
                  }))}
                  kicker="Swaps"
                  title="Swap requests"
                />
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ dark = false, icon, label, value, detail, kind = "neutral" }: { dark?: boolean; icon: string; label: string; value: string | number; detail: string; kind?: string }) {
  return <article className={`metric ${dark ? "dark" : ""}`}><div><span className="metric-icon">{icon}</span><Pill kind={dark ? "dark-pill" : kind}>Live</Pill></div><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></article>;
}

function PanelHead({ kicker, title }: { kicker: string; title: string }) {
  return <div className="panel-head"><div><span>{kicker}</span><h2>{title}</h2></div></div>;
}

function DataTile({ icon, tone, title, sub }: { icon: string; tone: string; title: string | number; sub: string }) {
  return <button type="button"><i className={tone}>{icon}</i><strong>{title}</strong><small>{sub}</small></button>;
}

function SummaryList({
  children,
  empty = "No rows were found.",
  items,
  kicker,
  title,
}: {
  children?: React.ReactNode;
  empty?: string;
  items: { id: number; title: string; detail: string; badge: string; status: string }[];
  kicker: string;
  title: string;
}) {
  return <article><PanelHead kicker={kicker} title={title} />{children}<div className="request-list">{items.map((item, index) => <div className="request-row" key={item.id}><Avatar index={index} name={item.title} /><div><strong>{item.title}</strong><span>{item.detail}</span></div><Pill kind={item.status}>{item.badge}</Pill></div>)}{!items.length && <Empty title="Nothing here" detail={empty} />}</div></article>;
}

function Avatar({ name, index }: { name: string; index: number }) {
  return <span className={`avatar ${tones[index % tones.length]}`}>{initials(name)}</span>;
}

function Pill({ children, kind = "neutral" }: { children: React.ReactNode; kind?: string }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="empty"><span>✓</span><strong>{title}</strong><p>{detail}</p></div>;
}

function userName(user: User) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

function locationLabel(org: Organization) {
  return [org.city, org.country].filter(Boolean).join(", ") || "No location saved";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

function hoursBetween(start: string, end: string) {
  const startMinutes = toMinutes(start);
  let endMinutes = toMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}
