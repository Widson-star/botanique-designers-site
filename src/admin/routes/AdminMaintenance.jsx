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
  active: "bg-[#e8f1ed] text-botanique-green ring-1 ring-[#d7e5de]",
  paused: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  ended: "bg-stone-100 text-gray-600 ring-1 ring-stone-200",
};

const KPI_TONES = {
  active: "border-[#d7e5de] bg-[#f5f9f7] text-botanique-green",
  due: "border-amber-200 bg-amber-50/70 text-amber-700",
  followup: "border-orange-200 bg-orange-50/70 text-orange-700",
  complete: "border-stone-200 bg-stone-50 text-botanique-charcoal",
};

function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`min-w-0 rounded-lg border px-4 py-3 ${KPI_TONES[tone] || KPI_TONES.complete}`}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] opacity-75">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none">{value}</p>
        {hint && <p className="truncate text-[11px] opacity-55">{hint}</p>}
      </div>
    </div>
  );
}

function OverviewChild({ active, label, count, tone = "green", onClick }) {
  const activeClass = tone === "amber"
    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
    : "bg-botanique-green text-white shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-xs font-semibold transition ${
        active ? activeClass : "text-gray-600 hover:bg-white hover:text-botanique-green"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-white text-gray-500 ring-1 ring-stone-200"}`}>
        {count}
      </span>
    </button>
  );
}

