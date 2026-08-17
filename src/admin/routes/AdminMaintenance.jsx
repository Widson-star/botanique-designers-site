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
import { dedupeMaintenanceEligibleProjects, maintenanceProjectChoiceLabel } from "../utils/maintenancePresentation";

const showDate = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : "—";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const liveEntryStates = new Set(["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"]);
const entryLabel = (state) => ({ draft: "Draft", submitted: "Awaiting review", returned_for_correction: "Correction needed", resubmitted: "Awaiting review", accepted: "Accepted" })[state] || state;

function StatCard({ label, value, hint }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><p className="text-[11px] font-medium text-gray-500">{label}</p><p className="mt-1 text-[22px] font-semibold tabular-nums text-botanique-charcoal">{value}</p><p className="mt-1 text-[10.5px] text-gray-500">{hint}</p></div>;
}
function Empty({ children }) { return <p className="rounded-lg bg-stone-50 px-3 py-4 text-[12px] text-gray-500">{children}</p>; }

function workState(visit, entry, nowDate) {
  if (entry?.state === "accepted") return "needs_closure";
  if (["submitted", "resubmitted"].includes(entry?.state)) return "awaiting_review";
  if (entry?.state === "returned_for_correction") return "correction_needed";
  if (entry?.state === "draft") return "draft_field_record";
  if (visit.scheduledDate < nowDate) return "overdue";
  if (visit.scheduledDate === nowDate) return "due";
  return "upcoming";
}
const stateInfo = {
  needs_closure: { label: "Needs closure", className: "bg-sky-50 text-sky-800", priority: 1 },
  awaiting_review: { label: "Awaiting field review", className: "bg-sky-50 text-sky-800", priority: 2 },
  correction_needed: { label: "Field correction needed", className: "bg-red-50 text-red-700", priority: 2 },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700", priority: 3 },
  due: { label: "Due today", className: "bg-stone-100 text-gray-700", priority: 4 },
  draft_field_record: { label: "Field record draft", className: "bg-stone-100 text-gray-700", priority: 5 },
  schedule_next: { label: "Next visit not scheduled", className: "bg-stone-100 text-gray-700", priority: 6 },
  upcoming: { label: "Upcoming", className: "bg-[#eef3f0] text-botanique-green", priority: 8 },
};

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
  const visible = useMemo(() => register.filter((relationship) => statusFilter === "all" || relationship.status === statusFilter), [register, statusFilter]);

  const activityByRelationship = useMemo(() => {
    const result = new Map();
    for (const relationship of register) {
      const activity = entries.filter((entry) => entry.projectId === relationship.projectId && entry.workDate >= relationship.startDate && liveEntryStates.has(entry.state))
        .slice().sort((a, b) => b.workDate.localeCompare(a.workDate) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      result.set(relationship.id, activity);
    }
    return result;
  }, [entries, register]);

  const workboard = useMemo(() => {
    const rows = [];
    for (const relationship of register.filter((item) => item.status === "active")) {
      const activity = activityByRelationship.get(relationship.id) || [];
      const byDate = new Map(activity.map((entry) => [entry.workDate, entry]));
      const scheduled = visits.filter((visit) => visit.relationshipId === relationship.id && visit.status === "scheduled").slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      const currentVisit = scheduled.find((visit) => visit.scheduledDate <= nowDate) || scheduled[0] || null;
      if (currentVisit) {
        const entry = byDate.get(currentVisit.scheduledDate) || null;
        const state = workState(currentVisit, entry, nowDate);
        rows.push({ relationship, visit: currentVisit, entry, state, info: stateInfo[state] });
      } else if (relationship.frequency !== "as_needed") {
        rows.push({ relationship, visit: null, entry: activity[0] || null, state: "schedule_next", info: stateInfo.schedule_next });
      }
    }
    return rows.sort((a, b) => a.info.priority - b.info.priority || String(a.visit?.scheduledDate || "9999").localeCompare(String(b.visit?.scheduledDate || "9999")) || a.relationship.projectName.localeCompare(b.relationship.projectName));
  }, [activityByRelationship, nowDate, register, visits]);

  const actionable = workboard.filter((row) => row.state !== "upcoming");
  const needsClosure = workboard.filter((row) => row.state === "needs_closure").length;
  const dueOrOverdue = workboard.filter((row) => ["due", "overdue"].includes(row.state)).length;
  const followUpCount = workboard.filter((row) => ["awaiting_review", "correction_needed", "draft_field_record", "schedule_next"].includes(row.state)).length;
  const completedThisMonth = visits.filter((visit) => visit.status === "completed" && String(visit.completedAt || visit.scheduledDate).slice(0, 7) === monthPrefix).length;

  const teamSummary = useMemo(() => {
    const byPerson = new Map();
    for (const relationship of register.filter((row) => row.status === "active")) {
      for (const member of relationship.assignedTeam || []) {
        const current = byPerson.get(member.person_id) || { id: member.person_id, name: member.full_name || "Team member", roles: new Set(), sites: [] };
        current.roles.add(member.role); current.sites.push({ id: relationship.id, name: relationship.projectName }); byPerson.set(member.person_id, current);
      }
    }
    return [...byPerson.values()].sort((a, b) => b.sites.length - a.sites.length || a.name.localeCompare(b.name));
  }, [register]);

  const recentCompleted = visits.filter((visit) => visit.status === "completed").slice().sort((a, b) => String(b.completedAt || b.scheduledDate).localeCompare(String(a.completedAt || a.scheduledDate))).slice(0, 5)
    .map((visit) => ({ ...visit, relationship: register.find((row) => row.id === visit.relationshipId) })).filter((visit) => visit.relationship);

  function setParam(key, value, fallback) { const next = new URLSearchParams(searchParams); if (value && value !== fallback) next.set(key, value); else next.delete(key); setSearchParams(next, { replace: true }); }
  async function submit(event) {
    event.preventDefault(); setFormError("");
    if (!form.projectId) return setFormError("Choose a project or site for Maintenance.");
    if (!form.scope.trim()) return setFormError("Describe the maintenance scope.");
    setSaving(true); const result = await addRelationship({ ...form, scope: form.scope.trim() }); setSaving(false);
    if (!result.ok) return setFormError(result.error || "This Maintenance relationship could not be started.");
    setForm({ projectId: "", scope: "", startDate: today(), frequency: "monthly" }); setShowForm(false);
  }

  if (!canSeeMaintenance(role)) return <section><h1 className="text-2xl font-semibold">Maintenance unavailable</h1><p className="mt-2 text-sm text-gray-600">Maintenance is available to the Principal and the Operations Manager.</p></section>;

  return <section className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p><h1 className="mt-1 text-[28px] font-semibold leading-tight">Maintenance</h1><p className="mt-1 max-w-3xl text-sm text-gray-600">Plan the visit, verify the field work, close the cycle and keep the next action clear.</p></div>{canManageMaintenance(role) && <button type="button" onClick={() => { setShowForm((open) => !open); setFormError(""); }} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white">{showForm ? "Cancel" : "Start Maintenance"}</button>}</header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Needs closure" value={needsClosure} hint="field work accepted; visit still open"/><StatCard label="Due / overdue" value={dueOrOverdue} hint="visit has no field execution yet"/><StatCard label="Other follow-up" value={followUpCount} hint="review, correction or next visit needed"/><StatCard label="Completed visits" value={completedThisMonth} hint="this month"/></div>

    {showForm && canManageMaintenance(role) && <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-sm font-semibold">Start a Maintenance relationship</h2><p className="mt-1 text-xs text-gray-500">The linked Project keeps its own lifecycle. Maintenance continues independently.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Project / site<select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required><option value="">Choose project or site</option>{maintenanceChoices.map((project) => <option key={project.id} value={project.id}>{maintenanceProjectChoiceLabel(project)}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Maintenance scope<input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} placeholder="Lawn, borders, irrigation checks and general upkeep" className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" maxLength={2000} required /></label><label className="text-sm font-medium">Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required /></label><label className="text-sm font-medium">Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5">{MAINTENANCE_FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}</select></label></div>{formError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}<button disabled={saving} className="mt-4 min-h-11 rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Start Maintenance"}</button></form>}

    {status === "loading" && <p className="text-sm text-gray-600">Loading Maintenance…</p>}{error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{dailyStatus === "error" && <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Maintenance is available, but Daily Site Records could not be read. Visit planning remains available; execution state is temporarily incomplete.</p>}

    {status !== "loading" && <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px] xl:items-start">
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-200 px-4 py-4"><h2 className="text-lg font-semibold">Maintenance workboard</h2><p className="mt-1 text-sm text-gray-500">One current cycle and one operational next step for each active maintained site.</p></div>{!workboard.length ? <div className="p-4"><Empty>No active Maintenance cycle needs planning.</Empty></div> : <ul className="divide-y divide-stone-100">{workboard.map((row) => {
          const team = row.relationship.assignedTeam || [];
          const actionLabel = row.state === "needs_closure" ? "Complete visit" : row.state === "awaiting_review" ? "Review field record" : ["correction_needed", "draft_field_record"].includes(row.state) ? "Open field record" : row.state === "schedule_next" ? "Schedule visit" : row.entry ? "View field record" : "Open Maintenance";
          const actionTo = ["awaiting_review", "correction_needed", "draft_field_record"].includes(row.state) && row.entry ? `/admin/daily-site-operations/${row.entry.id}` : `/admin/maintenance/${row.relationship.id}`;
          return <li key={row.relationship.id} className="px-4 py-4"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_145px_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link to={`/admin/maintenance/${row.relationship.id}`} className="text-[13px] font-semibold text-botanique-charcoal hover:text-botanique-green">{row.relationship.projectName}</Link><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.info.className}`}>{row.info.label}</span></div><p className="mt-1 text-[11.5px] text-gray-500">{frequencyLabel(row.relationship.frequency)} · {team.length ? team.map((member) => member.full_name).join(", ") : "No team assigned"}</p>{row.visit && <p className="mt-1 text-[11.5px] text-gray-600">{showDate(row.visit.scheduledDate)} · {row.visit.purpose}</p>}{row.entry && <p className="mt-1 text-[10.5px] text-gray-500">Field execution: {entryLabel(row.entry.state)}{row.entry.workPlanned ? ` · ${row.entry.workPlanned}` : ""}</p>}</div><div className="text-[11px] text-gray-500">{row.entry ? <><p>DSR {showDate(row.entry.workDate)}</p><p className="mt-1">{row.entry.evidenceStatus === "provided" ? "Evidence provided" : row.entry.evidenceStatus === "promised" ? "Evidence promised" : "Evidence not stated"}</p></> : row.visit ? <p>No field record for this visit</p> : <p>No visit currently scheduled</p>}</div><Link to={actionTo} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-botanique-green hover:bg-stone-50">{actionLabel} →</Link></div></li>;
        })}</ul>}</section>

        <div className="space-y-4"><section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Action queue</h2><span className="text-xs font-semibold text-botanique-green">{actionable.length}</span></div>{!actionable.length ? <p className="mt-3 text-[12px] text-gray-500">No Maintenance action is waiting.</p> : <ul className="mt-2 divide-y divide-stone-100">{actionable.slice(0, 6).map((row) => <li key={row.relationship.id} className="py-3"><Link to={`/admin/maintenance/${row.relationship.id}`} className="flex items-start justify-between gap-3"><span><span className="block text-[12px] font-semibold">{row.relationship.projectName}</span><span className="mt-0.5 block text-[10.5px] text-gray-500">{row.info.label}{row.visit ? ` · ${showDate(row.visit.scheduledDate)}` : ""}</span></span><span className="text-botanique-green">→</span></Link></li>)}</ul>}</section>
        <section className="rounded-xl border border-stone-200 bg-white p-4"><h2 className="text-sm font-semibold">Assigned Maintenance team</h2><p className="mt-1 text-[11px] text-gray-500">Current responsibility across active sites.</p>{!teamSummary.length ? <p className="mt-3 text-[12px] text-gray-500">No current assignments.</p> : <ul className="mt-2 divide-y divide-stone-100">{teamSummary.map((person) => <li key={person.id} className="py-3"><div className="flex justify-between gap-3"><span><span className="block text-[12px] font-semibold">{person.name}</span><span className="mt-0.5 block text-[10.5px] text-gray-500">{[...person.roles].map(assignmentRoleLabel).join(" · ")}</span></span><span className="shrink-0 text-[11px] font-medium text-botanique-green">{person.sites.length} {person.sites.length === 1 ? "site" : "sites"}</span></div></li>)}</ul>}</section></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-stone-200 bg-white p-4"><h2 className="text-sm font-semibold">Recently completed visits</h2><p className="mt-1 text-[11px] text-gray-500">Closed Maintenance cycles and their outcome.</p>{!recentCompleted.length ? <p className="mt-3 text-[12px] text-gray-500">No Maintenance visit has been completed yet.</p> : <ul className="mt-2 divide-y divide-stone-100">{recentCompleted.map((visit) => <li key={visit.id} className="py-3"><Link to={`/admin/maintenance/${visit.relationship.id}`}><div className="flex justify-between gap-3"><span><span className="block text-[12px] font-semibold">{visit.relationship.projectName}</span><span className="mt-0.5 block text-[10.5px] text-gray-500">{visit.completionOutcome === "partial" ? "Partially completed" : "Completed"} · {showDate(visit.scheduledDate)}</span></span>{visit.followUpRequired && <span className="text-[10.5px] font-semibold text-sky-800">Follow-up</span>}</div></Link></li>)}</ul>}</section><section className="rounded-xl border border-stone-200 bg-white p-4"><h2 className="text-sm font-semibold">How Maintenance works</h2><div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10.5px]"><div className="rounded-lg bg-stone-50 p-2"><strong className="block text-botanique-charcoal">1. Plan</strong><span className="text-gray-500">Visit + scope</span></div><div className="rounded-lg bg-stone-50 p-2"><strong className="block text-botanique-charcoal">2. Execute</strong><span className="text-gray-500">Daily Site Record</span></div><div className="rounded-lg bg-stone-50 p-2"><strong className="block text-botanique-charcoal">3. Close</strong><span className="text-gray-500">Outcome + follow-up</span></div><div className="rounded-lg bg-stone-50 p-2"><strong className="block text-botanique-charcoal">4. Continue</strong><span className="text-gray-500">Next visit</span></div></div></section></div>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4"><div><h2 className="text-lg font-semibold">Maintenance register</h2><p className="mt-1 text-sm text-gray-500">Relationship status, cycle, last completed visit, next visit and current responsibility.</p></div><select value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm"><option value="all">All Maintenance</option>{MAINTENANCE_RELATIONSHIP_STATUSES.map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)} Maintenance</option>)}</select></div>{!visible.length ? <div className="p-4"><Empty>No Maintenance relationship matches this filter.</Empty></div> : <><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-[12px]"><thead className="border-b border-stone-100 bg-[#fbfbfa] text-[10px] uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 font-medium">Site / Project</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Frequency</th><th className="px-4 py-3 font-medium">Last visit</th><th className="px-4 py-3 font-medium">Next visit</th><th className="px-4 py-3 font-medium">Assigned team</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{visible.map((relationship) => <tr key={relationship.id}><td className="px-4 py-3 font-semibold">{relationship.projectName}</td><td className="px-4 py-3"><span className="rounded-full bg-[#eef3f0] px-2 py-0.5 text-[10px] font-medium text-botanique-green">{relationshipStatusLabel(relationship.status)}</span></td><td className="px-4 py-3">{frequencyLabel(relationship.frequency)}</td><td className="px-4 py-3">{relationship.lastVisitDate ? showDate(relationship.lastVisitDate) : "—"}</td><td className="px-4 py-3">{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : relationship.frequency === "as_needed" ? "As needed" : "Not scheduled"}</td><td className="px-4 py-3">{relationship.assignedTeam?.length ? relationship.assignedTeam.map((member) => member.full_name).join(", ") : "—"}</td><td className="px-4 py-3 text-right"><Link to={`/admin/maintenance/${relationship.id}`} className="font-semibold text-botanique-green">View →</Link></td></tr>)}</tbody></table></div><ul className="space-y-2 p-3 md:hidden">{visible.map((relationship) => <li key={relationship.id} className="rounded-xl border border-stone-200 p-3"><div className="flex justify-between gap-3"><div><p className="text-[13px] font-semibold">{relationship.projectName}</p><p className="mt-1 text-[11px] text-gray-500">{frequencyLabel(relationship.frequency)} · {relationship.assignedTeam?.map((member) => member.full_name).join(", ") || "No team"}</p><p className="mt-1 text-[11px] text-gray-600">Next: {relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : relationship.frequency === "as_needed" ? "As needed" : "Not scheduled"}</p></div><Link to={`/admin/maintenance/${relationship.id}`} className="font-semibold text-botanique-green">View →</Link></div></li>)}</ul></>}</section>
    </>}
  </section>;
}
