import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useMaintenance } from "../context/maintenance";
import {
  MAINTENANCE_FREQUENCIES, MAINTENANCE_RELATIONSHIP_STATUSES, canManageMaintenance,
  canSeeMaintenance, frequencyLabel, relationshipStatusLabel,
} from "../utils/maintenanceCapabilities";
import {
  dedupeMaintenanceEligibleProjects,
  maintenanceProjectChoiceLabel,
} from "../utils/maintenancePresentation";

const showDate = (value) => (value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
  : "");

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_BADGE = {
  active: "bg-[#eef3f0] text-botanique-green",
  paused: "bg-stone-100 text-gray-600",
  ended: "bg-stone-100 text-gray-600",
};

function KpiIcon({ type }) {
  const paths = {
    people: <><circle cx="10" cy="6" r="2.4" /><path d="M5.8 16v-1.6c0-2.3 1.9-4.2 4.2-4.2s4.2 1.9 4.2 4.2V16M4 16h12" /></>,
    calendar: <><rect x="3.5" y="5" width="13" height="11" rx="1.8" /><path d="M6.2 3.6v3M13.8 3.6v3M3.5 8h13M7 11h.01M10 11h.01M13 11h.01M7 13.5h.01M10 13.5h.01M13 13.5h.01" /></>,
    pin: <><path d="M10 17s5-4.7 5-9a5 5 0 1 0-10 0c0 4.3 5 9 5 9Z" /><circle cx="10" cy="8" r="1.7" /></>,
    check: <><circle cx="10" cy="10" r="6.7" /><path d="m7 10 2 2.1 4-4.4" /></>,
  };
  return (
    <svg viewBox="0 0 20 20" className="h-7 w-7 shrink-0 text-botanique-green" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function StatCard({ label, value, hint, icon }) {
  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white px-5 py-5 sm:min-h-[138px]">
      <div className="flex items-center gap-3">
        <KpiIcon type={icon} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-600">{label}</p>
      </div>
      <div className="mt-3 pl-10">
        <p className="text-[28px] font-medium leading-none text-botanique-charcoal">{value}</p>
        <p className="mt-3 text-xs text-gray-500">{hint}</p>
      </div>
    </div>
  );
}

function PanelSection({ title, meta, children, first = false }) {
  return (
    <section className={`${first ? "" : "border-t border-stone-200"} px-5 py-5`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">{title}</h3>
        {meta !== undefined && <span className="text-xs font-medium text-gray-500">{meta}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminMaintenance() {
  const { role } = useAdminData();
  const { register, visits = [], eligibleProjects, status, error, addRelationship } = useMaintenance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [form, setForm] = useState({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const statusFilter = searchParams.get("status") || "active";

  const maintenanceChoices = useMemo(
    () => dedupeMaintenanceEligibleProjects(eligibleProjects),
    [eligibleProjects]
  );

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function toggleExpanded(id) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visible = useMemo(() => register.filter((relationship) => {
    if (statusFilter !== "all" && relationship.status !== statusFilter) return false;
    return true;
  }), [register, statusFilter]);

  const kpis = useMemo(() => {
    const active = register.filter((relationship) => relationship.status === "active").length;
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysIso = in7Days.toISOString().slice(0, 10);
    const dueSoon = register.filter(
      (relationship) => relationship.status !== "ended" && relationship.nextVisitDate && relationship.nextVisitDate <= in7DaysIso
    ).length;
    const needsScheduling = register.filter(
      (relationship) => relationship.status !== "ended" && !relationship.nextVisitDate
    ).length;
    const completedVisits = visits.filter((visit) => visit.status === "completed").length;
    return { active, dueSoon, needsScheduling, completedVisits };
  }, [register, visits]);

  const upcomingVisits = useMemo(() => visits
    .filter((visit) => visit.status === "scheduled")
    .slice()
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 5)
    .map((visit) => ({
      ...visit,
      relationship: register.find((row) => row.id === visit.relationshipId),
    }))
    .filter((visit) => visit.relationship), [register, visits]);

  const recentVisitNotes = useMemo(() => visits
    .filter((visit) => visit.status === "completed" || visit.status === "cancelled")
    .slice()
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 4)
    .map((visit) => ({
      ...visit,
      relationship: register.find((row) => row.id === visit.relationshipId),
    }))
    .filter((visit) => visit.relationship), [register, visits]);

  const assignedPeople = useMemo(() => {
    const people = new Map();
    register.forEach((relationship) => {
      relationship.assignedTeam.forEach((member) => {
        const key = member.person_id || member.id || member.full_name;
        if (!people.has(key)) people.set(key, { ...member, sites: [] });
        people.get(key).sites.push(relationship.projectName);
      });
    });
    return Array.from(people.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [register]);

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    if (!form.projectId) {
      setFormError("Choose a project or site for Maintenance.");
      return;
    }
    if (!form.scope.trim()) {
      setFormError("Describe the maintenance scope.");
      return;
    }
    setSaving(true);
    const result = await addRelationship({ ...form, scope: form.scope.trim() });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error || "This Maintenance relationship could not be started.");
      return;
    }
    setForm({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
    setShowForm(false);
  }

  if (!canSeeMaintenance(role)) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">Maintenance unavailable</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">Maintenance is available to the Principal and the Operations Manager.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight">Maintenance</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">Scheduled upkeep, assigned teams and follow-up visits for sites under Botanique Maintenance.</p>
        </div>
        {canManageMaintenance(role) && (
          <button type="button" onClick={() => { setShowForm((open) => !open); setFormError(""); }} className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
            {showForm ? "Cancel" : "Start Maintenance"}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active relationships" value={kpis.active} hint="live sites" icon="people" />
        <StatCard label="Visits due within 7 days" value={kpis.dueSoon} hint="coming up" icon="calendar" />
        <StatCard label="Sites needing a next visit" value={kpis.needsScheduling} hint="follow-up" icon="pin" />
        <StatCard label="Completed visits" value={kpis.completedVisits} hint="recorded" icon="check" />
      </div>

      {showForm && canManageMaintenance(role) && (
        <form onSubmit={submit} className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
          <p className="text-sm font-semibold">Add a site to Maintenance</p>
          <p className="mt-1 text-xs text-gray-500">The linked Project keeps its own implementation lifecycle.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">Project / site
              <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" required>
                <option value="">Choose project or site for Maintenance</option>
                {maintenanceChoices.map((project) => <option key={project.id} value={project.id}>{maintenanceProjectChoiceLabel(project)}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">Maintenance scope
              <input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} placeholder="e.g. Lawn, borders, irrigation checks and general upkeep" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" maxLength={2000} required />
            </label>
            <label className="text-sm font-medium">Start date
              <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" required />
            </label>
            <label className="text-sm font-medium">Frequency
              <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
                {MAINTENANCE_FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}
              </select>
            </label>
          </div>
          {formError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
          <button type="submit" disabled={saving} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">{saving ? "Saving…" : "Start Maintenance"}</button>
        </form>
      )}

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading Maintenance…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {status !== "loading" && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)] xl:items-start">
          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Maintenance register</h2>
                <p className="mt-1 text-sm text-gray-500">Sites currently managed through Botanique Maintenance.</p>
              </div>
              <div>
                <label className="sr-only" htmlFor="maintenance-status">Maintenance status</label>
                <select id="maintenance-status" value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-botanique-green focus:ring-botanique-green">
                  <option value="active">Active Maintenance</option>
                  {MAINTENANCE_RELATIONSHIP_STATUSES.filter((value) => value !== "active").map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)}</option>)}
                  <option value="all">All statuses</option>
                </select>
              </div>
            </div>

            {!visible.length ? (
              <div className="p-10 text-center text-sm text-gray-600">{register.length === 0 ? "No site is under Maintenance yet. Start one to see it here." : "No Maintenance relationship matches this filter."}</div>
            ) : (
              <div>
                <div className="hidden grid-cols-[58px_minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-stone-200 px-5 py-4 text-xs text-gray-600 sm:grid">
                  <span>#</span>
                  <span>Project / Site</span>
                  <span className="sr-only">Open</span>
                  <span className="sr-only">Details</span>
                </div>
                <ul>
                  {visible.map((relationship, index) => {
                    const isExpanded = expanded.has(relationship.id);
                    return (
                      <li key={relationship.id} className="border-b border-stone-200 px-5 last:border-b-0">
                        <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 py-5 sm:grid-cols-[58px_minmax(0,1fr)_auto_auto] sm:gap-4">
                          <span className="text-[20px] font-medium tabular-nums text-botanique-green">{String(index + 1).padStart(2, "0")}</span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                              <h3 className="truncate text-base font-semibold text-botanique-charcoal">{relationship.projectName}</h3>
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[relationship.status] || ""}`}>{relationshipStatusLabel(relationship.status)}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{frequencyLabel(relationship.frequency)} maintenance</p>
                          </div>
                          <Link to={`/admin/maintenance/${relationship.id}`} className="hidden min-h-10 items-center text-sm font-medium text-botanique-green hover:underline sm:inline-flex">Open →</Link>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(relationship.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Hide" : "Show"} details for ${relationship.projectName}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-[15px] text-botanique-green hover:border-[#b9cec2]"
                          >
                            {isExpanded ? "⌃" : "⌄"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mb-5 grid overflow-hidden rounded-xl border border-stone-100 bg-[#fcfcfb] text-sm sm:grid-cols-4">
                            <div className="px-5 py-4">
                              <p className="text-xs text-gray-500">Frequency</p>
                              <p className="mt-2 font-medium text-botanique-charcoal">{frequencyLabel(relationship.frequency)}</p>
                            </div>
                            <div className="border-t border-stone-100 px-5 py-4 sm:border-l sm:border-t-0">
                              <p className="text-xs text-gray-500">Last visit</p>
                              <p className="mt-2 font-medium text-botanique-charcoal">{relationship.lastVisitDate ? showDate(relationship.lastVisitDate) : "None yet"}</p>
                            </div>
                            <div className="border-t border-stone-100 px-5 py-4 sm:border-l sm:border-t-0">
                              <p className="text-xs text-gray-500">Next visit</p>
                              <p className={`mt-2 font-medium ${relationship.nextVisitDate ? "text-botanique-green" : "text-botanique-charcoal"}`}>{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : "Not scheduled"}</p>
                            </div>
                            <div className="border-t border-stone-100 px-5 py-4 sm:border-l sm:border-t-0">
                              <p className="text-xs text-gray-500">Assigned team</p>
                              <p className="mt-2 font-medium text-botanique-charcoal">{relationship.assignedTeam.length ? relationship.assignedTeam.map((member) => member.full_name).join(", ") : "Unassigned"}</p>
                            </div>
                            <Link to={`/admin/maintenance/${relationship.id}`} className="border-t border-stone-100 px-5 py-3 text-sm font-medium text-botanique-green hover:underline sm:hidden">Open Maintenance →</Link>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <aside className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-5 py-5">
              <h2 className="text-lg font-semibold">Maintenance overview</h2>
              <p className="mt-1 text-sm text-gray-500">Upcoming work, assigned people and recent notes.</p>
            </div>

            <PanelSection title="Upcoming visits" meta={upcomingVisits.length} first>
              {!upcomingVisits.length ? (
                <p className="text-sm text-gray-500">No visit is currently scheduled.</p>
              ) : (
                <ul className="space-y-3">
                  {upcomingVisits.map((visit) => (
                    <li key={visit.id}>
                      <Link to={`/admin/maintenance/${visit.relationship.id}`} className="block rounded-lg border border-[#dbe5df] bg-white px-4 py-4 transition hover:border-[#b9cec2]">
                        <div className="flex items-start justify-between gap-4">
                          <span className="min-w-0 truncate text-sm font-semibold text-botanique-charcoal">{visit.relationship.projectName}</span>
                          <span className="shrink-0 text-xs font-semibold text-botanique-green">{showDate(visit.scheduledDate)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{visit.purpose}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelSection>

            <PanelSection title="Assigned maintenance team" meta={assignedPeople.length}>
              {!assignedPeople.length ? (
                <p className="text-sm text-gray-500">No person is currently assigned.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {assignedPeople.map((person) => (
                    <li key={person.person_id || person.id || person.full_name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3f0] text-xs font-semibold text-botanique-green">{person.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-botanique-charcoal">{person.full_name}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{person.sites.join(", ")}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PanelSection>

            <PanelSection title="Recent maintenance notes" meta={recentVisitNotes.length}>
              {!recentVisitNotes.length ? (
                <p className="text-sm leading-relaxed text-gray-500">No completed or cancelled visit has been recorded yet.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {recentVisitNotes.map((visit) => (
                    <li key={visit.id} className="py-3 first:pt-0 last:pb-0">
                      <Link to={`/admin/maintenance/${visit.relationship.id}`} className="block">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-medium text-botanique-charcoal">{visit.relationship.projectName}</span>
                          <span className="shrink-0 text-[11px] text-gray-400">{showDate(visit.scheduledDate)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{visit.status === "completed" ? visit.completionNote : visit.cancellationReason}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelSection>
          </aside>
        </div>
      )}
    </section>
  );
}
