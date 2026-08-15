"use client";

import { useState } from "react";

type View = "Overview" | "Schedule" | "Requests" | "Team" | "Reports" | "Settings";
const nav: { label: View; icon: string }[] = [
  { label: "Overview", icon: "◫" }, { label: "Schedule", icon: "▦" },
  { label: "Requests", icon: "↗" }, { label: "Team", icon: "◎" },
  { label: "Reports", icon: "⌁" }, { label: "Settings", icon: "⚙" },
];
const people = [
  { name: "Amara Okafor", short: "Amara", initials: "AO", role: "Support Worker", tone: "mint" },
  { name: "Daniel Kim", short: "Daniel", initials: "DK", role: "Team Lead", tone: "blue" },
  { name: "Maya Chen", short: "Maya", initials: "MC", role: "Support Worker", tone: "violet" },
  { name: "Noah Brown", short: "Noah", initials: "NB", role: "Care Coordinator", tone: "orange" },
];
const requestSeed = [
  { id: 1, person: 0, type: "Time off", detail: "Aug 24 – 26 · Personal", risk: "1 shift affected" },
  { id: 2, person: 2, type: "Shift swap", detail: "Aug 19 · Evening shift", risk: "No conflicts" },
  { id: 3, person: 3, type: "Open shift", detail: "Aug 21 · 08:00 – 16:00", risk: "Eligible" },
];

function Avatar({ person, small = false }: { person: typeof people[number]; small?: boolean }) {
  return <span className={`avatar ${person.tone} ${small ? "small" : ""}`}>{person.initials}</span>;
}
function Pill({ children, kind = "neutral" }: { children: React.ReactNode; kind?: string }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [modal, setModal] = useState<"shift" | "invite" | null>(null);
  const [resolved, setResolved] = useState<number[]>([]);
  const pending = requestSeed.filter(r => !resolved.includes(r.id));
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><i/><i/><i/></span>shiftii</div>
      <nav className="primary-nav"><p>Workspace</p>{nav.map(item => <button key={item.label} className={view === item.label ? "active" : ""} onClick={() => setView(item.label)}><span>{item.icon}</span>{item.label}{item.label === "Requests" && pending.length > 0 && <b>{pending.length}</b>}</button>)}</nav>
      <div className="sidebar-foot"><div className="org"><span>N</span><div><strong>Northstar Care</strong><small>Winnipeg, MB</small></div>⌄</div><div className="user"><Avatar person={{...people[0], initials:"TO", name:"Toyyib Oriloye"}} small/><div><strong>Toyyib Oriloye</strong><small>Administrator</small></div>•••</div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><small>Northstar Care · Winnipeg</small><h1>{view === "Overview" ? "Good morning, Toyyib" : view}<em>.</em></h1></div><div className="top-actions"><button className="icon">⌕</button><button className="icon notify">♢<i/></button><button className="primary" onClick={() => setModal("shift")}>＋ <span>Add shift</span></button></div></header>
      <div className="content">
        {view === "Overview" && <Overview pending={pending} resolved={resolved} setResolved={setResolved} setView={setView} setModal={setModal}/>} 
        {view === "Schedule" && <Schedule setModal={setModal}/>} 
        {view === "Requests" && <Requests pending={pending} resolved={resolved} setResolved={setResolved}/>} 
        {view === "Team" && <Team setModal={setModal}/>} 
        {view === "Reports" && <Reports/>} 
        {view === "Settings" && <Settings/>}
      </div>
    </section>
    <nav className="mobile-nav">{nav.slice(0,5).map(item => <button key={item.label} className={view === item.label ? "active" : ""} onClick={() => setView(item.label)}><span>{item.icon}</span>{item.label}</button>)}</nav>
    {modal && <Modal type={modal} close={() => setModal(null)}/>} 
  </main>;
}