export default function AdminMaintenance() {
  const { role } = useAdminData();
  const { register, visits = [], eligibleProjects, status, error, addRelationship } = useMaintenance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [overviewChild, setOverviewChild] = useState("upcoming");
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
    .slice(0, 6)
    .map((visit) => ({
      ...visit,
      relationship: register.find((row) => row.id === visit.relationshipId),
    }))
    .filter((visit) => visit.relationship), [register, visits]);

  const needsScheduling = useMemo(() => register
    .filter((relationship) => relationship.status !== "ended" && !relationship.nextVisitDate)
    .slice(0, 6), [register]);

  const recentVisitNotes = useMemo(() => visits
    .filter((visit) => visit.status === "completed" || visit.status === "cancelled")
    .slice()
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 6)
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
        if (!people.has(key)) {
          people.set(key, { ...member, sites: [] });
        }
        people.get(key).sites.push(relationship.projectName);
      });
    });
    return Array.from(people.values())
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
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
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Maintenance is available to the Principal and the Operations Manager.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p>
          <h1 className="mt-1 text-2xl font-semibold">Maintenance</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Scheduled upkeep, assigned teams and follow-up visits for sites under Botanique Maintenance.
          </p>
        </div>
        {canManageMaintenance(role) && (
          <button
            type="button"
            onClick={() => { setShowForm((open) => !open); setFormError(""); }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-botanique-dark"
          >
            {showForm ? "Cancel" : "Start Maintenance"}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <StatCard label="Active relationships" value={kpis.active} hint="live sites" tone="active" />
        <StatCard label="Visits due within 7 days" value={kpis.dueSoon} hint="coming up" tone="due" />
        <StatCard label="Sites needing a next visit" value={kpis.needsScheduling} hint="follow-up" tone="followup" />
        <StatCard label="Completed visits" value={kpis.completedVisits} hint="recorded" tone="complete" />
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
          <button type="submit" disabled={saving} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
            {saving ? "Saving…" : "Start Maintenance"}
          </button>
        </form>
      )}

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading Maintenance…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {status !== "loading" && (
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="grid xl:grid-cols-[minmax(0,1.68fr)_390px]">
            <div className="min-w-0 border-b border-stone-200 xl:border-b-0 xl:border-r">
              <div className="border-b border-stone-100 bg-white px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">Maintenance register</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Sites currently managed through Botanique Maintenance.</p>
                  </div>
                  <span className="text-xs font-medium text-gray-400">{visible.length} shown</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <label className="sr-only" htmlFor="maintenance-search">Search Maintenance projects</label>
                  <input id="maintenance-search" value={search} onChange={(event) => setParam("q", event.target.value, "")} placeholder="Search Maintenance projects" className="block w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-botanique-green focus:ring-botanique-green" />
                  <label className="sr-only" htmlFor="maintenance-status">Maintenance status</label>
                  <select id="maintenance-status" value={statusFilter} onChange={(event) => setParam("status", event.target.value, "active")} className="block w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-botanique-green focus:ring-botanique-green">
                    <option value="active">Active Maintenance</option>
                    {MAINTENANCE_RELATIONSHIP_STATUSES.filter((value) => value !== "active").map((value) => <option key={value} value={value}>{relationshipStatusLabel(value)}</option>)}
                    <option value="all">All statuses</option>
                  </select>
                </div>
              </div>

              {!visible.length ? (
                <div className="p-8 text-center text-sm text-gray-600">{register.length === 0 ? "No site is under Maintenance yet. Start one to see it here." : "No Maintenance relationship matches these filters."}</div>
              ) : (
                <ul className="divide-y divide-stone-100 bg-stone-50/30">
                  {visible.map((relationship) => {
                    const hasNextVisit = Boolean(relationship.nextVisitDate);
                    return (
                      <li key={relationship.id} className="p-3 sm:p-4">
                        <Link to={`/admin/maintenance/${relationship.id}`} className="group block overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:border-[#b8d0c4] hover:shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-botanique-green">{relationship.projectName}</h3>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[relationship.status] || ""}`}>{relationshipStatusLabel(relationship.status)}</span>
                                {!hasNextVisit && relationship.status !== "ended" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">Needs visit</span>}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-gray-500">{[relationship.clientSiteName, frequencyLabel(relationship.frequency)].filter(Boolean).join(" · ")}</p>
                            </div>
                            <span className="text-xs font-semibold text-gray-400 transition group-hover:text-botanique-green">Open →</span>
                          </div>

                          <div className="grid grid-cols-2 gap-px bg-stone-200 sm:grid-cols-4">
                            <div className="bg-[#f7faf8] px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Frequency</p>
                              <p className="mt-0.5 truncate text-xs font-medium text-botanique-charcoal">{frequencyLabel(relationship.frequency)}</p>
                            </div>
                            <div className="bg-white px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Last visit</p>
                              <p className="mt-0.5 truncate text-xs font-medium text-botanique-charcoal">{relationship.lastVisitDate ? showDate(relationship.lastVisitDate) : "None yet"}</p>
                            </div>
                            <div className={hasNextVisit ? "bg-[#f2f8f5] px-3 py-2.5" : "bg-amber-50/70 px-3 py-2.5"}>
                              <p className={`text-[10px] font-semibold uppercase tracking-wide ${hasNextVisit ? "text-botanique-green/60" : "text-amber-600"}`}>Next visit</p>
                              <p className={`mt-0.5 truncate text-xs font-semibold ${hasNextVisit ? "text-botanique-green" : "text-amber-700"}`}>{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : "Not scheduled"}</p>
                            </div>
                            <div className="bg-white px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Assigned team</p>
                              <p className="mt-0.5 truncate text-xs font-medium text-botanique-charcoal">{relationship.assignedTeam.length ? relationship.assignedTeam.map((member) => member.full_name).join(", ") : "Unassigned"}</p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <aside className="min-w-0 bg-[#f4f7f5]">
              <div className="border-b border-stone-200 bg-[#eaf2ee] px-4 py-4">
                <h2 className="text-sm font-semibold text-botanique-dark">Maintenance overview</h2>
                <p className="mt-0.5 text-xs text-botanique-green/70">Visits, team responsibility and recent notes.</p>
              </div>

              <div className="grid min-h-[470px] grid-cols-[122px_minmax(0,1fr)]">
                <nav className="border-r border-stone-200 bg-[#edf3f0] p-2.5">
                  <div className="space-y-2">
                    <OverviewChild active={overviewChild === "upcoming"} label="Upcoming" count={upcomingVisits.length} onClick={() => setOverviewChild("upcoming")} />
                    <OverviewChild active={overviewChild === "team"} label="Assigned team" count={assignedPeople.length} onClick={() => setOverviewChild("team")} />
                    <OverviewChild active={overviewChild === "notes"} label="Recent notes" count={recentVisitNotes.length} onClick={() => setOverviewChild("notes")} />
                  </div>
                  {needsScheduling.length > 0 && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Attention</p>
                      <p className="mt-1 text-xl font-semibold leading-none text-amber-700">{needsScheduling.length}</p>
                      <p className="mt-1 text-[10px] leading-snug text-amber-700/80">sites need a next visit</p>
                    </div>
                  )}
                </nav>

                <div className="min-w-0 bg-white p-4">
                  {overviewChild === "upcoming" && (
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-botanique-green">Upcoming scheduled visits</p>
                          <p className="mt-0.5 text-xs text-gray-500">Next work already placed on the Maintenance calendar.</p>
                        </div>
                        <span className="rounded-full bg-[#e8f1ed] px-2 py-1 text-xs font-semibold text-botanique-green">{upcomingVisits.length}</span>
                      </div>

                      {!upcomingVisits.length ? (
                        <p className="mt-4 text-sm text-gray-500">No visit is currently scheduled.</p>
                      ) : (
                        <ul className="mt-4 space-y-3">
                          {upcomingVisits.map((visit) => (
                            <li key={visit.id}>
                              <Link to={`/admin/maintenance/${visit.relationship.id}`} className="block overflow-hidden rounded-lg border border-[#c8ddd2] bg-[#f4f9f6] shadow-sm transition hover:border-botanique-green">
                                <div className="border-l-4 border-botanique-green px-3 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="min-w-0 truncate text-sm font-semibold text-botanique-dark">{visit.relationship.projectName}</span>
                                    <span className="shrink-0 rounded-md bg-botanique-green px-2 py-1 text-[11px] font-semibold text-white">{showDate(visit.scheduledDate)}</span>
                                  </div>
                                  <p className="mt-2 text-xs leading-relaxed text-gray-600">{visit.purpose}</p>
                                  <p className="mt-2 text-[11px] font-semibold text-botanique-green">Open visit →</p>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}

                      {needsScheduling.length > 0 && (
                        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-amber-800">Needs scheduling</p>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{needsScheduling.length}</span>
                          </div>
                          <ul className="mt-2 divide-y divide-amber-200/70">
                            {needsScheduling.map((relationship) => (
                              <li key={relationship.id} className="py-2 first:pt-1 last:pb-0">
                                <Link to={`/admin/maintenance/${relationship.id}`} className="flex items-center justify-between gap-3 text-xs text-amber-900 hover:text-amber-700">
                                  <span className="truncate font-medium">{relationship.projectName}</span>
                                  <span className="shrink-0 font-semibold">Schedule →</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  )}

                  {overviewChild === "team" && (
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-botanique-green">Assigned maintenance team</p>
                          <p className="mt-0.5 text-xs text-gray-500">People currently responsible for active Maintenance sites.</p>
                        </div>
                        <span className="rounded-full bg-[#e8f1ed] px-2 py-1 text-xs font-semibold text-botanique-green">{assignedPeople.length}</span>
                      </div>
                      {!assignedPeople.length ? (
                        <p className="mt-4 text-sm text-gray-500">No person is currently assigned.</p>
                      ) : (
                        <ul className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
                          {assignedPeople.map((person) => (
                            <li key={person.person_id || person.id || person.full_name} className="px-3 py-3">
                              <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1ed] text-xs font-bold text-botanique-green">{person.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-botanique-charcoal">{person.full_name}</p>
                                  <p className="mt-0.5 text-xs text-gray-500">{person.sites.length} {person.sites.length === 1 ? "site" : "sites"}</p>
                                  <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">{person.sites.join(", ")}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}

                  {overviewChild === "notes" && (
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-botanique-green">Recent maintenance notes</p>
                          <p className="mt-0.5 text-xs text-gray-500">Most recent completed or cancelled Maintenance visit notes.</p>
                        </div>
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-gray-600">{recentVisitNotes.length}</span>
                      </div>
                      {!recentVisitNotes.length ? (
                        <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-gray-500">No completed or cancelled visit has been recorded yet.</div>
                      ) : (
                        <ul className="mt-4 space-y-3">
                          {recentVisitNotes.map((visit) => (
                            <li key={visit.id}>
                              <Link to={`/admin/maintenance/${visit.relationship.id}`} className="block rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 hover:border-[#c8ddd2] hover:bg-[#f5f9f7]">
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="truncate text-sm font-semibold text-botanique-charcoal">{visit.relationship.projectName}</span>
                                  <span className="shrink-0 text-[11px] font-medium text-gray-400">{showDate(visit.scheduledDate)}</span>
                                </div>
                                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-500">{visit.status === "completed" ? visit.completionNote : visit.cancellationReason}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
