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
  active: "bg-[#edf3f0] text-botanique-green",
  paused: "bg-stone-100 text-gray-600",
  ended: "bg-stone-100 text-gray-600",
};

function StatCard({ label, value, hint, active = false }) {
  return (
    <div className={`min-w-0 rounded-lg border px-4 py-3 ${active ? "border-[#d8e4de] bg-[#f6f9f7]" : "border-stone-200 bg-white"}`}>
      <p className={`truncate text-[11px] font-semibold uppercase tracking-[0.08em] ${active ? "text-botanique-green/75" : "text-gray-500"}`}>{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none text-botanique-charcoal">{value}</p>
        {hint && <p className="truncate text-[11px] text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

function PanelSection({ title, meta, children }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">{title}</h3>
        {meta !== undefined && <span className="text-xs font-medium text-gray-400">{meta}</span>}
      </div>
      <div className="mt-3">{children}</div>
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

  const search = searchParams.get("q") || "";
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
    if (search && !relationship.projectName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [register, search, statusFilter]);

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
          <h1 className="mt-1 text-2xl font-semibold">Maintenance</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">Scheduled upkeep, assigned teams and follow-up visits for sites under Botanique Maintenance.</p>
        </div>
        {canManageMaintenance(role) && (
          <button type="button" onClick={() => { setShowForm((open) => !open); setFormError(""); }} className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
            {showForm ? "Cancel" : "Start Maintenance"}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <StatCard label="Active relationships" value={kpis.active} hint="live sites" active />
        <StatCard label="Visits due within 7 days" value={kpis.dueSoon} hint="coming up" />
        <StatCard label="Sites needing a next visit" value={kpis.needsScheduling} hint="follow-up" />
        <StatCard label="Completed visits" value={kpis.completedVisits} hint="recorded" />
      </div>

      {showForm && canManageMaintenance(role) && (
        <form onSubmit={submit} className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold">Add a site to Maintenance</p>
          <p className="mt-0.5 text-xs text-gray-500">The linked Project keeps its own implementation lifecycle.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <button type="submit" disabled={saving} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">{saving ? "Saving…" : "Start Maintenance"}</button>
        </form>
      )}

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading Maintenance…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {status !== "loading" && (
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="grid xl:grid-cols-[minmax(0,1.7fr)_350px]">
            <div className="min-w-0 border-b border-stone-200 xl:border-b-0 xl:border-r">
              <div className="border-b border-stone-100 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">Maintenance register</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Sites currently managed through Botanique Maintenance.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400">{visible.length} shown</span>
                    <label className="sr-only" htmlFor="maintenance-status">Maintenance status</label>
                    <select id="maintenance-status" value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:ring-botanique-green">
                      <option value="active">Active Maintenance</option>
                      {MAINTENANCE_RELATIONSHIP_STATUSES.filter((value) => value !== "active").map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)}</option>)}
                      <option value="all">All statuses</option>
                    </select>
                  </div>
                </div>
                {search && (
                  <div className="mt-3">
                    <label className="sr-only" htmlFor="maintenance-search">Search Maintenance projects</label>
                    <input id="maintenance-search" value={search} onChange={(event) => setParam("q", event.target.value, "")} placeholder="Search Maintenance projects" className="block w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-botanique-green focus:ring-botanique-green" />
                  </div>
                )}
              </div>

              {!visible.length ? (
                <div className="p-8 text-center text-sm text-gray-600">{register.length === 0 ? "No site is under Maintenance yet. Start one to see it here." : "No Maintenance relationship matches these filters."}</div>
              ) : (
                <div>
                  <div className="hidden grid-cols-[52px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-stone-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 sm:grid">
                    <span>#</span>
                    <span>Project / Site</span>
                    <span className="sr-only">Open</span>
                    <span className="sr-only">Details</span>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {visible.map((relationship, index) => {
                      const isExpanded = expanded.has(relationship.id);
                      return (
                        <li key={relationship.id} className="px-4 sm:px-5">
                          <div className="grid grid-cols-[40px_minmax(0,1fr)_auto_auto] items-center gap-3 py-4 sm:grid-cols-[52px_minmax(0,1fr)_auto_auto]">
                            <span className="text-sm font-semibold tabular-nums text-botanique-green">{String(index + 1).padStart(2, "0")}</span>
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-botanique-charcoal">{relationship.projectName}</h3>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[relationship.status] || ""}`}>{relationshipStatusLabel(relationship.status)}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500">{frequencyLabel(relationship.frequency)} maintenance</p>
                            </div>
                            <Link to={`/admin/maintenance/${relationship.id}`} className="hidden min-h-10 items-center text-xs font-semibold text-botanique-green hover:underline sm:inline-flex">Open →</Link>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(relationship.id)}
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Hide" : "Show"} details for ${relationship.projectName}`}
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white text-base text-botanique-green hover:border-[#c3d3ca]"
                            >
                              {isExpanded ? "⌃" : "⌄"}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mb-4 ml-[52px] grid gap-4 rounded-lg bg-stone-50/70 px-4 py-4 text-xs sm:grid-cols-4">
                              <div>
                                <p className="text-gray-400">Frequency</p>
                                <p className="mt-1 font-medium text-botanique-charcoal">{frequencyLabel(relationship.frequency)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Last visit</p>
                                <p className="mt-1 font-medium text-botanique-charcoal">{relationship.lastVisitDate ? showDate(relationship.lastVisitDate) : "None yet"}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Next visit</p>
                                <p className={`mt-1 font-medium ${relationship.nextVisitDate ? "text-botanique-green" : "text-botanique-charcoal"}`}>{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : "Not scheduled"}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Assigned team</p>
                                <p className="mt-1 font-medium text-botanique-charcoal">{relationship.assignedTeam.length ? relationship.assignedTeam.map((member) => member.full_name).join(", ") : "Unassigned"}</p>
                              </div>
                              <Link to={`/admin/maintenance/${relationship.id}`} className="text-xs font-semibold text-botanique-green hover:underline sm:hidden">Open Maintenance →</Link>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <aside className="min-w-0 bg-stone-50/55">
              <div className="border-b border-stone-200 bg-[#f2f7f4] px-4 py-4">
                <h2 className="text-sm font-semibold text-botanique-dark">Maintenance overview</h2>
                <p className="mt-0.5 text-xs text-gray-500">Upcoming work, assigned people and recent notes.</p>
              </div>

              <div className="divide-y divide-stone-200">
                <PanelSection title="Upcoming visits" meta={upcomingVisits.length}>
                  {!upcomingVisits.length ? (
                    <p className="text-sm text-gray-500">No visit is currently scheduled.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {upcomingVisits.map((visit) => (
                        <li key={visit.id}>
                          <Link to={`/admin/maintenance/${visit.relationship.id}`} className="block rounded-lg border border-[#d6e3dc] bg-[#f7faf8] px-3 py-3 transition hover:border-[#b9cec2]">
                            <div className="flex items-start justify-between gap-3">
                              <span className="min-w-0 truncate text-sm font-semibold text-botanique-charcoal">{visit.relationship.projectName}</span>
                              <span className="shrink-0 text-xs font-semibold text-botanique-green">{showDate(visit.scheduledDate)}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{visit.purpose}</p>
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
                    <ul className="space-y-2.5">
                      {assignedPeople.map((person) => (
                        <li key={person.person_id || person.id || person.full_name} className="flex items-start gap-3 rounded-md bg-white px-3 py-2.5 ring-1 ring-stone-200">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf3f0] text-[11px] font-semibold text-botanique-green">{person.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-botanique-charcoal">{person.full_name}</p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">{person.sites.join(", ")}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </PanelSection>

                <PanelSection title="Recent maintenance notes" meta={recentVisitNotes.length}>
                  {!recentVisitNotes.length ? (
                    <p className="text-sm text-gray-500">No completed or cancelled visit has been recorded yet.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {recentVisitNotes.map((visit) => (
                        <li key={visit.id}>
                          <Link to={`/admin/maintenance/${visit.relationship.id}`} className="block rounded-md bg-white px-3 py-2.5 ring-1 ring-stone-200 hover:ring-[#c3d3ca]">
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
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
