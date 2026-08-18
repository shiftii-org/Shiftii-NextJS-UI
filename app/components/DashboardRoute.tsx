import { InviteStaffForm } from "@/app/components/InviteStaffForm";
import { AppShell } from "@/app/components/AppShell";
import type {
  DashboardData,
  DashboardView,
  EntityId,
  Organization,
  User,
} from "@/lib/dashboard-data";
import { requireCurrentMembership, type CurrentMembership } from "@/lib/auth/membership";
import {
  formatDate,
  formatTime,
  hoursBetween,
  initials,
  loadDashboardData,
  locationLabel,
  primaryOrganization,
  userName,
} from "@/lib/dashboard-data";

const tones = ["mint", "blue", "violet", "orange", "pink"];

const titles: Record<DashboardView, string> = {
  overview: "Live workforce data",
  organizations: "Organizations",
  schedule: "Schedule",
  requests: "Requests",
  team: "Team",
  reports: "Reports",
  settings: "Settings",
};

export async function DashboardRoute({ view }: { view: DashboardView }) {
  const currentMembership = await requireCurrentMembership(`/${view}`);
  let data: DashboardData;
  let error: string | null = null;

  try {
    data = scopeDashboardData(await loadDashboardData(), currentMembership);
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

  const pendingInvitations = data.invitations.filter((invite) => !invite.accepted);
  const pendingSwaps = data.swapRequests.filter((swap) =>
    swap.status.toLowerCase().includes("pending"),
  );

  return (
    <AppShell
      active={view}
      currentMembership={currentMembership}
      orgCount={data.organizations.length}
      pendingCount={pendingInvitations.length + pendingSwaps.length}
      primaryOrg={primaryOrganization(data.organizations)}
      title={titles[view]}
    >
      {error ? <LoadError message={error} /> : <DashboardContent data={data} view={view} />}
    </AppShell>
  );
}

function scopeDashboardData(data: DashboardData, membership: CurrentMembership): DashboardData {
  if (membership.accessRole === "ADMIN" || membership.organizationId === null) {
    return data;
  }

  const organizationId = membership.organizationId;
  const rosters = data.rosters.filter((roster) => roster.organization_id === organizationId);
  const rosterIds = new Set(rosters.map((roster) => roster.id));

  return {
    organizations: data.organizations.filter((org) => org.id === organizationId),
    users: data.users.filter((user) => user.organization_id === organizationId),
    rosters,
    shifts: data.shifts.filter((shift) => rosterIds.has(shift.roster_id)),
    invitations: data.invitations.filter((invite) => invite.organization_id === organizationId),
    swapRequests: data.swapRequests.filter((swap) => swap.organization_id === organizationId),
  };
}

function DashboardContent({ data, view }: { data: DashboardData; view: DashboardView }) {
  const organizationsById = new Map(data.organizations.map((org) => [org.id, org]));
  const rostersById = new Map(data.rosters.map((roster) => [roster.id, roster]));
  const usersById = new Map(data.users.map((user) => [user.id, user]));
  const activeUsers = data.users.filter((user) => user.is_active);
  const openShifts = data.shifts.filter((shift) => shift.assigned_user_id === null);
  const pendingInvitations = data.invitations.filter((invite) => !invite.accepted);
  const pendingSwaps = data.swapRequests.filter((swap) =>
    swap.status.toLowerCase().includes("pending"),
  );
  const scheduledHours = Math.round(
    data.shifts.reduce((total, shift) => total + hoursBetween(shift.start_time, shift.end_time), 0),
  );
  const primaryOrg = primaryOrganization(data.organizations);

  if (view === "organizations") {
    return (
      <section className="request-grid">
        <SummaryList
          items={data.organizations.map((org) => ({
            id: org.id,
            title: org.name,
            detail: locationLabel(org),
            badge: org.code,
            status: org.is_active ? "success" : "warning",
          }))}
          kicker="Organizations"
          title="Registered workplaces"
        />
      </section>
    );
  }

  if (view === "schedule") {
    return (
      <article className="panel full">
        <PanelHead kicker="Schedule" title="Live shifts from Supabase" />
        <div className="request-list">
          {data.shifts.map((shift) => {
            const user = shift.assigned_user_id ? usersById.get(shift.assigned_user_id) : null;
            const roster = rostersById.get(shift.roster_id);
            const org = roster ? organizationsById.get(roster.organization_id) : null;

            return (
              <div className="request-row" key={shift.id}>
                <Avatar index={shift.id} name={user ? userName(user) : "Open shift"} />
                <div>
                  <strong>{user ? userName(user) : "Open shift"}</strong>
                  <span>
                    {formatDate(shift.date)} / {formatTime(shift.start_time)} -{" "}
                    {formatTime(shift.end_time)}
                  </span>
                </div>
                <Pill kind={user ? "success" : "warning"}>{user ? user.role : "Unassigned"}</Pill>
                <span className="pill">{org?.name ?? "No org"}</span>
              </div>
            );
          })}
          {!data.shifts.length && <Empty title="No shifts yet" detail="No roster_shift rows were found." />}
        </div>
      </article>
    );
  }

  if (view === "requests") {
    return (
      <section className="request-grid">
        <SummaryList
          empty="No invitation rows were found."
          items={data.invitations.map((invite) => ({
            id: invite.id,
            title: invite.email,
            detail: `${formatDate(invite.created_at)} / ${
              organizationsById.get(invite.organization_id)?.name ?? "No organization"
            }`,
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
          items={data.swapRequests.map((swap) => ({
            id: swap.id,
            title: `Swap request #${swap.id}`,
            detail: `${formatDate(swap.created_at)} / ${
              organizationsById.get(swap.organization_id)?.name ?? "No organization"
            }`,
            badge: swap.status,
            status: swap.status.toLowerCase().includes("approved") ? "success" : "warning",
          }))}
          kicker="Swaps"
          title="Swap requests"
        />
      </section>
    );
  }

  if (view === "team") {
    return <TeamPanel organizationsById={organizationsById} users={data.users} />;
  }

  if (view === "reports") {
    return (
      <section className="metrics">
        <Metric dark icon="HR" label="Scheduled hours" value={`${scheduledHours}h`} detail="All loaded roster shifts" />
        <Metric icon="SH" label="Filled shifts" value={data.shifts.length - openShifts.length} detail={`${openShifts.length} open shifts`} kind="success" />
        <Metric icon="OR" label="Organizations" value={data.organizations.length} detail={`${activeUsers.length} active users`} />
        <Metric icon="RQ" label="Pending requests" value={pendingInvitations.length + pendingSwaps.length} detail="Invites and swaps" kind="warning" />
      </section>
    );
  }

  if (view === "settings") {
    return (
      <article className="panel settings-panel">
        <PanelHead kicker="Organization" title={primaryOrg?.name ?? "No organization selected"} />
        <div className="logo-setting">
          <span>{initials(primaryOrg?.name ?? "S")}</span>
          <div>
            <strong>{primaryOrg?.code ?? "No code"}</strong>
            <p>{primaryOrg ? locationLabel(primaryOrg) : "No location saved"}</p>
            <p>{primaryOrg?.timezone ?? "No timezone saved"}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <section className="metrics">
        <Metric dark icon="OR" label="Organizations" value={data.organizations.length} detail={`${activeUsers.length} active users`} />
        <Metric icon="SH" label="Shifts" value={data.shifts.length} detail={`${openShifts.length} open shifts`} kind="warning" />
        <Metric icon="HR" label="Scheduled hours" value={`${scheduledHours}h`} detail={`${data.rosters.length} rosters saved`} kind="success" />
        <Metric icon="RQ" label="Pending items" value={pendingInvitations.length + pendingSwaps.length} detail={`${pendingInvitations.length} invites, ${pendingSwaps.length} swaps`} />
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
                    <span>
                      {formatDate(shift.date)} / {formatTime(shift.start_time)} -{" "}
                      {formatTime(shift.end_time)}
                    </span>
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
              <Pill kind={primaryOrg?.is_active ? "success" : "warning"}>
                {primaryOrg?.is_active ? "Active" : "Inactive"}
              </Pill>
            </div>
          </article>

          <article className="panel quick">
            <PanelHead kicker="Snapshot" title="Current database totals" />
            <div className="quick-grid">
              <DataTile icon="OR" tone="green" title={data.organizations.length} sub="Organizations" />
              <DataTile icon="TM" tone="blue" title={activeUsers.length} sub="Active users" />
              <DataTile icon="!" tone="amber" title={openShifts.length} sub="Open shifts" />
              <DataTile icon="IN" tone="purple" title={pendingInvitations.length} sub="Pending invites" />
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function TeamPanel({
  organizationsById,
  users,
}: {
  organizationsById: Map<EntityId, Organization>;
  users: User[];
}) {
  return (
    <article className="panel full">
      <PanelHead kicker="Team" title="Users from Supabase" />
      <div className="team-table">
        <div className="team-head">
          <span>Employee</span><span>Role</span><span>Organization</span><span>Status</span><span>Joined</span>
        </div>
        {users.map((user, index) => {
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
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <article className="panel full">
      <div className="empty large">
        <span>!</span>
        <strong>Supabase data could not load</strong>
        <p>{message}</p>
      </div>
    </article>
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
  items: { id: EntityId; title: string; detail: string; badge: string; status: string }[];
  kicker: string;
  title: string;
}) {
  return <article><PanelHead kicker={kicker} title={title} />{children}<div className="request-list">{items.map((item, index) => <div className="request-row" key={item.id}><Avatar index={index} name={item.title} /><div><strong>{item.title}</strong><span>{item.detail}</span></div><Pill kind={item.status}>{item.badge}</Pill></div>)}{!items.length && <Empty title="Nothing here" detail={empty} />}</div></article>;
}

function Avatar({ name, index }: { name: string; index: EntityId }) {
  return <span className={`avatar ${tones[toneIndex(index)]}`}>{initials(name)}</span>;
}

function Pill({ children, kind = "neutral" }: { children: React.ReactNode; kind?: string }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="empty"><span>OK</span><strong>{title}</strong><p>{detail}</p></div>;
}

function toneIndex(value: EntityId) {
  if (typeof value === "number") return Math.abs(value) % tones.length;

  let total = 0;
  for (const char of value) total += char.charCodeAt(0);
  return total % tones.length;
}
