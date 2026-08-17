import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useMaintenance } from "../context/maintenance";
import {
  MAINTENANCE_FREQUENCIES, MAINTENANCE_RELATIONSHIP_STATUSES,
  assignmentRoleLabel, canManageMaintenance, canSeeMaintenance,
  frequencyLabel, relationshipStatusLabel,
} from "../utils/maintenanceCapabilities";
import {
  dedupeMaintenanceEligibleProjects,
  maintenanceProjectChoiceLabel,
} from "../utils/maintenancePresentation";

const showDate = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
  : "—";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const activeEntryStates = new Set(["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"]);
const reviewStates = new Set(["submitted", "resubmitted"]);

const STATUS_BADGE = {
  active: "bg-[#eef3f0] text-botanique-green",
  paused: "bg-stone-100 text-gray-600",
  ended: "bg-stone-100 text-gray-600",
};
const ENTRY_BADGE = {
  draft: "bg-stone-100 text-gray-600",
  submitted: "bg-sky-50 text-sky-800",
  returned_for_correction: "bg-red-50 text-red-700",
  resubmitted: "bg-sky-50 text-sky-800",
  accepted: "bg-emerald-50 text-emerald-800",
};
const entryLabel = (state) => ({
  draft: "Draft", submitted: "Awaiting review", returned_for_correction: "Correction needed",
  resubmitted: "Awaiting review", accepted: "Accepted",
})[state] || state;

function StatCard({ label, value, hint }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-4">
    <p className="text-[11px] font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-[22px] font-semibold tabular-nums text-botanique-charcoal">{value}</p>
    <p className="mt-1 text-[10.5px] text-gray-500">{hint}</p>
  </div>;
}

function Empty({ children }) {
  return <p className="rounded-lg bg-stone-50 px-3 py-4 text-[12px] text-gray-500">{children}</p>;
}

