import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useMaintenance } from "../context/maintenance";
import {
  MAINTENANCE_FREQUENCIES, MAINTENANCE_RELATIONSHIP_STATUSES, canManageMaintenance,
  canSeeMaintenance, frequencyLabel, relationshipStatusLabel,
} from "../utils/maintenanceCapabilities";
import {
  dedupeMaintenanceEligibleProjects,
  maintenanceProjectChoiceLabel,
} from "../utils/maintenancePresentation";

const showDate = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
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
  returned_for_correction: "bg-amber-50 text-amber-800",
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

function AttentionRow({ relationship, reasons }) {
  return <Link to={`/admin/maintenance/${relationship.id}`} className="flex items-start justify-between gap-3 border-b border-stone-100 py-3 last:border-b-0">
    <span className="min-w-0">
      <span className="block truncate text-[12.5px] font-semibold text-botanique-charcoal">{relationship.projectName}</span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-gray-500">{reasons.join(" · ")}</span>
    </span>
    <span className="shrink-0 text-botanique-green">→</span>
  </Link>;
}

export default function AdminMaintenance() {
  const { role } = useAdminData();
  const { entries = [], status: dailyStatus } = useDailySiteOperations();
  const { register, visits = [], eligibleProjects, status, error, addRelationship } = useMaintenance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [form, setForm] = useState({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const statusFilter = searchParams.get("status") || "active";
  const nowDate = today();

  const maintenanceChoices = useMemo(() => dedupeMaintenanceEligibleProjects(eligibleProjects), [eligibleProjects]);
  const visible = useMemo(() => register.filter((relationship) => statusFilter === "all" || relationship.status === statusFilter), [register, statusFilter]);

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
    return { relationship, activity, latestActivity, scheduled, overdueVisits, reasons };
  }), [activityByRelationship, nowDate, register, visits]);

  const attention = operationalRows.filter((row) => row.relationship.status === "active" && row.reasons.length);
  const active = operationalRows.filter((row) => row.relationship.status === "active");
  const in7 = new Date(`${nowDate}T00:00:00`); in7.setDate(in7.getDate() + 7);
  const in7Iso = in7.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const visitsIn7 = visits.filter((visit) => visit.status === "scheduled" && visit.scheduledDate >= nowDate && visit.scheduledDate <= in7Iso).length;
  const last7 = new Date(`${nowDate}T00:00:00`); last7.setDate(last7.getDate() - 6);
  const last7Iso = last7.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const fieldRecords7 = new Set(operationalRows.flatMap((row) => row.activity.filter((entry) => entry.workDate >= last7Iso).map((entry) => entry.id))).size;

  const upcomingVisits = visits
    .filter((visit) => visit.status === "scheduled" && visit.scheduledDate >= nowDate)
    .slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 5)
    .map((visit) => ({ ...visit, relationship: register.find((row) => row.id === visit.relationshipId) }))
    .filter((visit) => visit.relationship);

  const recentActivity = operationalRows.flatMap((row) => row.activity.map((entry) => ({ entry, relationship: row.relationship })))
    .sort((a, b) => b.entry.workDate.localeCompare(a.entry.workDate) || String(b.entry.updatedAt || "").localeCompare(String(a.entry.updatedAt || "")))
    .slice(0, 6);

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  }
  function toggleExpanded(id) {
    setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function submit(event) {
    event.preventDefault(); setFormError("");
    if (!form.projectId) return setFormError("Choose a project or site for Maintenance.");
    if (!form.scope.trim()) return setFormError("Describe the maintenance scope.");
    setSaving(true);
    const result = await addRelationship({ ...form, scope: form.scope.trim() });
    setSaving(false);
    if (!result.ok) return setFormError(result.error || "This Maintenance relationship could not be started.");
    setForm({ projectId: "", scope: "", startDate: today(), frequency: "monthly" }); setShowForm(false);
  }

  if (!canSeeMaintenance(role)) return <section><h1 className="text-2xl font-semibold">Maintenance unavailable</h1><p className="mt-2 text-sm text-gray-600">Maintenance is available to the Principal and the Operations Manager.</p></section>;

  return <section className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p><h1 className="mt-1 text-[28px] font-semibold leading-tight">Maintenance</h1><p className="mt-1 max-w-3xl text-sm text-gray-600">Plan recurring upkeep, see the field work actually recorded, verify evidence, and keep the next action clear.</p></div>
      {canManageMaintenance(role) && <button type="button" onClick={() => { setShowForm((open) => !open); setFormError(""); }} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white">{showForm ? "Cancel" : "Start Maintenance"}</button>}
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active sites" value={active.length} hint="under Maintenance" />
      <StatCard label="Visits next 7 days" value={visitsIn7} hint="planned field visits" />
      <StatCard label="Field records · 7 days" value={fieldRecords7} hint="Daily Site Records since Maintenance started" />
      <StatCard label="Needs attention" value={attention.length} hint="sites with an operational gap" />
    </div>

    {showForm && canManageMaintenance(role) && <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold">Start a Maintenance relationship</h2><p className="mt-1 text-xs text-gray-500">The Project keeps its own lifecycle. Maintenance controls ongoing upkeep separately.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Project / site<select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required><option value="">Choose project or site</option>{maintenanceChoices.map((project) => <option key={project.id} value={project.id}>{maintenanceProjectChoiceLabel(project)}</option>)}</select></label>
        <label className="text-sm font-medium sm:col-span-2">Maintenance scope<input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} placeholder="Lawn, borders, irrigation checks and general upkeep" className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" maxLength={2000} required /></label>
        <label className="text-sm font-medium">Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5" required /></label>
        <label className="text-sm font-medium">Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5">{MAINTENANCE_FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}</select></label>
      </div>{formError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}<button disabled={saving} className="mt-4 min-h-11 rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Start Maintenance"}</button>
    </form>}

    {status === "loading" && <p className="text-sm text-gray-600">Loading Maintenance…</p>}
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {dailyStatus === "error" && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Maintenance loaded, but current Daily Site Records could not be read. Field activity is temporarily incomplete.</p>}

    {status !== "loading" && <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_340px] xl:items-start">
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold">Maintenance register</h2><p className="mt-1 text-sm text-gray-500">Each site shows plan, latest field execution and the next operational step.</p></div><select value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"><option value="active">Active Maintenance</option>{MAINTENANCE_RELATIONSHIP_STATUSES.filter((value) => value !== "active").map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)}</option>)}<option value="all">All statuses</option></select></div>
        {!visible.length ? <p className="p-8 text-center text-sm text-gray-500">No Maintenance relationship matches this view.</p> : <ul className="divide-y divide-stone-200">{visible.map((relationship, index) => {
          const row = operationalRows.find((candidate) => candidate.relationship.id === relationship.id);
          const latest = row?.latestActivity;
          const isExpanded = expanded.has(relationship.id);
          return <li key={relationship.id} className="px-4 py-4"><div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3"><span className="pt-0.5 text-lg font-medium tabular-nums text-botanique-green">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link to={`/admin/maintenance/${relationship.id}`} className="truncate text-[14px] font-semibold text-botanique-charcoal hover:text-botanique-green">{relationship.projectName}</Link><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[relationship.status] || ""}`}>{relationshipStatusLabel(relationship.status)}</span>{row?.reasons.length > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">Needs attention</span>}</div><p className="mt-1 text-[11.5px] text-gray-500">{frequencyLabel(relationship.frequency)} · {relationship.assignedTeam.length ? relationship.assignedTeam.map((member) => member.full_name).join(", ") : "No team assigned"}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px]"><span><span className="text-gray-400">Next visit</span> <strong className="font-medium text-botanique-charcoal">{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : relationship.frequency === "as_needed" ? "As needed" : "Not scheduled"}</strong></span><span><span className="text-gray-400">Latest field record</span> <strong className="font-medium text-botanique-charcoal">{latest ? showDate(latest.workDate) : "None since Maintenance started"}</strong></span>{latest && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ENTRY_BADGE[latest.state] || "bg-stone-100 text-gray-600"}`}>{entryLabel(latest.state)}</span>}</div>{row?.reasons.length > 0 && <p className="mt-2 text-[11px] text-amber-800">{row.reasons.join(" · ")}</p>}</div><button type="button" onClick={() => toggleExpanded(relationship.id)} aria-expanded={isExpanded} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-botanique-green">{isExpanded ? "⌃" : "⌄"}</button></div>
          {isExpanded && <div className="mt-3 rounded-lg border border-stone-100 bg-[#fcfcfb] p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Current operating position</p><div className="mt-2 grid gap-3 sm:grid-cols-3"><div><p className="text-[10.5px] text-gray-400">Scope</p><p className="mt-1 text-[12px] text-gray-700">{relationship.scope}</p></div><div><p className="text-[10.5px] text-gray-400">Latest work</p><p className="mt-1 text-[12px] text-gray-700">{latest?.workPlanned || latest?.notes || "No field work recorded yet."}</p></div><div><p className="text-[10.5px] text-gray-400">Evidence</p><p className="mt-1 text-[12px] text-gray-700">{latest ? evidenceLabel(latest.evidenceStatus) : "—"}</p></div></div><div className="mt-3 flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-[12px] font-semibold"><Link to={`/admin/maintenance/${relationship.id}`} className="text-botanique-green">Open Maintenance →</Link>{latest && <Link to={`/admin/daily-site-operations/${latest.id}`} className="text-botanique-green">View latest site record →</Link>}{relationship.status === "active" && <Link to={`/admin/daily-site-operations/new?project=${relationship.projectId}`} className="text-botanique-green">Record field work →</Link>}</div></div>}
        </li>;})}</ul>}
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">Needs attention</h2><span className="text-xs font-semibold text-amber-800">{attention.length}</span></div>{!attention.length ? <p className="mt-3 text-[12px] text-gray-500">No active Maintenance site has an operational gap right now.</p> : <div className="mt-2">{attention.slice(0, 6).map((row) => <AttentionRow key={row.relationship.id} relationship={row.relationship} reasons={row.reasons} />)}</div>}</section>
        <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">Upcoming visits</h2><span className="text-xs text-gray-500">{upcomingVisits.length}</span></div>{!upcomingVisits.length ? <p className="mt-3 text-[12px] text-gray-500">No visit is scheduled.</p> : <ul className="mt-2 divide-y divide-stone-100">{upcomingVisits.map((visit) => <li key={visit.id} className="py-3"><Link to={`/admin/maintenance/${visit.relationship.id}`} className="block"><div className="flex justify-between gap-3"><span className="truncate text-[12px] font-semibold">{visit.relationship.projectName}</span><span className="shrink-0 text-[11px] font-semibold text-botanique-green">{showDate(visit.scheduledDate)}</span></div><p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{visit.purpose}</p></Link></li>)}</ul>}</section>
        <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">Recent field activity</h2><span className="text-xs text-gray-500">{recentActivity.length}</span></div>{!recentActivity.length ? <p className="mt-3 text-[12px] text-gray-500">No Daily Site Record has been recorded since these Maintenance relationships started.</p> : <ul className="mt-2 divide-y divide-stone-100">{recentActivity.map(({ entry, relationship }) => <li key={`${relationship.id}-${entry.id}`} className="py-3"><Link to={`/admin/daily-site-operations/${entry.id}`} className="block"><div className="flex items-start justify-between gap-3"><span className="truncate text-[12px] font-semibold">{relationship.projectName}</span><span className="shrink-0 text-[10.5px] text-gray-500">{showDate(entry.workDate)}</span></div><p className="mt-1 line-clamp-2 text-[11px] text-gray-600">{entry.workPlanned || entry.notes || (entry.disposition === "no_work" ? "No work recorded" : "Site activity recorded")}</p><div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-gray-500"><span>{entry.expectedWorkerCount || 0} crew</span><span>·</span><span>{evidenceLabel(entry.evidenceStatus)}</span><span className={`rounded-full px-1.5 ${ENTRY_BADGE[entry.state] || "bg-stone-100"}`}>{entryLabel(entry.state)}</span></div></Link></li>)}</ul>}</section>
      </aside>
    </div>}
  </section>;
}

function evidenceLabel(value) {
  return ({ none: "No evidence stated", promised: "Evidence promised", provided: "Evidence provided", not_required: "Evidence not required" })[value] || "Evidence not stated";
}
