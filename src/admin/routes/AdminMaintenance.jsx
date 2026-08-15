import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useMaintenance } from "../context/maintenance";
import {
  MAINTENANCE_FREQUENCIES, MAINTENANCE_RELATIONSHIP_STATUSES, canManageMaintenance,
  canSeeMaintenance, frequencyLabel, relationshipStatusLabel,
} from "../utils/maintenanceCapabilities";

const showDate = (value) => (value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
  : "");

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_BADGE = {
  active: "bg-[#edf2ef] text-botanique-green",
  paused: "bg-amber-50 text-amber-700",
  ended: "bg-stone-100 text-gray-600",
};

// The Maintenance register: one compact row per site under Botanique
// maintenance, not a dossier. Composition follows the working-authority
// image `11-maintenance-tools-equipment-working-authority.png`'s Maintenance
// panel — KPI strip, controlled filters, a compact drill-through list — while
// Tools & Equipment (also shown in that image) stays its own, separate,
// unbuilt destination per the settled 9 Aug 2026 ruling. Every figure below
// is derived from real loaded records; none is illustrative.
export default function AdminMaintenance() {
  const { role } = useAdminData();
  const { register, eligibleProjects, status, error, addRelationship } = useMaintenance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: "", scope: "", startDate: today(), frequency: "monthly" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const search = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "active";

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const visible = register.filter((relationship) => {
    if (statusFilter !== "all" && relationship.status !== statusFilter) return false;
    if (search && !relationship.projectName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
    return { active, dueSoon, needsScheduling };
  }, [register]);

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    if (!form.projectId) {
      setFormError("Choose a site or project.");
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
            Track Botanique&apos;s scheduled maintenance relationships across all sites, independent of
            each project&apos;s own implementation status.
          </p>
        </div>
        {canManageMaintenance(role) && (
          <button
            type="button"
            onClick={() => { setShowForm((open) => !open); setFormError(""); }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark"
          >
            {showForm ? "Cancel" : "Start Maintenance"}
          </button>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-3">
        {[
          ["Active relationships", kpis.active],
          ["Visits due within 7 days", kpis.dueSoon],
          ["Sites needing a next visit", kpis.needsScheduling],
        ].map(([label, figure]) => (
          <div key={label} className="min-w-0 bg-white px-4 py-3">
            <dt className="truncate text-xs font-medium text-gray-500">{label}</dt>
            <dd className="mt-0.5 text-xl font-semibold text-botanique-charcoal">{figure}</dd>
          </div>
        ))}
      </dl>

      {showForm && canManageMaintenance(role) && (
        <form onSubmit={submit} className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold">Start a Maintenance relationship</p>
          <p className="mt-1 text-xs text-gray-500">
            Links to an existing site or project. A Completed project keeps its own status — starting
            Maintenance here never reopens it.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">Site / Project
              <select
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                required
              >
                <option value="">Choose a site or project</option>
                {eligibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}{project.status ? ` (${project.status})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">Maintenance scope
              <input
                value={form.scope}
                onChange={(event) => setForm({ ...form, scope: event.target.value })}
                placeholder="e.g. Fortnightly lawn and border upkeep, irrigation check"
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                maxLength={2000}
                required
              />
            </label>
            <label className="text-sm font-medium">Start date
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                required
              />
            </label>
            <label className="text-sm font-medium">Frequency
              <select
                value={form.frequency}
                onChange={(event) => setForm({ ...form, frequency: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
              >
                {MAINTENANCE_FREQUENCIES.map((value) => (
                  <option key={value} value={value}>{frequencyLabel(value)}</option>
                ))}
              </select>
            </label>
          </div>
          {formError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Start Maintenance"}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Search
          <input
            value={search}
            onChange={(event) => setParam("q", event.target.value, "")}
            placeholder="Site or project name"
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
          />
        </label>
        <label className="text-sm font-medium">Status
          <select
            value={statusFilter}
            onChange={(event) => setParam("status", event.target.value, "active")}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
          >
            <option value="active">Active</option>
            {MAINTENANCE_RELATIONSHIP_STATUSES.filter((value) => value !== "active").map((value) => (
              <option key={value} value={value}>{relationshipStatusLabel(value)}</option>
            ))}
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading Maintenance…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {status !== "loading" && !visible.length && (
        <div className="mt-5 rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-gray-600">
          {register.length === 0
            ? "No site is under Maintenance yet. Start one to see it here."
            : "No Maintenance relationship matches these filters."}
        </div>
      )}

      {visible.length > 0 && (
        <ul className="mt-5 divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white">
          {visible.map((relationship) => (
            <li key={relationship.id}>
              <Link
                to={`/admin/maintenance/${relationship.id}`}
                className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 hover:bg-stone-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-botanique-green">{relationship.projectName}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {relationship.clientSiteName ? `${relationship.clientSiteName} · ` : ""}
                    {frequencyLabel(relationship.frequency)}
                    {relationship.projectStatus ? ` · Project: ${relationship.projectStatus}` : ""}
                  </span>
                </span>
                <span className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[relationship.status] || ""}`}>
                    {relationshipStatusLabel(relationship.status)}
                  </span>
                  <span className="whitespace-nowrap">
                    Last visit: {relationship.lastVisitDate ? showDate(relationship.lastVisitDate) : "None yet"}
                  </span>
                  <span className="whitespace-nowrap">
                    Next visit: {relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : "Not scheduled"}
                  </span>
                  <span className="whitespace-nowrap">
                    {relationship.assignedTeam.length
                      ? relationship.assignedTeam.map((member) => member.full_name).join(", ")
                      : "Unassigned"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
