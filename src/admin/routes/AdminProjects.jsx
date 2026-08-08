// Projects screen: a working New action, a live project table (responsive card
// stacking on narrow screens via the same rows), filters synced to URL search
// parameters, and edit/detail actions. Archived records are visibly
// distinguished. No dead "future" buttons; no bulk archive; no hard delete.
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProjectBadge from "../components/ProjectBadge";
import ProjectFilters from "../components/ProjectFilters";
import { useAdminData } from "../context/adminData";
import {
  canCreateProjects,
  canEditProjects,
  canSeePendingActivation,
  leadOptionsForRole,
} from "../utils/projectCapabilities";
import {
  applyProjectView,
  projectAttentionReasons,
  PROJECT_VIEW_LABELS,
} from "../utils/dashboardMetrics";
import { compactPersonName } from "../utils/personName";

const FILTER_KEYS = ["search", "status", "stage", "lead", "projectType", "portfolio", "archived"];

function matchesSearch(project, search) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [
    project.projectName,
    project.clientSiteName,
    project.location,
    project.county,
    project.projectType,
  ].some((value) => String(value || "").toLowerCase().includes(needle));
}

export default function AdminProjects() {
  const { role, projects, profiles, currentUserId, dataStatus, dataError } = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = FILTER_KEYS.reduce((acc, key) => {
    acc[key] = searchParams.get(key) || "";
    return acc;
  }, {});
  // A dashboard KPI opens Projects with a `view` derived from the SAME metric
  // definition it counts, so the opened list always matches the number shown.
  const view = searchParams.get("view") || "";
  const viewLabel = PROJECT_VIEW_LABELS[view];

  const canCreate = canCreateProjects(role);
  const canEdit = canEditProjects(role);
  const attentionForProject = (project) =>
    projectAttentionReasons(project, undefined, {
      includePendingActivation: canSeePendingActivation(role),
    });

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
  const clearView = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("view");
    setSearchParams(next, { replace: true });
  };

  const leadOptions = useMemo(
    () => leadOptionsForRole(role, profiles, currentUserId),
    [role, profiles, currentUserId]
  );

  const filtered = useMemo(() => {
    // Apply the derived KPI view first (exact metric set), then the dropdown
    // filters. Arriving from a KPI link with no other filters yields exactly
    // that metric's dataset.
    const base = applyProjectView(projects, view);
    return base.filter((project) => {
      if (!matchesSearch(project, filters.search)) return false;
      if (filters.status && project.status !== filters.status) return false;
      if (filters.stage && project.stage !== filters.stage) return false;
      if (filters.projectType && project.projectType !== filters.projectType) return false;
      if (filters.portfolio && project.portfolioPermissionStatus !== filters.portfolio) return false;
      if (filters.lead) {
        if (filters.lead === "unassigned" ? project.leadPersonId : project.leadPersonId !== filters.lead) {
          return false;
        }
      }
      if (filters.archived === "active" && project.archived) return false;
      if (filters.archived === "archived" && !project.archived) return false;
      return true;
    });
  }, [filters, projects, view]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Project Register</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search, filter and maintain live operational project records.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/admin/projects/new"
            className="inline-flex rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark transition"
          >
            New project
          </Link>
        )}
      </div>

      {viewLabel && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-botanique-green/30 bg-botanique-beige px-4 py-2 text-sm">
          <span className="text-botanique-charcoal">
            Showing <strong>{viewLabel}</strong> (from the dashboard).
          </span>
          <button
            type="button"
            onClick={clearView}
            className="text-xs font-semibold text-botanique-green hover:underline"
          >
            Clear view
          </button>
        </div>
      )}

      {dataStatus === "loading" && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading project records…
        </div>
      )}

      {dataStatus === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {dataError || "Unable to load project records."}
        </div>
      )}

      <ProjectFilters
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        leadOptions={leadOptions}
        role={role}
      />

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[76rem] divide-y divide-stone-200 text-sm">
          <caption className="sr-only">Live project records</caption>
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="w-[18%] px-4 py-3">Project</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Stage</th>
              <th scope="col" className="w-[12rem] px-4 py-3">Accountable lead</th>
              <th scope="col" className="w-[20rem] px-4 py-3">Next action</th>
              <th scope="col" className="px-4 py-3">Target completion</th>
              <th scope="col" className="px-4 py-3">Attention</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((project) => (
              <tr key={project.id} className={`align-top ${project.archived ? "bg-stone-50/70" : ""}`}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-botanique-charcoal">{project.projectName}</p>
                    {project.archived && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{project.clientSiteName || "Site label not set"}</p>
                  <p className="mt-1 text-xs text-gray-400">{project.projectType}</p>
                </td>
                <td className="px-4 py-4"><ProjectBadge value={project.status} /></td>
                <td className="px-4 py-4"><ProjectBadge value={project.stage} /></td>
                <td className="min-w-[10rem] px-4 py-4 text-gray-600">
                  <span className="line-clamp-2">
                    {compactPersonName(project.leadPersonName)}
                  </span>
                </td>
                <td className="min-w-[18rem] max-w-md px-4 py-4 text-gray-600">
                  <p>{project.nextAction || "No next action set"}</p>
                  <p className="text-xs text-gray-400 mt-1">{project.nextActionDate || "Not dated"}</p>
                </td>
                <td className="px-4 py-4 text-gray-600">
                  {project.targetCompletionDate || "Not set"}
                </td>
                <td className="px-4 py-4">
                  {attentionForProject(project).length === 0 ? (
                    <span className="text-xs text-gray-400">None</span>
                  ) : (
                    <div className="flex max-w-[13rem] flex-wrap gap-1.5">
                      {attentionForProject(project).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <Link to={`/admin/projects/${project.id}`} className="text-botanique-green font-semibold hover:underline">
                      Open
                    </Link>
                    {canEdit && (
                      <Link to={`/admin/projects/${project.id}/edit`} className="text-gray-500 hover:underline">
                        Edit
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            {projects.length === 0 ? "No data yet" : "No projects match the current filters."}
          </div>
        )}
      </div>
    </div>
  );
}