function Overview({ pending, resolved, setResolved, setView, setModal }: { pending: typeof requestSeed; resolved:number[]; setResolved:(x:number[])=>void; setView:(v:View)=>void; setModal:(v:"shift"|"invite")=>void }) {
  return <>
    <section className="metrics">
      <article className="metric dark"><div><span className="metric-icon">↗</span><Pill kind="dark-pill">Today</Pill></div><strong>18</strong><h3>People scheduled</h3><p><i className="live"/> 3 locations covered</p></article>
      <article className="metric"><div><span className="metric-icon green">◷</span><Pill kind="success">↗ 8%</Pill></div><strong>142<small>h</small></strong><h3>Scheduled this week</h3><p>Across 24 published shifts</p></article>
      <article className="metric"><div><span className="metric-icon amber">!</span><Pill kind="warning">Needs attention</Pill></div><strong>3</strong><h3>Open shifts</h3><p>Next open shift in 2 days</p></article>
      <article className="metric"><div><span className="metric-icon purple">✓</span><Pill>this week</Pill></div><strong>{pending.length}</strong><h3>Pending requests</h3><p>{resolved.length ? `${resolved.length} handled today` : "2 require schedule review"}</p></article>
    </section>
    <section className="overview-grid">
      <article className="panel schedule-card"><PanelHead kicker="Live coverage" title="This week’s schedule" action="Open schedule" onClick={() => setView("Schedule")}/><MiniSchedule/><div className="schedule-foot"><div className="facepile">{people.map(p => <Avatar key={p.name} person={p} small/>)}<span>+14</span></div><p><strong>18 people</strong> scheduled · 96% coverage</p><i><b/></i></div></article>
      <div className="right-stack">
        <article className="panel quick"><PanelHead kicker="Shortcuts" title="Quick actions"/><div className="quick-grid"><Quick icon="＋" tone="green" title="Add shift" sub="Build the roster" onClick={()=>setModal("shift")}/><Quick icon="◎" tone="blue" title="Invite staff" sub="Grow your team" onClick={()=>setModal("invite")}/><Quick icon="↗" tone="amber" title="Review requests" sub={`${pending.length} waiting`} onClick={()=>setView("Requests")}/><Quick icon="⌁" tone="purple" title="View reports" sub="Hours & coverage" onClick={()=>setView("Reports")}/></div></article>
        <article className="panel open-card"><PanelHead kicker="Coverage alert" title="Next open shift"/><div className="open-shift"><div className="date"><strong>21</strong><span>AUG</span></div><div><strong>Support Worker</strong><p>Thu · 07:00 – 15:00</p><small>River Heights · 3 eligible</small></div><Pill kind="warning">Open</Pill></div><button className="secondary" onClick={()=>setView("Schedule")}>Find coverage →</button></article>
      </div>
    </section>
    <article className="panel requests-card"><PanelHead kicker="Approvals" title="Requests needing you" action="View all" onClick={()=>setView("Requests")}/><div className="request-list">{pending.length ? pending.map(r => { const p=people[r.person]; return <div className="request-row" key={r.id}><Avatar person={p}/><div><strong>{p.name}</strong><span>{r.type} · {r.detail}</span></div><Pill kind={r.risk === "1 shift affected" ? "warning" : "success"}>{r.risk}</Pill><aside><button onClick={()=>setResolved([...resolved,r.id])}>Decline</button><button onClick={()=>setResolved([...resolved,r.id])}>Approve</button></aside></div>}) : <Empty/>}</div></article>
  </>;
}

function PanelHead({ kicker,title,action,onClick }: { kicker:string; title:string; action?:string; onClick?:()=>void }) { return <div className="panel-head"><div><span>{kicker}</span><h2>{title}</h2></div>{action && <button onClick={onClick}>{action} →</button>}</div>; }
function Quick({icon,tone,title,sub,onClick}:{icon:string;tone:string;title:string;sub:string;onClick:()=>void}) { return <button onClick={onClick}><i className={tone}>{icon}</i><strong>{title}</strong><small>{sub}</small></button>; }

function MiniSchedule() {
  const shifts = [[0,0],[0,1],[1,0],[1,3],[2,1],[2,2],[3,3],[4,0],[4,1]];
  return <div className="mini-schedule"><div className="times"><span>7 AM</span><span>11 AM</span><span>3 PM</span><span>7 PM</span></div>{["Mon 17","Tue 18","Wed 19","Thu 20","Fri 21"].map((d,day)=><div className={`day ${day===0?"today":""}`} key={d}><strong>{d.split(" ")[0]}<b>{d.split(" ")[1]}</b></strong><i className="dash"/>{shifts.filter(x=>x[0]===day).map((x,index)=>{const p=people[x[1]];return <div key={p.name} className={`shift ${p.tone} p${index}`}><Avatar person={p} small/><span><b>{p.short}</b><small>{index?"15:00 – 23:00":"07:00 – 15:00"}</small></span></div>})}</div>)}</div>;
}

