import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useMaintenance } from "../context/maintenance";
import {
  MAINTENANCE_FREQUENCIES,
  MAINTENANCE_RELATIONSHIP_STATUSES,
  assignmentRoleLabel,
  canManageMaintenance,
  canSeeMaintenance,
  frequencyLabel,
  relationshipStatusLabel,
} from "../utils/maintenanceCapabilities";
import {
  dedupeMaintenanceEligibleProjects,
  maintenanceProjectChoiceLabel,
} from "../utils/maintenancePresentation";

const showDate = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
  : "—";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const liveEntryStates = new Set(["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"]);
const entryLabel = (state) => ({
  draft: "Draft",
  submitted: "Awaiting review",
  returned_for_correction: "Correction needed",
  resubmitted: "Awaiting review",
  accepted: "Accepted",
})[state] || state;

function workState(visit, entry, nowDate) {
  if (entry?.state === "accepted") return "needs_closure";
  if (["submitted", "resubmitted"].includes(entry?.state)) return "awaiting_review";
  if (entry?.state === "returned_for_correction") return "correction_needed";
  if (entry?.state === "draft") return "draft_field_record";
  if (visit.scheduledDate < nowDate) return "overdue";
  if (visit.scheduledDate === nowDate) return "due";
  return "upcoming";
}

function outstandingFollowUp(relationshipId, visits) {
  const related = visits.filter((visit) => visit.relationshipId === relationshipId);
  return related
    .filter((visit) => visit.status === "completed" && visit.followUpRequired)
    .slice()
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .find((visit) => !related.some((later) => later.status !== "cancelled" && later.scheduledDate > visit.scheduledDate)) || null;
}

const stateInfo = {
  follow_up: { label: "Follow-up outstanding", className: "bg-red-50 text-red-700", priority: 1 },
  needs_closure: { label: "Needs closure", className: "bg-sky-50 text-sky-800", priority: 2 },
  awaiting_review: { label: "Awaiting review", className: "bg-sky-50 text-sky-800", priority: 3 },
  correction_needed: { label: "Correction needed", className: "bg-red-50 text-red-700", priority: 3 },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700", priority: 4 },
  due: { label: "Due today", className: "bg-stone-100 text-gray-700", priority: 5 },
  draft_field_record: { label: "Draft field record", className: "bg-stone-100 text-gray-700", priority: 6 },
  schedule_next: { label: "No visit scheduled", className: "bg-stone-100 text-gray-700", priority: 7 },
  upcoming: { label: "Upcoming", className: "bg-[#eef3f0] text-botanique-green", priority: 8 },
};

function Metric({ label, value }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-4">
    <p className="text-[11px] font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-[22px] font-semibold tabular-nums text-botanique-charcoal">{value}</p>
  </div>;
}

