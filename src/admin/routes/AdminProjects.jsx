import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import ProjectBadge from "../components/ProjectBadge";
import ProjectFilters from "../components/ProjectFilters";
import { projectSeed } from "../data/projectSeed";
import { canViewFinancialReferences, getVisibleProjects } from "../utils/permissions";

const defaultFilters = {
  search: "",
  status: "",
  stage: "",
  leadPerson: "",
  projectType: "",
  portfolioPermissionStatus: "",
  paymentStatus: "",
};

function matchesSearch(project, search, includeFinancial) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const searchableValues = [
    project.projectName,
    project.clientSiteName,
    project.location,
    project.county,
    project.projectType,
    includeFinancial ? project.simpleInvoiceClientName : "",
  ];

  return searchableValues.some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
}

export default function AdminProjects({ role }) {
  const [filters, setFilters] = useState(defaultFilters);
  const includeFinancial = canViewFinancialReferences(role);
  const visibleProjects = getVisibleProjects(projectSeed, role);
  const leadPeople = [...new Set(visibleProjects.map((project) => project.leadPerson).filter(Boolean))];

  const filteredProjects = useMemo(() => {
    return visibleProjects.filter((project) => {
      if (!matchesSearch(project, filters.search, includeFinancial)) return false;
      if (filters.status && project.status !== filters.status) return false;
      if (filters.stage && project.stage !== filters.stage) return false;
      if (filters.leadPerson && project.leadPerson !== filters.leadPerson) return false;
      if (filters.projectType && project.projectType !== filters.projectType) return false;
      if (filters.portfolioPermissionStatus && project.portfolioPermissionStatus !== filters.portfolioPermissionStatus) return false;
      if (includeFinancial && filters.paymentStatus && project.paymentStatus !== filters.paymentStatus) return false;
      return true;
    });
  }, [filters, includeFinancial, visibleProjects]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search and filter the safe seed project tracker.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
          >
            Add project - future
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
          >
            Archive - future
          </button>
        </div>
      </div>

      <ProjectFilters filters={filters} setFilters={setFilters} leadPeople={leadPeople} role={role} />

      <div className="overflow-x-auto bg-white border border-stone-200 rounded-lg">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Portfolio</th>
              {includeFinancial && <th className="px-4 py-3">Payment</th>}
              <th className="px-4 py-3">Next action</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredProjects.map((project) => (
              <tr key={project.id} className="align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-botanique-charcoal">{project.projectName}</p>
                  <p className="text-xs text-gray-500 mt-1">{project.clientSiteName || "Site label not set"}</p>
                  <p className="text-xs text-gray-400 mt-1">{project.projectType}</p>
                </td>
                <td className="px-4 py-4 text-gray-600">
                  <p>{project.location || "Not set"}</p>
                  <p className="text-xs text-gray-400 mt-1">{project.county || "County not set"}</p>
                </td>
                <td className="px-4 py-4"><ProjectBadge value={project.status} /></td>
                <td className="px-4 py-4"><ProjectBadge value={project.stage} /></td>
                <td className="px-4 py-4 text-gray-600">{project.leadPerson}</td>
                <td className="px-4 py-4"><ProjectBadge value={project.portfolioPermissionStatus} /></td>
                {includeFinancial && <td className="px-4 py-4"><ProjectBadge value={project.paymentStatus} /></td>}
                <td className="px-4 py-4 text-gray-600 max-w-xs">
                  <p>{project.nextAction || "No next action set"}</p>
                  <p className="text-xs text-gray-400 mt-1">{project.nextActionDate || "Not dated"}</p>
                </td>
                <td className="px-4 py-4">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="text-botanique-green font-semibold hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProjects.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No projects match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