function Schedule({setModal}:{setModal:(v:"shift")=>void}) {
  const [published,setPublished]=useState(false); const [range,setRange]=useState("Week");
  return <section className="schedule-view"><div className="toolbar"><div className="segmented">{["Day","Week","Month"].map(x=><button className={range===x?"active":""} onClick={()=>setRange(x)} key={x}>{x}</button>)}</div><div className="date-nav"><button>‹</button><strong>Aug 17 – 23, 2026</strong><button>›</button></div><div><Pill kind={published?"success":"neutral"}>{published?"Published":"Draft roster"}</Pill><button className="primary" onClick={()=>setPublished(!published)}>{published?"Return to draft":"Publish roster"}</button></div></div><div className="summary"><span><i className="green-dot"/>31 shifts</span><span>242 scheduled hours</span><span><i className="amber-dot"/>3 open</span><span><i className="red-dot"/>2 conflicts</span></div><div className="roster"><div className="roster-head"><div>Team member</div>{["MON 17","TUE 18","WED 19","THU 20","FRI 21","SAT 22","SUN 23"].map((x,i)=><div className={i===0?"current":""} key={x}>{x.split(" ")[0]}<strong>{x.split(" ")[1]}</strong></div>)}</div>{people.map((p,row)=><div className="roster-row" key={p.name}><div className="employee"><Avatar person={p}/><span><strong>{p.name}</strong><small>{p.role}</small></span></div>{Array.from({length:7}).map((_,col)=><div className="cell" key={col}>{(row+col)%3!==1?<button className={`roster-shift ${p.tone}`} onClick={()=>setModal("shift")}><strong>{row%2?"09:00 – 17:00":"07:00 – 15:00"}</strong><small>{p.role}</small>{row===2&&col===3&&<i>!</i>}</button>:<button className="add" onClick={()=>setModal("shift")}>＋</button>}</div>)}</div>)}<div className="roster-row open-row"><div className="employee"><span className="open-avatar">＋</span><span><strong>Open shifts</strong><small>Unassigned coverage</small></span></div>{Array.from({length:7}).map((_,col)=><div className="cell" key={col}>{[1,4,6].includes(col)&&<button className="roster-shift open" onClick={()=>setModal("shift")}><strong>15:00 – 23:00</strong><small>Support Worker</small></button>}</div>)}</div></div></section>;
}

function Requests({pending,resolved,setResolved}:{pending:typeof requestSeed;resolved:number[];setResolved:(x:number[])=>void}) {
  return <section className="panel full"><div className="tabs"><button className="active">Needs review <b>{pending.length}</b></button><button>Approved</button><button>Declined</button><button className="filter">Filter ⌄</button></div><div className="request-grid">{pending.map(r=>{const p=people[r.person];return <article key={r.id}><div className="request-main"><Avatar person={p}/><div><Pill>{r.type}</Pill><h3>{p.name}</h3><p>{r.detail}</p></div></div><div className="impact"><span>Schedule impact</span><strong>{r.risk}</strong><p>{r.risk==="1 shift affected"?"A published morning shift needs coverage.":"Availability and position checks passed."}</p></div><div className="request-actions"><button onClick={()=>setResolved([...resolved,r.id])}>Decline</button><button onClick={()=>setResolved([...resolved,r.id])}>Approve request</button></div></article>})}{!pending.length&&<Empty large/>}</div></section>;
}

function Team({setModal}:{setModal:(v:"invite")=>void}) {
  const extra={name:"Priya Singh",short:"Priya",initials:"PS",role:"Support Worker",tone:"pink"};
  return <section className="panel full"><div className="team-tools"><label>⌕<input placeholder="Search people, positions or locations"/></label><button className="secondary">All locations ⌄</button><button className="primary" onClick={()=>setModal("invite")}>＋ Invite employee</button></div><div className="team-table"><div className="team-head"><span>Employee</span><span>Position</span><span>This week</span><span>Status</span><span/></div>{[...people,extra].map((p,i)=><div className="team-row" key={p.name}><div><Avatar person={p}/><span><strong>{p.name}</strong><small>{p.short.toLowerCase()}@northstar.ca</small></span></div><span>{p.role}</span><span><strong>{[32,40,28,36,24][i]} / {[40,40,32,40,24][i]}h</strong><i><b style={{width:`${[80,100,87,90,100][i]}%`}}/></i></span><span><Pill kind={i===3?"warning":"success"}>{i===3?"On leave":"Active"}</Pill></span><button className="icon">•••</button></div>)}</div></section>;
}