export default function AdminMaintenance() {
  const { role } = useAdminData();
  const { entries = [], status: dailyStatus } = useDailySiteOperations();
  const { register, visits = [], eligibleProjects, status, error, addRelationship } = useMaintenance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const statusFilter = searchParams.get("status") || "active";
  const nowDate = today();

  const maintenanceChoices = useMemo(
    () => dedupeMaintenanceEligibleProjects(eligibleProjects),
    [eligibleProjects],
  );
  const visible = useMemo(
    () => register.filter((relationship) => statusFilter === "all" || relationship.status === statusFilter),
    [register, statusFilter],
  );

  const activityByRelationship = useMemo(() => {
    const result = new Map();
    for (const relationship of register) {
      result.set(
        relationship.id,
        entries
          .filter((entry) => entry.projectId === relationship.projectId && entry.workDate >= relationship.startDate && liveEntryStates.has(entry.state))
          .slice()
          .sort((a, b) => b.workDate.localeCompare(a.workDate) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
      );
    }
    return result;
  }, [entries, register]);

  const workboard = useMemo(() => {
    const rows = [];
    for (const relationship of register.filter((item) => item.status === "active")) {
      const activity = activityByRelationship.get(relationship.id) || [];
      const byDate = new Map(activity.map((entry) => [entry.workDate, entry]));
      const scheduled = visits
        .filter((visit) => visit.relationshipId === relationship.id && visit.status === "scheduled")
        .slice()
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      const currentVisit = scheduled.find((visit) => visit.scheduledDate <= nowDate) || scheduled[0] || null;
      const followUp = outstandingFollowUp(relationship.id, visits);

      if (currentVisit) {
        const entry = byDate.get(currentVisit.scheduledDate) || null;
        const state = workState(currentVisit, entry, nowDate);
        rows.push({ relationship, visit: currentVisit, entry, followUp: null, state, info: stateInfo[state] });
      } else if (followUp) {
        rows.push({ relationship, visit: null, entry: null, followUp, state: "follow_up", info: stateInfo.follow_up });
      } else {
        rows.push({ relationship, visit: null, entry: activity[0] || null, followUp: null, state: "schedule_next", info: stateInfo.schedule_next });
      }
    }
    return rows.sort((a, b) => a.info.priority - b.info.priority || String(a.visit?.scheduledDate || "9999").localeCompare(String(b.visit?.scheduledDate || "9999")) || a.relationship.projectName.localeCompare(b.relationship.projectName));
  }, [activityByRelationship, nowDate, register, visits]);

  const needsClosure = workboard.filter((row) => row.state === "needs_closure").length;
  const dueOrOverdue = workboard.filter((row) => ["due", "overdue"].includes(row.state)).length;
  const followUpCount = workboard.filter((row) => row.state === "follow_up").length;

  const teamSummary = useMemo(() => {
    const byPerson = new Map();
    for (const relationship of register.filter((row) => row.status === "active")) {
      for (const member of relationship.assignedTeam || []) {
        const current = byPerson.get(member.person_id) || {
          id: member.person_id,
          name: member.full_name || "Team member",
          roles: new Set(),
          sites: [],
        };
        current.roles.add(member.role);
        current.sites.push({ id: relationship.id, name: relationship.projectName });
        byPerson.set(member.person_id, current);
      }
    }
    return [...byPerson.values()].sort((a, b) => b.sites.length - a.sites.length || a.name.localeCompare(b.name));
  }, [register]);

  const recentCompleted = visits
    .filter((visit) => visit.status === "completed")
    .slice()
    .sort((a, b) => String(b.completedAt || b.scheduledDate).localeCompare(String(a.completedAt || a.scheduledDate)))
    .slice(0, 5)
    .map((visit) => ({ ...visit, relationship: register.find((row) => row.id === visit.relationshipId) }))
    .filter((visit) => visit.relationship);

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    if (!form.projectId) return setFormError("Choose a project or site.");
    if (!form.scope.trim()) return setFormError("Describe the maintenance scope.");
    setSaving(true);
    const result = await addRelationship({ ...form, scope: form.scope.trim() });
    setSaving(false);
    if (!result.ok) return setFormError(result.error || "Maintenance could not be started.");
    setForm({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
    setShowForm(false);
  }

  if (!canSeeMaintenance(role)) {
    return <section><h1 className="text-2xl font-semibold">Maintenance unavailable</h1></section>;
  }

  return <section className="space-y-4">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Maintenance</h1>
      </div>
      {canManageMaintenance(role) && <button type="button" onClick={() => { setShowForm((open) => !open); setFormError(""); }} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white">{showForm ? "Close" : "Start Maintenance"}</button>}
    </header>

    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Needs closure" value={needsClosure} />
      <Metric label="Due / overdue" value={dueOrOverdue} />
      <Metric label="Follow-up" value={followUpCount} />
    </div>

    {showForm && canManageMaintenance(role) && <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Project / site
          <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required>
            <option value="">Choose project or site</option>
            {maintenanceChoices.map((project) => <option key={project.id} value={project.id}>{maintenanceProjectChoiceLabel(project)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">Scope
          <input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" maxLength={2000} required />
        </label>
        <label className="text-sm font-medium">Start date
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required />
        </label>
        <label className="text-sm font-medium">Current arrangement
          <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5">
            {MAINTENANCE_FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}
          </select>
        </label>
      </div>
      {formError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
      <button disabled={saving} className="mt-4 min-h-11 rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Start Maintenance"}</button>
    </form>}

    {status === "loading" && <p className="text-sm text-gray-600">Loading…</p>}
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {dailyStatus === "error" && <p className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Daily Site Records are temporarily unavailable.</p>}

    {status !== "loading" && <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-4"><h2 className="text-lg font-semibold">Maintenance workboard</h2></div>
          {!workboard.length ? <p className="p-4 text-sm text-gray-500">No active Maintenance action.</p> : <ul className="divide-y divide-stone-100">{workboard.map((row) => {
            const team = row.relationship.assignedTeam || [];
            const actionLabel = row.state === "follow_up" ? "Schedule follow-up" : row.state === "needs_closure" ? "Complete visit" : row.state === "awaiting_review" ? "Review field record" : ["correction_needed", "draft_field_record"].includes(row.state) ? "Open field record" : row.state === "schedule_next" ? "Schedule visit" : row.entry ? "View field record" : "Open Maintenance";
            const actionTo = ["awaiting_review", "correction_needed", "draft_field_record"].includes(row.state) && row.entry
              ? `/admin/daily-site-operations/${row.entry.id}`
              : `/admin/maintenance/${row.relationship.id}`;
            return <li key={row.relationship.id} className="px-4 py-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/maintenance/${row.relationship.id}`} className="text-[13px] font-semibold text-botanique-charcoal hover:text-botanique-green">{row.relationship.projectName}</Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.info.className}`}>{row.info.label}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-gray-500">{frequencyLabel(row.relationship.frequency)} · {team.length ? team.map((member) => member.full_name).join(", ") : "Unassigned"}</p>
                  {row.visit && <p className="mt-1 text-[11.5px] text-gray-700">{showDate(row.visit.scheduledDate)} · {row.visit.purpose}</p>}
                  {row.followUp && <p className="mt-1 text-[11.5px] text-gray-700">{showDate(row.followUp.scheduledDate)} · {row.followUp.followUpNote}</p>}
                  {row.entry && <p className="mt-1 text-[10.5px] text-gray-500">DSR {entryLabel(row.entry.state)}{row.entry.workPlanned ? ` · ${row.entry.workPlanned}` : ""}</p>}
                </div>
                <Link to={actionTo} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-botanique-green hover:bg-stone-50">{actionLabel} →</Link>
              </div>
            </li>;
          })}</ul>}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Assigned team</h2>
          {!teamSummary.length ? <p className="mt-3 text-[12px] text-gray-500">No current assignments.</p> : <ul className="mt-2 divide-y divide-stone-100">{teamSummary.map((person) => <li key={person.id} className="py-3">
            <div className="flex justify-between gap-3">
              <span><span className="block text-[12px] font-semibold">{person.name}</span><span className="mt-0.5 block text-[10.5px] text-gray-500">{[...person.roles].map(assignmentRoleLabel).join(" · ")}</span></span>
              <span className="shrink-0 text-[11px] font-medium text-botanique-green">{person.sites.length} {person.sites.length === 1 ? "site" : "sites"}</span>
            </div>
          </li>)}</ul>}
        </section>
      </div>

      {recentCompleted.length > 0 && <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Recently completed visits</h2>
        <ul className="mt-2 divide-y divide-stone-100">{recentCompleted.map((visit) => <li key={visit.id} className="py-3">
          <Link to={`/admin/maintenance/${visit.relationship.id}`} className="flex items-center justify-between gap-3">
            <span><span className="block text-[12px] font-semibold">{visit.relationship.projectName}</span><span className="mt-0.5 block text-[10.5px] text-gray-500">{showDate(visit.scheduledDate)} · {visit.completionOutcome === "partial" ? "Partially completed" : "Completed"}</span></span>
            <span className="text-botanique-green">→</span>
          </Link>
        </li>)}</ul>
      </section>}

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-lg font-semibold">Maintenance register</h2>
          <button type="button" onClick={() => setShowRegister((open) => !open)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-botanique-green">{showRegister ? "Hide" : "View register"}</button>
        </div>
        {showRegister && <>
          <div className="border-t border-stone-200 px-4 py-3">
            <select value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm">
              <option value="all">All Maintenance</option>
              {MAINTENANCE_RELATIONSHIP_STATUSES.map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto border-t border-stone-200">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#fbfbfa] text-[10px] uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 font-medium">Site</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Arrangement</th><th className="px-4 py-3 font-medium">Last visit</th><th className="px-4 py-3 font-medium">Next visit</th><th className="px-4 py-3 font-medium">Team</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
              <tbody className="divide-y divide-stone-100">{visible.map((relationship) => <tr key={relationship.id}>
                <td className="px-4 py-3 font-semibold">{relationship.projectName}</td>
                <td className="px-4 py-3">{relationshipStatusLabel(relationship.status)}</td>
                <td className="px-4 py-3">{frequencyLabel(relationship.frequency)}</td>
                <td className="px-4 py-3">{showDate(relationship.lastVisitDate)}</td>
                <td className="px-4 py-3">{relationship.nextVisitDate ? `${relationship.nextVisitDate < nowDate ? "Overdue · " : ""}${showDate(relationship.nextVisitDate)}` : "Not scheduled"}</td>
                <td className="px-4 py-3">{(relationship.assignedTeam || []).map((member) => member.full_name).join(", ") || "—"}</td>
                <td className="px-4 py-3 text-right"><Link to={`/admin/maintenance/${relationship.id}`} className="font-semibold text-botanique-green">View →</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
      </section>
    </>}
  </section>;
}