export default function AdminMaintenance() {
  const { role } = useAdminData();
  const { entries = [], status: dailyStatus } = useDailySiteOperations();
  const { register, visits = [], eligibleProjects, status, error, addRelationship } = useMaintenance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const statusFilter = searchParams.get("status") || "active";
  const nowDate = today();
  const monthPrefix = nowDate.slice(0, 7);

  const maintenanceChoices = useMemo(() => dedupeMaintenanceEligibleProjects(eligibleProjects), [eligibleProjects]);
  const visible = useMemo(
    () => register.filter((relationship) => statusFilter === "all" || relationship.status === statusFilter),
    [register, statusFilter]
  );

  const activityByRelationship = useMemo(() => {
    const result = new Map();
    for (const relationship of register) {
      const activity = entries
        .filter((entry) => entry.projectId === relationship.projectId && entry.workDate >= relationship.startDate && activeEntryStates.has(entry.state))
        .slice()
        .sort((a, b) => b.workDate.localeCompare(a.workDate) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      result.set(relationship.id, activity);
    }
    return result;
  }, [entries, register]);

  const operationalRows = useMemo(() => register.map((relationship) => {
    const activity = activityByRelationship.get(relationship.id) || [];
    const latestActivity = activity[0] || null;
    const scheduled = visits
      .filter((visit) => visit.relationshipId === relationship.id && visit.status === "scheduled")
      .slice()
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const overdueVisits = scheduled.filter((visit) => visit.scheduledDate < nowDate);
    const reasons = [];
    if (relationship.status === "active" && !relationship.assignedTeam.length) reasons.push("No team assigned");
    if (relationship.status === "active" && relationship.frequency !== "as_needed" && !scheduled.length) reasons.push("Next visit not scheduled");
    if (overdueVisits.length) reasons.push(`${overdueVisits.length} overdue ${overdueVisits.length === 1 ? "visit" : "visits"}`);
    if (latestActivity?.state === "returned_for_correction") reasons.push("Site record needs correction");
    if (reviewStates.has(latestActivity?.state)) reasons.push("Site record awaiting review");
    if (latestActivity?.evidenceStatus === "promised") reasons.push("Evidence promised");
    return { relationship, activity, latestActivity, scheduled, reasons };
  }), [activityByRelationship, nowDate, register, visits]);

  const attention = operationalRows.filter((row) => row.relationship.status === "active" && row.reasons.length);
  const in7 = new Date(`${nowDate}T00:00:00`); in7.setDate(in7.getDate() + 7);
  const in7Iso = in7.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const scheduledThisMonth = visits.filter((visit) => visit.status === "scheduled" && visit.scheduledDate.startsWith(monthPrefix)).length;
  const dueWithin7 = visits.filter((visit) => visit.status === "scheduled" && visit.scheduledDate >= nowDate && visit.scheduledDate <= in7Iso).length;
  const completedThisMonth = visits.filter((visit) => visit.status === "completed" && String(visit.completedAt || visit.scheduledDate).slice(0, 7) === monthPrefix).length;

  const upcomingVisits = visits
    .filter((visit) => visit.status === "scheduled" && visit.scheduledDate >= nowDate)
    .slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((visit) => ({ ...visit, relationship: register.find((row) => row.id === visit.relationshipId) }))
    .filter((visit) => visit.relationship)
    .slice(0, 8);

  const teamSummary = useMemo(() => {
    const byPerson = new Map();
    for (const relationship of register.filter((row) => row.status === "active")) {
      for (const member of relationship.assignedTeam || []) {
        const current = byPerson.get(member.person_id) || {
          id: member.person_id, name: member.full_name || "Team member", roles: new Set(), sites: [],
        };
        current.roles.add(member.role);
        current.sites.push({ id: relationship.id, name: relationship.projectName });
        byPerson.set(member.person_id, current);
      }
    }
    return [...byPerson.values()].sort((a, b) => b.sites.length - a.sites.length || a.name.localeCompare(b.name));
  }, [register]);

  const recentNotes = useMemo(() => {
    const notes = [];
    for (const visit of visits) {
      const relationship = register.find((row) => row.id === visit.relationshipId);
      if (!relationship) continue;
      if (visit.status === "completed" && visit.completionNote) notes.push({
        id: `visit-complete-${visit.id}`, date: String(visit.completedAt || visit.scheduledDate).slice(0, 10),
        site: relationship.projectName, note: visit.completionNote, source: "Visit completed", to: `/admin/maintenance/${relationship.id}`,
      });
      if (visit.status === "cancelled" && visit.cancellationReason) notes.push({
        id: `visit-cancel-${visit.id}`, date: visit.scheduledDate, site: relationship.projectName,
        note: visit.cancellationReason, source: "Visit cancelled", to: `/admin/maintenance/${relationship.id}`,
      });
    }
    for (const row of operationalRows) {
      for (const entry of row.activity) {
        if (!entry.notes?.trim()) continue;
        notes.push({
          id: `field-note-${entry.id}`, date: entry.workDate, site: row.relationship.projectName,
          note: entry.notes.trim(), source: "Field note", to: `/admin/daily-site-operations/${entry.id}`,
        });
      }
    }
    return notes.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [operationalRows, register, visits]);

  const recentFieldActivity = operationalRows
    .flatMap((row) => row.activity.map((entry) => ({ entry, relationship: row.relationship })))
    .sort((a, b) => b.entry.workDate.localeCompare(a.entry.workDate))
    .slice(0, 4);

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  async function submit(event) {
    event.preventDefault(); setFormError("");
    if (!form.projectId) return setFormError("Choose a project or site for Maintenance.");
    if (!form.scope.trim()) return setFormError("Describe the maintenance scope.");
    setSaving(true);
    const result = await addRelationship({ ...form, scope: form.scope.trim() });
    setSaving(false);
    if (!result.ok) return setFormError(result.error || "This Maintenance relationship could not be started.");
    setForm({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
    setShowForm(false);
  }

  if (!canSeeMaintenance(role)) return <section><h1 className="text-2xl font-semibold">Maintenance unavailable</h1><p className="mt-2 text-sm text-gray-600">Maintenance is available to the Principal and the Operations Manager.</p></section>;

  return <section className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Maintenance</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">Track scheduled visits, responsibility, completed work and follow-up across every maintained site.</p>
      </div>
      {canManageMaintenance(role) && <button type="button" onClick={() => { setShowForm((open) => !open); setFormError(""); }} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white">{showForm ? "Cancel" : "Start Maintenance"}</button>}
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Scheduled visits" value={scheduledThisMonth} hint="this month" />
      <StatCard label="Next due visits" value={dueWithin7} hint="due within 7 days" />
      <StatCard label="Sites needing follow-up" value={attention.length} hint="operational action needed" />
      <StatCard label="Completed visits" value={completedThisMonth} hint="this month" />
    </div>

    {showForm && canManageMaintenance(role) && <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold">Start a Maintenance relationship</h2>
      <p className="mt-1 text-xs text-gray-500">The linked Project keeps its own lifecycle. Maintenance continues independently.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Project / site<select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required><option value="">Choose project or site</option>{maintenanceChoices.map((project) => <option key={project.id} value={project.id}>{maintenanceProjectChoiceLabel(project)}</option>)}</select></label>
        <label className="text-sm font-medium sm:col-span-2">Maintenance scope<input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} placeholder="Lawn, borders, irrigation checks and general upkeep" className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" maxLength={2000} required /></label>
        <label className="text-sm font-medium">Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required /></label>
        <label className="text-sm font-medium">Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5">{MAINTENANCE_FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}</select></label>
      </div>
      {formError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
      <button disabled={saving} className="mt-4 min-h-11 rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Start Maintenance"}</button>
    </form>}

    {status === "loading" && <p className="text-sm text-gray-600">Loading Maintenance…</p>}
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {dailyStatus === "error" && <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Maintenance is available, but current Daily Site Records could not be read. Visit planning and team responsibility are unaffected.</p>}

    {status !== "loading" && <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px] xl:items-start">
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-4">
            <h2 className="text-lg font-semibold">Upcoming scheduled visits</h2>
            <p className="mt-1 text-sm text-gray-500">The next planned Maintenance work, in date order.</p>
          </div>
          {!upcomingVisits.length ? <div className="p-4"><Empty>No scheduled Maintenance visit is currently ahead.</Empty></div> : <ul className="divide-y divide-stone-100">{upcomingVisits.map((visit) => {
            const team = visit.relationship.assignedTeam || [];
            return <li key={visit.id} className="px-4 py-4">
              <Link to={`/admin/maintenance/${visit.relationship.id}`} className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
                <div><p className="text-[12.5px] font-semibold tabular-nums text-botanique-charcoal">{showDate(visit.scheduledDate)}</p><span className="mt-1 inline-flex rounded-full bg-[#eef3f0] px-2 py-0.5 text-[10px] font-medium text-botanique-green">Maintenance visit</span></div>
                <div className="min-w-0"><p className="text-[13.5px] font-semibold text-botanique-charcoal">{visit.relationship.projectName}</p><p className="mt-1 line-clamp-2 text-[11.5px] text-gray-600">{visit.purpose}</p><p className="mt-1 text-[10.5px] text-gray-500">{team.length ? team.map((member) => `${member.full_name} · ${assignmentRoleLabel(member.role)}`).join("; ") : "No maintenance team assigned"}</p></div>
                <span className="text-botanique-green">→</span>
              </Link>
            </li>;
          })}</ul>}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="text-[14px] font-semibold">Sites needing follow-up</h2><span className="text-[12px] font-semibold tabular-nums text-sky-800">{attention.length}</span></div>
            {!attention.length ? <div className="mt-3"><Empty>No active Maintenance site currently needs follow-up.</Empty></div> : <div className="mt-2 divide-y divide-stone-100">{attention.slice(0, 5).map(({ relationship, reasons }) => <Link key={relationship.id} to={`/admin/maintenance/${relationship.id}`} className="flex items-start justify-between gap-3 py-3"><span className="min-w-0"><span className="block text-[12px] font-semibold">{relationship.projectName}</span><span className="mt-0.5 block text-[10.5px] leading-relaxed text-gray-500">{reasons.join(" · ")}</span></span><span className="text-botanique-green">→</span></Link>)}</div>}
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-[14px] font-semibold">Assigned maintenance team</h2>
            <p className="mt-1 text-[11px] text-gray-500">Current responsibility across active sites.</p>
            {!teamSummary.length ? <div className="mt-3"><Empty>No active Maintenance assignment is recorded.</Empty></div> : <ul className="mt-2 divide-y divide-stone-100">{teamSummary.slice(0, 6).map((member) => <li key={member.id} className="py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[12px] font-semibold">{member.name}</p><p className="mt-0.5 text-[10.5px] text-gray-500">{[...member.roles].map(assignmentRoleLabel).join(" · ")}</p></div><span className="shrink-0 text-[11px] font-semibold tabular-nums text-botanique-green">{member.sites.length} {member.sites.length === 1 ? "site" : "sites"}</span></div></li>)}</ul>}
          </section>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)] xl:items-start">
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-[14px] font-semibold">Recent maintenance notes</h2>
          <p className="mt-1 text-[11px] text-gray-500">Real completion, cancellation and field notes already recorded in the Hub.</p>
          {!recentNotes.length ? <div className="mt-3"><Empty>No Maintenance note has been recorded yet.</Empty></div> : <ul className="mt-2 divide-y divide-stone-100">{recentNotes.map((item) => <li key={item.id} className="py-3"><Link to={item.to} className="block"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[12px] font-semibold">{item.site}</p><p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-600">{item.note}</p></div><span className="shrink-0 text-[10.5px] text-gray-500">{showDate(item.date)}</span></div><p className="mt-1 text-[10px] font-medium text-botanique-green">{item.source}</p></Link></li>)}</ul>}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-[14px] font-semibold">Recent field execution</h2>
          <p className="mt-1 text-[11px] text-gray-500">Daily Site Record supports Maintenance execution; it does not replace visit planning.</p>
          {!recentFieldActivity.length ? <div className="mt-3"><Empty>No recent Maintenance-period field record is available.</Empty></div> : <ul className="mt-2 divide-y divide-stone-100">{recentFieldActivity.map(({ entry, relationship }) => <li key={entry.id} className="py-3"><Link to={`/admin/daily-site-operations/${entry.id}`} className="block"><div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold">{relationship.projectName}</p><p className="mt-0.5 line-clamp-1 text-[10.5px] text-gray-500">{entry.workPlanned || entry.notes || "Site activity recorded"}</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ENTRY_BADGE[entry.state] || "bg-stone-100 text-gray-600"}`}>{entryLabel(entry.state)}</span></div><p className="mt-1 text-[10px] text-gray-400">{showDate(entry.workDate)}</p></Link></li>)}</ul>}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-semibold">Maintenance register</h2><p className="mt-1 text-sm text-gray-500">Relationship status, cycle, last visit, next visit and current responsibility.</p></div>
          <select value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"><option value="active">Active Maintenance</option>{MAINTENANCE_RELATIONSHIP_STATUSES.filter((value) => value !== "active").map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)}</option>)}<option value="all">All statuses</option></select>
        </div>
        {!visible.length ? <p className="p-8 text-center text-sm text-gray-500">No Maintenance relationship matches this view.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[12px]"><thead className="border-b border-stone-100 bg-[#fbfbfa] text-[10.5px] uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 font-medium">Site / Project</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Frequency</th><th className="px-4 py-3 font-medium">Last visit</th><th className="px-4 py-3 font-medium">Next visit</th><th className="px-4 py-3 font-medium">Assigned team</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{visible.map((relationship) => <tr key={relationship.id}><td className="px-4 py-3 font-semibold text-botanique-charcoal">{relationship.projectName}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[relationship.status] || ""}`}>{relationshipStatusLabel(relationship.status)}</span></td><td className="px-4 py-3 text-gray-600">{frequencyLabel(relationship.frequency)}</td><td className="px-4 py-3 text-gray-600">{showDate(relationship.lastVisitDate)}</td><td className="px-4 py-3 text-gray-600">{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : relationship.frequency === "as_needed" ? "As needed" : "Not scheduled"}</td><td className="max-w-[220px] px-4 py-3 text-gray-600">{relationship.assignedTeam.length ? relationship.assignedTeam.map((member) => member.full_name).join(", ") : "Unassigned"}</td><td className="px-4 py-3 text-right"><Link to={`/admin/maintenance/${relationship.id}`} className="font-semibold text-botanique-green">View →</Link></td></tr>)}</tbody></table></div>}
      </section>
    </>}
  </section>;
}