function Reports() { return <section className="reports"><article className="panel chart"><PanelHead kicker="Labour overview" title="Scheduled hours"/><div className="y-axis"><span>300h</span><span>200h</span><span>100h</span><span>0h</span></div><div className="bars">{[52,68,61,79,72,86,82,94].map((v,i)=><div key={i}><i style={{height:`${v}%`}}><b style={{height:`${Math.max(v-24,12)}%`}}/></i><span>W{i+1}</span></div>)}</div><div className="legend"><span><i/>Published</span><span><i/>Open</span></div></article><article className="panel coverage"><PanelHead kicker="Current roster" title="Coverage health"/><div className="donut"><div><strong>96%</strong><span>covered</span></div></div><div className="coverage-stats"><span>Filled shifts<strong>28</strong></span><span>Open shifts<strong>3</strong></span><span>Conflicts<strong>2</strong></span></div></article><article className="panel roles"><PanelHead kicker="Team mix" title="Hours by position"/>{[["Support Worker",118,82],["Team Lead",68,48],["Care Coordinator",56,39]].map(x=><div className="role-bar" key={x[0]}><span>{x[0]}<strong>{x[1]}h</strong></span><i><b style={{width:`${x[2]}%`}}/></i></div>)}</article></section>; }

function Settings() { const [email,setEmail]=useState(true);const [approval,setApproval]=useState(true);return <section className="settings"><aside><button className="active">Organization</button><button>Scheduling rules</button><button>Locations</button><button>Positions</button><button>Notifications</button></aside><article className="panel settings-panel"><div className="settings-head"><div><span>Workspace</span><h2>Organization profile</h2><p>Manage the details your team sees across Shiftii.</p></div><button className="primary">Save changes</button></div><div className="logo-setting"><span>N</span><div><strong>Organization logo</strong><p>PNG, JPG or SVG. Max 2MB.</p><button>Change logo</button></div></div><div className="form-grid"><label>Organization name<input defaultValue="Northstar Care"/></label><label>Contact email<input defaultValue="hello@northstarcare.ca"/></label><label>Timezone<select defaultValue="America/Winnipeg"><option>America/Winnipeg</option></select></label><label>Week starts on<select><option>Monday</option><option>Sunday</option></select></label></div><div className="workflow"><h3>Workflow preferences</h3><Toggle label="Email notifications" detail="Send roster and request updates by email." value={email} set={setEmail}/><Toggle label="Manager approval for claims" detail="Open shift claims require a manager decision." value={approval} set={setApproval}/></div></article></section>; }
function Toggle({label,detail,value,set}:{label:string;detail:string;value:boolean;set:(x:boolean)=>void}) { return <button className="toggle" onClick={()=>set(!value)}><span><strong>{label}</strong><small>{detail}</small></span><i className={value?"on":""}><b/></i></button>; }

function Empty({large=false}:{large?:boolean}) { return <div className={`empty ${large?"large":""}`}><span>✓</span><strong>You’re all caught up</strong><p>No requests need your attention.</p></div>; }
function Modal({type,close}:{type:"shift"|"invite";close:()=>void}) { const [saved,setSaved]=useState(false); return <div className="backdrop" onMouseDown={close}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span>{type==="shift"?"Roster builder":"Team management"}</span><h2>{type==="shift"?"Add a new shift":"Invite an employee"}</h2></div><button className="icon" onClick={close}>×</button></div>{saved?<div className="success-state"><span>✓</span><h3>{type==="shift"?"Shift added":"Invitation ready"}</h3><p>{type==="shift"?"The draft roster has been updated.":"The employee will receive a secure invitation."}</p><button className="primary" onClick={close}>Done</button></div>:<><div className="modal-form">{type==="shift"?<><label>Position<select><option>Support Worker</option><option>Team Lead</option></select></label><label>Employee<select><option>Leave as open shift</option><option>Amara Okafor</option></select></label><label>Date<input type="date" defaultValue="2026-08-21"/></label><div><label>Starts<input type="time" defaultValue="07:00"/></label><label>Ends<input type="time" defaultValue="15:00"/></label></div><label>Location<select><option>River Heights</option><option>Downtown</option></select></label></>:<><label>Work email<input type="email" placeholder="name@company.com"/></label><label>Full name<input placeholder="Employee name"/></label><label>Access role<select><option>Employee</option><option>Manager</option></select></label><label>Position<select><option>Support Worker</option><option>Team Lead</option></select></label></>}</div><div className="modal-actions"><button onClick={close}>Cancel</button><button className="primary" onClick={()=>setSaved(true)}>{type==="shift"?"Add to roster":"Send invitation"}</button></div></>}</section></div>; }
